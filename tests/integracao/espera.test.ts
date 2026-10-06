import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { executarMigracoes } from '../../src/infra/banco/migracoes.js'
import { criarApp } from '../../src/server.js'
import type { FastifyInstance } from 'fastify'

type EntradaEspera = {
  id: number
  palestra_id: number
  email: string
  posicao: number
  criada_em: string
}

type PosicaoEspera = {
  posicao: number
  palestra_id: number
  email: string
}

let app: FastifyInstance
let banco: InstanceType<typeof Database>
let palestraId: number

beforeEach(async () => {
  banco = new Database(':memory:')
  executarMigracoes(banco)
  app = criarApp(banco)
  await app.ready()

  // palestra com 1 vaga para facilitar testes de lotação
  const result = banco
    .prepare(
      `INSERT INTO palestras (titulo, descricao, data, horario, local, palestrante, vagas_total, vagas_disponiveis)
       VALUES ('Palestra Espera', null, '2026-11-10', '14:00', 'Sala B', 'Prof. Y', 1, 1)`,
    )
    .run()
  palestraId = result.lastInsertRowid as number
})

afterEach(async () => {
  await app.close()
  banco.close()
})

// helper: lotar palestra inscrevendo participante
async function lotarPalestra(email = 'ocupante@exemplo.com') {
  await app.inject({
    method: 'POST',
    url: `/palestras/${palestraId}/inscricoes`,
    payload: { email },
  })
}

// --- US1: Entrar na lista de espera ---

describe('POST /palestras/:id/inscricoes — palestra lotada (US1)', () => {
  it('retorna 202 com posicao 1 quando palestra está lotada (FR-001, FR-003)', async () => {
    await lotarPalestra()

    const response = await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'alice@exemplo.com' },
    })

    expect(response.statusCode).toBe(202)
    const body = response.json<EntradaEspera>()
    expect(body.palestra_id).toBe(palestraId)
    expect(body.email).toBe('alice@exemplo.com')
    expect(body.posicao).toBe(1)
    expect(body.criada_em).toBeTruthy()
  })

  it('segunda entrada retorna posicao 2 (FR-002 FIFO)', async () => {
    await lotarPalestra()

    await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'alice@exemplo.com' },
    })

    const response = await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'bob@exemplo.com' },
    })

    expect(response.statusCode).toBe(202)
    expect(response.json<EntradaEspera>().posicao).toBe(2)
  })

  it('retorna 409 quando participante já está na fila (FR-005)', async () => {
    await lotarPalestra()
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
    expect(response.json<{ erro: string }>().erro).toContain('lista de espera')
  })

  it('retorna 409 quando participante já está inscrito (FR-004)', async () => {
    await lotarPalestra('alice@exemplo.com')

    const response = await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'alice@exemplo.com' },
    })

    expect(response.statusCode).toBe(409)
  })

  it('retorna 201 (não 202) quando há vagas disponíveis (FR-006)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'alice@exemplo.com' },
    })

    expect(response.statusCode).toBe(201)
  })
})

// --- US2: Promoção automática ao cancelamento ---

describe('DELETE /palestras/:id/inscricoes — promoção automática (US2)', () => {
  it('promove o primeiro da fila ao cancelar (FR-007, FR-008, FR-009)', async () => {
    await lotarPalestra('ocupante@exemplo.com')

    // alice entra na fila
    await app.inject({
      method: 'POST',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'alice@exemplo.com' },
    })

    // cancelar ocupante → alice é promovida
    const cancelResponse = await app.inject({
      method: 'DELETE',
      url: `/palestras/${palestraId}/inscricoes`,
      payload: { email: 'ocupante@exemplo.com' },
    })
    expect(cancelResponse.statusCode).toBe(204)

    // alice deve estar inscrita agora
    const aliceInscrita = banco
      .prepare('SELECT id FROM inscricoes WHERE palestra_id = ? AND email = ?')
      .get(palestraId, 'alice@exemplo.com')
    expect(aliceInscrita).toBeTruthy()

    // fila deve estar vazia
    const naFila = banco
      .prepare('SELECT COUNT(*) as cnt FROM espera WHERE palestra_id = ?')
      .get(palestraId) as { cnt: number }
    expect(naFila.cnt).toBe(0)

    // vagas_disponiveis ainda 0 (FR-009)
    const palestra = banco
      .prepare('SELECT vagas_disponiveis FROM palestras WHERE id = ?')
      .get(palestraId) as { vagas_disponiveis: number }
    expect(palestra.vagas_disponiveis).toBe(0)
  })

  it('só o primeiro da fila é promovido com múltiplos aguardando (FR-002)', async () => {
    await lotarPalestra('ocupante@exemplo.com')

    await app.inject({ method: 'POST', url: `/palestras/${palestraId}/inscricoes`, payload: { email: 'alice@exemplo.com' } })
    await app.inject({ method: 'POST', url: `/palestras/${palestraId}/inscricoes`, payload: { email: 'bob@exemplo.com' } })

    await app.inject({ method: 'DELETE', url: `/palestras/${palestraId}/inscricoes`, payload: { email: 'ocupante@exemplo.com' } })

    // alice promovida, bob ainda na fila
    const aliceInscrita = banco.prepare('SELECT id FROM inscricoes WHERE palestra_id = ? AND email = ?').get(palestraId, 'alice@exemplo.com')
    expect(aliceInscrita).toBeTruthy()

    const bobNaFila = banco.prepare('SELECT id FROM espera WHERE palestra_id = ? AND email = ?').get(palestraId, 'bob@exemplo.com')
    expect(bobNaFila).toBeTruthy()
  })

  it('libera vaga normalmente quando fila está vazia ao cancelar', async () => {
    await lotarPalestra('ocupante@exemplo.com')

    await app.inject({ method: 'DELETE', url: `/palestras/${palestraId}/inscricoes`, payload: { email: 'ocupante@exemplo.com' } })

    const palestra = banco
      .prepare('SELECT vagas_disponiveis FROM palestras WHERE id = ?')
      .get(palestraId) as { vagas_disponiveis: number }
    expect(palestra.vagas_disponiveis).toBe(1)
  })
})

