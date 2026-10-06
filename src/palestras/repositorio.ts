import type { Database } from 'better-sqlite3'

export type Palestra = {
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

export function buscarTodas(banco: Database): Palestra[] {
  return banco
    .prepare(
      `SELECT id, titulo, descricao, data, horario, local, palestrante,
              vagas_total, vagas_disponiveis
       FROM palestras`,
    )
    .all() as Palestra[]
}
