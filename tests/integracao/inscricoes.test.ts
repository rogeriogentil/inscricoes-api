import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { executarMigracoes } from '../../src/banco/migracoes.js'
import { criarApp } from '../../src/server.js'
import type { FastifyInstance } from 'fastify'

type Inscricao = {
  id: number
  palestra_id: number
  email: string
  criada_em: string
}

let app: FastifyInstance
let banco: InstanceType<typeof Database>
let palestraId: number

beforeEach(async () => {
  banco = new Database(':memory:')
  executarMigracoes(banco)
  app = criarApp(banco)
  await app.ready()

  const result = banco
    .prepare(
      `INSERT INTO palestras (titulo, descricao, data, horario, local, palestrante, vagas_total, vagas_disponiveis)
       VALUES ('Palestra Teste', null, '2026-11-10', '14:00', 'Sala A', 'Prof. X', 2, 2)`,
    )
    .run()
  palestraId = result.lastInsertRowid as number
})

afterEach(async () => {
  await app.close()
  banco.close()
})

// --- US2: Inscrever-se em uma Palestra ---

describe('POST /palestras/:id/inscricoes', () => {
  it('inscrição bem-sucedida retorna 201 e decrementa vagas_disponiveis', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'alice@exemplo.com' },
    })

    expect(response.statusCode).toBe(201)
    const inscricao = response.json<Inscricao>()
    expect(inscricao.palestra_id).toBe(palestraId)
    expect(inscricao.email).toBe('alice@exemplo.com')
    expect(inscricao.id).toBeTypeOf('number')
    expect(inscricao.criada_em).toBeTypeOf('string')

    const palestra = banco
      .prepare('SELECT vagas_disponiveis FROM palestras WHERE id = ?')
      .get(palestraId) as { vagas_disponiveis: number }
    expect(palestra.vagas_disponiveis).toBe(1)
  })

  it('retorna 422 quando palestra está sem vagas', async () => {
    banco
      .prepare('UPDATE palestras SET vagas_disponiveis = 0 WHERE id = ?')
      .run(palestraId)

    const response = await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'alice@exemplo.com' },
    })

    expect(response.statusCode).toBe(422)
    expect(response.json<{ erro: string }>().erro).toBe('Sem vagas disponíveis')
  })

  it('retorna 409 quando participante já está inscrito', async () => {
    await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'alice@exemplo.com' },
    })

    const response = await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'alice@exemplo.com' },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json<{ erro: string }>().erro).toBe(
      'Participante já inscrito nesta palestra',
    )
  })

  it('retorna 404 quando palestra não existe', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/palestras/9999/inscricoes',
      payload: { email: 'alice@exemplo.com' },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json<{ erro: string }>().erro).toBe('Palestra não encontrada')
  })

  it('retorna 400 quando email está ausente', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: {},
    })

    expect(response.statusCode).toBe(400)
  })

  it('retorna 400 quando email tem formato inválido', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'nao-e-um-email' },
    })

    expect(response.statusCode).toBe(400)
  })
})

// --- US3: Cancelar Inscrição ---

describe('DELETE /palestras/:id/inscricoes', () => {
  beforeEach(async () => {
    await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'alice@exemplo.com' },
    })
  })

  it('cancelamento bem-sucedido retorna 204 e devolve vaga', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'alice@exemplo.com' },
    })

    expect(response.statusCode).toBe(204)

    const palestra = banco
      .prepare('SELECT vagas_disponiveis FROM palestras WHERE id = ?')
      .get(palestraId) as { vagas_disponiveis: number }
    expect(palestra.vagas_disponiveis).toBe(2)

    const confirmacao = await app.inject({ method: 'GET', url: '/palestras' })
    const palestras = confirmacao.json<{ palestras: Array<{ vagas_disponiveis: number }> }>()
    expect(palestras.palestras[0].vagas_disponiveis).toBe(2)
  })

  it('retorna 404 quando email não tem inscrição nesta palestra', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'naoexiste@exemplo.com' },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json<{ erro: string }>().erro).toBe('Inscrição não encontrada')
  })

  it('FR-009: participante não pode cancelar inscrição de outro', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'outro@exemplo.com' },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json<{ erro: string }>().erro).toBe('Inscrição não encontrada')
  })
})