// --- US3: Sair da lista de espera ---

describe('DELETE /palestras/:id/espera (US3)', () => {
  it('remove entrada da fila com sucesso (FR-010)', async () => {
    await lotarPalestra()
    await app.inject({ method: 'POST', url: `/palestras/${palestraId}/inscricoes`, payload: { email: 'alice@exemplo.com' } })

    const response = await app.inject({
      method: 'DELETE',
      url: `/palestras/${palestraId}/espera`,
      payload: { email: 'alice@exemplo.com' },
    })

    expect(response.statusCode).toBe(204)

    const entrada = banco.prepare('SELECT id FROM espera WHERE palestra_id = ? AND email = ?').get(palestraId, 'alice@exemplo.com')
    expect(entrada).toBeUndefined()
  })

  it('retorna 404 quando participante não está na fila (FR-011)', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/palestras/${palestraId}/espera`,
      payload: { email: 'naoexiste@exemplo.com' },
    })

    expect(response.statusCode).toBe(404)
  })

  it('retorna 404 para palestra inexistente', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/palestras/9999/espera',
      payload: { email: 'alice@exemplo.com' },
    })

    expect(response.statusCode).toBe(404)
  })

  it('não remove entrada de outro participante (FR-013)', async () => {
    await lotarPalestra()
    await app.inject({ method: 'POST', url: `/palestras/${palestraId}/inscricoes`, payload: { email: 'alice@exemplo.com' } })

    const response = await app.inject({
      method: 'DELETE',
      url: `/palestras/${palestraId}/espera`,
      payload: { email: 'outro@exemplo.com' },
    })

    expect(response.statusCode).toBe(404)

    const aliceAinda = banco.prepare('SELECT id FROM espera WHERE palestra_id = ? AND email = ?').get(palestraId, 'alice@exemplo.com')
    expect(aliceAinda).toBeTruthy()
  })
})

// --- US4: Consultar posição atual ---

describe('GET /palestras/:id/espera/posicao (US4)', () => {
  it('retorna posição atual na fila (FR-012)', async () => {
    await lotarPalestra()
    await app.inject({ method: 'POST', url: `/palestras/${palestraId}/inscricoes`, payload: { email: 'alice@exemplo.com' } })
    await app.inject({ method: 'POST', url: `/palestras/${palestraId}/inscricoes`, payload: { email: 'bob@exemplo.com' } })

    const response = await app.inject({
      method: 'GET',
      url: `/palestras/${palestraId}/espera/posicao?email=bob%40exemplo.com`,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<PosicaoEspera>()
    expect(body.posicao).toBe(2)
    expect(body.palestra_id).toBe(palestraId)
    expect(body.email).toBe('bob@exemplo.com')
  })

  it('posição diminui quando participante anterior sai da fila (SC-006)', async () => {
    await lotarPalestra()
    await app.inject({ method: 'POST', url: `/palestras/${palestraId}/inscricoes`, payload: { email: 'alice@exemplo.com' } })
    await app.inject({ method: 'POST', url: `/palestras/${palestraId}/inscricoes`, payload: { email: 'bob@exemplo.com' } })

    // alice sai da fila
    await app.inject({ method: 'DELETE', url: `/palestras/${palestraId}/espera`, payload: { email: 'alice@exemplo.com' } })

    const response = await app.inject({
      method: 'GET',
      url: `/palestras/${palestraId}/espera/posicao?email=bob%40exemplo.com`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<PosicaoEspera>().posicao).toBe(1)
  })

  it('retorna 404 quando participante não está na fila', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/palestras/${palestraId}/espera/posicao?email=naoexiste%40exemplo.com`,
    })

    expect(response.statusCode).toBe(404)
  })

  it('retorna 400 quando email não é fornecido', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/palestras/${palestraId}/espera/posicao`,
    })

    expect(response.statusCode).toBe(400)
  })

  it('retorna 404 para palestra inexistente', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/palestras/9999/espera/posicao?email=alice%40exemplo.com',
    })

    expect(response.statusCode).toBe(404)
  })
})
