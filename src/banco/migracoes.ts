import type { Database } from 'better-sqlite3'

export function executarMigracoes(banco: Database): void {
  banco.exec(`
    CREATE TABLE IF NOT EXISTS palestras (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo             TEXT    NOT NULL,
      descricao          TEXT,
      data               TEXT    NOT NULL,
      horario            TEXT    NOT NULL,
      local              TEXT    NOT NULL,
      palestrante        TEXT    NOT NULL,
      vagas_total        INTEGER NOT NULL CHECK (vagas_total > 0),
      vagas_disponiveis  INTEGER NOT NULL CHECK (vagas_disponiveis >= 0)
    );

    CREATE TABLE IF NOT EXISTS inscricoes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      palestra_id  INTEGER NOT NULL REFERENCES palestras(id),
      email        TEXT    NOT NULL,
      criada_em    TEXT    NOT NULL,
      UNIQUE(palestra_id, email)
    );
  `)
}
