import type { Database } from 'better-sqlite3'
import type { Inscricao } from '../../domain/inscricoes.js'
import {
  PalestraNaoEncontrada,
  SemVagas,
  InscricaoDuplicada,
  InscricaoNaoEncontrada,
} from '../../domain/inscricoes.js'

export type ResultadoCancelamento = { promovido: string | null }

export function inscrever(banco: Database, palestraId: number, email: string): Inscricao {
  const inscreverTx = banco.transaction(() => {
    const palestra = banco
      .prepare('SELECT vagas_disponiveis FROM palestras WHERE id = ?')
      .get(palestraId) as { vagas_disponiveis: number } | undefined

    if (!palestra) throw new PalestraNaoEncontrada()
    if (palestra.vagas_disponiveis <= 0) throw new SemVagas()

    const criadaEm = new Date().toISOString()

    try {
      banco
        .prepare(
          'INSERT INTO inscricoes (palestra_id, email, criada_em) VALUES (?, ?, ?)',
        )
        .run(palestraId, email, criadaEm)
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
        throw new InscricaoDuplicada()
      }
      throw err
    }

    banco
      .prepare('UPDATE palestras SET vagas_disponiveis = vagas_disponiveis - 1 WHERE id = ?')
      .run(palestraId)

    return banco
      .prepare('SELECT id, palestra_id, email, criada_em FROM inscricoes WHERE palestra_id = ? AND email = ?')
      .get(palestraId, email) as Inscricao
  })

  return inscreverTx()
}

export function cancelar(banco: Database, palestraId: number, email: string): ResultadoCancelamento {
  const cancelarTx = banco.transaction(() => {
    const palestra = banco
      .prepare('SELECT id FROM palestras WHERE id = ?')
      .get(palestraId)

    if (!palestra) throw new PalestraNaoEncontrada()

    const resultado = banco
      .prepare('DELETE FROM inscricoes WHERE palestra_id = ? AND email = ?')
      .run(palestraId, email)

    if (resultado.changes === 0) throw new InscricaoNaoEncontrada()

    const proximo = banco
      .prepare('SELECT id, email FROM espera WHERE palestra_id = ? ORDER BY id ASC LIMIT 1')
      .get(palestraId) as { id: number; email: string } | undefined

    if (proximo) {
      banco.prepare('DELETE FROM espera WHERE id = ?').run(proximo.id)
      banco
        .prepare('INSERT INTO inscricoes (palestra_id, email, criada_em) VALUES (?, ?, ?)')
        .run(palestraId, proximo.email, new Date().toISOString())
      return { promovido: proximo.email }
    }

    banco
      .prepare('UPDATE palestras SET vagas_disponiveis = vagas_disponiveis + 1 WHERE id = ?')
      .run(palestraId)
    return { promovido: null }
  })

  return cancelarTx()
}
