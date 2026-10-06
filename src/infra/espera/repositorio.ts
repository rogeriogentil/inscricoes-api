import type { Database } from 'better-sqlite3'
import type { Espera } from '../../domain/espera.js'
import { EsperaNaoEncontrada, JaNaFila, JaInscrito } from '../../domain/espera.js'
import { PalestraNaoEncontrada } from '../../domain/inscricoes.js'

export function entrarNaFila(banco: Database, palestraId: number, email: string): Espera {
  const palestra = banco
    .prepare('SELECT id FROM palestras WHERE id = ?')
    .get(palestraId)

  if (!palestra) throw new PalestraNaoEncontrada()

  const jaInscrito = banco
    .prepare('SELECT id FROM inscricoes WHERE palestra_id = ? AND email = ?')
    .get(palestraId, email)

  if (jaInscrito) throw new JaInscrito()

  const criadaEm = new Date().toISOString()

  try {
    banco
      .prepare('INSERT INTO espera (palestra_id, email, criada_em) VALUES (?, ?, ?)')
      .run(palestraId, email, criadaEm)
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      throw new JaNaFila()
    }
    throw err
  }

  const entrada = banco
    .prepare('SELECT id, palestra_id, email, criada_em FROM espera WHERE palestra_id = ? AND email = ?')
    .get(palestraId, email) as { id: number; palestra_id: number; email: string; criada_em: string }

  const posicao = (
    banco
      .prepare('SELECT COUNT(*) as cnt FROM espera WHERE palestra_id = ? AND id < ?')
      .get(palestraId, entrada.id) as { cnt: number }
  ).cnt + 1

  return { ...entrada, posicao }
}

export function sairDaFila(banco: Database, palestraId: number, email: string): void {
  const palestra = banco
    .prepare('SELECT id FROM palestras WHERE id = ?')
    .get(palestraId)

  if (!palestra) throw new PalestraNaoEncontrada()

  const resultado = banco
    .prepare('DELETE FROM espera WHERE palestra_id = ? AND email = ?')
    .run(palestraId, email)

  if (resultado.changes === 0) throw new EsperaNaoEncontrada()
}

export function consultarPosicao(banco: Database, palestraId: number, email: string): Espera {
  const palestra = banco
    .prepare('SELECT id FROM palestras WHERE id = ?')
    .get(palestraId)

  if (!palestra) throw new PalestraNaoEncontrada()

  const entrada = banco
    .prepare('SELECT id, palestra_id, email, criada_em FROM espera WHERE palestra_id = ? AND email = ?')
    .get(palestraId, email) as { id: number; palestra_id: number; email: string; criada_em: string } | undefined

  if (!entrada) throw new EsperaNaoEncontrada()

  const posicao = (
    banco
      .prepare('SELECT COUNT(*) as cnt FROM espera WHERE palestra_id = ? AND id < ?')
      .get(palestraId, entrada.id) as { cnt: number }
  ).cnt + 1

  return { ...entrada, posicao }
}
