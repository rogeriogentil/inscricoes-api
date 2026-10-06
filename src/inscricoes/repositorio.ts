import type { Database } from 'better-sqlite3'

export type Inscricao = {
  id: number
  palestra_id: number
  email: string
  criada_em: string
}

export class PalestraNaoEncontrada extends Error {
  constructor() {
    super('Palestra não encontrada')
  }
}

export class SemVagas extends Error {
  constructor() {
    super('Sem vagas disponíveis')
  }
}

export class InscricaoDuplicada extends Error {
  constructor() {
    super('Participante já inscrito nesta palestra')
  }
}

export class InscricaoNaoEncontrada extends Error {
  constructor() {
    super('Inscrição não encontrada')
  }
}

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

export function cancelar(banco: Database, palestraId: number, email: string): void {
  const cancelarTx = banco.transaction(() => {
    const palestra = banco
      .prepare('SELECT id FROM palestras WHERE id = ?')
      .get(palestraId)

    if (!palestra) throw new PalestraNaoEncontrada()

    const resultado = banco
      .prepare('DELETE FROM inscricoes WHERE palestra_id = ? AND email = ?')
      .run(palestraId, email)

    if (resultado.changes === 0) throw new InscricaoNaoEncontrada()

    banco
      .prepare('UPDATE palestras SET vagas_disponiveis = vagas_disponiveis + 1 WHERE id = ?')
      .run(palestraId)
  })

  cancelarTx()
}
