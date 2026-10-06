import type { Database } from 'better-sqlite3'
import type { Palestra } from '../../domain/palestras.js'

export function buscarTodas(banco: Database): Palestra[] {
  return banco
    .prepare(
      `SELECT id, titulo, descricao, data, horario, local, palestrante,
              vagas_total, vagas_disponiveis
       FROM palestras`,
    )
    .all() as Palestra[]
}
