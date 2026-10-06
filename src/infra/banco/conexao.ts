import Database from 'better-sqlite3'

export { Database }

export function abrirBanco(caminho: string): Database.Database {
  return new Database(caminho)
}
