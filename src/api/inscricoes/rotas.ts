import type { FastifyInstance } from 'fastify'
import type { Inscricao } from '../../domain/inscricoes.js'
import type { Espera } from '../../domain/espera.js'
import {
  PalestraNaoEncontrada,
  SemVagas,
  InscricaoDuplicada,
  InscricaoNaoEncontrada,
} from '../../domain/inscricoes.js'
import { JaInscrito, JaNaFila } from '../../domain/espera.js'

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

type InscricoesRepo = {
  inscrever: (palestraId: number, email: string) => Inscricao
  cancelar: (palestraId: number, email: string) => { promovido: string | null }
  entrarNaFila: (palestraId: number, email: string) => Espera
}

export function registrarRotasInscricoes(app: FastifyInstance, repo: InscricoesRepo): void {
  app.post<{ Params: { id: string }; Body: { email: string } }>(
    '/palestras/:id/inscricoes',
    { schema: { body: schemaEmail } },
    async (req, reply) => {
      const palestraId = parseInt(req.params.id, 10)
      if (!Number.isInteger(palestraId) || palestraId <= 0) {
        return reply.status(400).send({ erro: 'ID de palestra inválido' })
      }

      try {
        const inscricao = repo.inscrever(palestraId, req.body.email)
        return reply.status(201).send(inscricao)
      } catch (err) {
        if (err instanceof PalestraNaoEncontrada) {
          return reply.status(404).send({ erro: err.message })
        }
        if (err instanceof SemVagas) {
          try {
            const entrada = repo.entrarNaFila(palestraId, req.body.email)
            return reply.status(202).send(entrada)
          } catch (errFila) {
            if (errFila instanceof JaInscrito || errFila instanceof JaNaFila) {
              return reply.status(409).send({ erro: (errFila as Error).message })
            }
            if (errFila instanceof PalestraNaoEncontrada) {
              return reply.status(404).send({ erro: (errFila as Error).message })
            }
            throw errFila
          }
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
        repo.cancelar(palestraId, req.body.email)
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
