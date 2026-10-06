import type { FastifyInstance } from 'fastify'
import type { Palestra } from '../../domain/palestras.js'

type PalestrasRepo = {
  buscarTodas: () => Palestra[]
}

export function registrarRotasPalestras(app: FastifyInstance, repo: PalestrasRepo): void {
  app.get('/palestras', async () => {
    return { palestras: repo.buscarTodas() }
  })
}
