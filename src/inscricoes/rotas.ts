import type { FastifyInstance } from 'fastify'
import type { Database } from 'better-sqlite3'
import {
  inscrever,
  cancelar,
  PalestraNaoEncontrada,
  SemVagas,
  InscricaoDuplicada,
  InscricaoNaoEncontrada,
} from './repositorio.js'

const schemaEmail = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      // Fastify AJV 8 ignores `format` by default; `pattern` is validated natively
      pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
    },
  },
} as const

export function registrarRotasInscricoes(app: FastifyInstance, banco: Database): void {
  app.post<{ Params: { id: string }; Body: { email: string } }>(
    '/palestras/:id/inscricoes',
    { schema: { body: schemaEmail } },
    async (req, reply) => {
      const palestraId = parseInt(req.params.id, 10)
      if (!Number.isInteger(palestraId) || palestraId <= 0) {
        return reply.status(400).send({ erro: 'ID de palestra inválido' })
      }

      try {
        const inscricao = inscrever(banco, palestraId, req.body.email)
        return reply.status(201).send(inscricao)
      } catch (err) {
        if (err instanceof PalestraNaoEncontrada) {
          return reply.status(404).send({ erro: err.message })
        }
        if (err instanceof SemVagas) {
          return reply.status(422).send({ erro: err.message })
        }
        if (err instanceof InscricaoDuplicada) {
          return reply.status(409).send({ erro: err.message })
        }
        throw err
      }
    },
  )

  app.delete<{ Params: { id: string }; Body: { email: string } }>(
    '/palestras/:id/inscricoes',
    { schema: { body: schemaEmail } },
    async (req, reply) => {
      const palestraId = parseInt(req.params.id, 10)
      if (!Number.isInteger(palestraId) || palestraId <= 0) {
        return reply.status(400).send({ erro: 'ID de palestra inválido' })
      }

      try {
        cancelar(banco, palestraId, req.body.email)
        return reply.status(204).send()
      } catch (err) {
        if (err instanceof PalestraNaoEncontrada) {
          return reply.status(404).send({ erro: err.message })
        }
        if (err instanceof InscricaoNaoEncontrada) {
          return reply.status(404).send({ erro: err.message })
        }
        throw err
      }
    },
  )
}
