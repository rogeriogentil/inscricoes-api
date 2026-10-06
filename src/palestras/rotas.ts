import type { FastifyInstance } from 'fastify'
import type { Database } from 'better-sqlite3'
import { buscarTodas } from './repositorio.js'

export function registrarRotasPalestras(app: FastifyInstance, banco: Database): void {
  app.get('/palestras', async () => {
    const palestras = buscarTodas(banco)
    return { palestras }
  })
}
