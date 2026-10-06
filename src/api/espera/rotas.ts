import type { FastifyInstance } from 'fastify'
import type { Espera } from '../../domain/espera.js'
import { EsperaNaoEncontrada } from '../../domain/espera.js'
import { PalestraNaoEncontrada } from '../../domain/inscricoes.js'

const schemaEmail = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
    },
  },
} as const

const schemaEmailQuery = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
    },
  },
} as const

type EsperaRepo = {
  sairDaFila: (palestraId: number, email: string) => void
  consultarPosicao: (palestraId: number, email: string) => Espera
}

export function registrarRotasEspera(app: FastifyInstance, repo: EsperaRepo): void {
  app.delete<{ Params: { id: string }; Body: { email: string } }>(
    '/palestras/:id/espera',
    { schema: { body: schemaEmail } },
    async (req, reply) => {
      const palestraId = parseInt(req.params.id, 10)
      if (!Number.isInteger(palestraId) || palestraId <= 0) {
        return reply.status(400).send({ erro: 'ID de palestra inválido' })
      }

      try {
        repo.sairDaFila(palestraId, req.body.email)
        return reply.status(204).send()
      } catch (err) {
        if (err instanceof PalestraNaoEncontrada || err instanceof EsperaNaoEncontrada) {
          return reply.status(404).send({ erro: (err as Error).message })
        }
        throw err
      }
    },
  )

  app.get<{ Params: { id: string }; Querystring: { email: string } }>(
    '/palestras/:id/espera/posicao',
    { schema: { querystring: schemaEmailQuery } },
    async (req, reply) => {
      const palestraId = parseInt(req.params.id, 10)
      if (!Number.isInteger(palestraId) || palestraId <= 0) {
        return reply.status(400).send({ erro: 'ID de palestra inválido' })
      }

      try {
        const entrada = repo.consultarPosicao(palestraId, req.query.email)
        return reply.status(200).send({
          posicao: entrada.posicao,
          palestra_id: entrada.palestra_id,
          email: entrada.email,
        })
      } catch (err) {
        if (err instanceof PalestraNaoEncontrada || err instanceof EsperaNaoEncontrada) {
          return reply.status(404).send({ erro: (err as Error).message })
        }
        throw err
      }
    },
  )
}
