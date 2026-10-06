import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { executarMigracoes } from '../../src/infra/banco/migracoes.js'
import { criarApp } from '../../src/server.js'
import type { FastifyInstance } from 'fastify'

type Palestra = {
  id: number
  titulo: string
  descricao: string | null
  data: string
  horario: string
  local: string
  palestrante: string
  vagas_total: number
  vagas_disponiveis: number
}

let app: FastifyInstance
let banco: InstanceType<typeof Database>

beforeEach(async () => {
  banco = new Database(':memory:')
  executarMigracoes(banco)
  app = criarApp(banco)
  await app.ready()
})

afterEach(async () => {
  await app.close()
  banco.close()
})

function inserirPalestra(overrides: Partial<Palestra> = {}): number {
  const dados = {
    titulo: 'Palestra Teste',
    descricao: 'Descrição teste',
    data: '2026-11-10',
    horario: '14:00',
    local: 'Auditório A',
    palestrante: 'Prof. Teste',
    vagas_total: 10,
    vagas_disponiveis: 10,
    ...overrides,
  }
  const stmt = banco.prepare(`
    INSERT INTO palestras (titulo, descricao, data, horario, local, palestrante, vagas_total, vagas_disponiveis)
    VALUES (@titulo, @descricao, @data, @horario, @local, @palestrante, @vagas_total, @vagas_disponiveis)
  `)
  const result = stmt.run(dados)
  return result.lastInsertRowid as number
}

describe('GET /palestras', () => {
  it('retorna lista vazia quando não há palestras cadastradas', async () => {
    const response = await app.inject({ method: 'GET', url: '/palestras' })
    expect(response.statusCode).toBe(200)
    const body = response.json<{ palestras: Palestra[] }>()
    expect(body.palestras).toEqual([])
  })

  it('retorna todas as palestras com todos os campos obrigatórios', async () => {
    inserirPalestra({
      titulo: 'IA na Prática',
      descricao: 'Workshop hands-on',
      data: '2026-11-10',
      horario: '14:00',
      local: 'Sala 101',
      palestrante: 'Prof. Carlos',
      vagas_total: 50,
      vagas_disponiveis: 42,
    })

    const response = await app.inject({ method: 'GET', url: '/palestras' })
    expect(response.statusCode).toBe(200)

    const body = response.json<{ palestras: Palestra[] }>()
    expect(body.palestras).toHaveLength(1)

    const palestra = body.palestras[0]
    expect(palestra.titulo).toBe('IA na Prática')
    expect(palestra.descricao).toBe('Workshop hands-on')
    expect(palestra.data).toBe('2026-11-10')
    expect(palestra.horario).toBe('14:00')
    expect(palestra.local).toBe('Sala 101')
    expect(palestra.palestrante).toBe('Prof. Carlos')
    expect(palestra.vagas_total).toBe(50)
    expect(palestra.vagas_disponiveis).toBe(42)
    expect(palestra.id).toBeTypeOf('number')
  })

  it('palestra com todas as vagas preenchidas aparece com vagas_disponiveis igual a zero', async () => {
    inserirPalestra({ vagas_total: 5, vagas_disponiveis: 0 })

    const response = await app.inject({ method: 'GET', url: '/palestras' })
    expect(response.statusCode).toBe(200)

    const body = response.json<{ palestras: Palestra[] }>()
    expect(body.palestras[0].vagas_disponiveis).toBe(0)
  })
})
