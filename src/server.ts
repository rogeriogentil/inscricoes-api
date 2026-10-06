import Fastify, { type FastifyInstance } from 'fastify'
import type { Database } from 'better-sqlite3'
import { abrirBanco } from './banco/conexao.js'
import { executarMigracoes } from './banco/migracoes.js'
import { registrarRotasPalestras } from './palestras/rotas.js'
import { registrarRotasInscricoes } from './inscricoes/rotas.js'

export function criarApp(banco: Database): FastifyInstance {
  const app = Fastify({ logger: false })

  registrarRotasPalestras(app, banco)
  registrarRotasInscricoes(app, banco)

  return app
}

export async function iniciarServidor(porta?: number): Promise<string> {
  const caminhoBanco = process.env['DB_PATH'] ?? 'dev.db'
  const portaEfetiva = porta ?? Number(process.env['PORT'] ?? 3000)

  const banco = abrirBanco(caminhoBanco)
  executarMigracoes(banco)

  const app = criarApp(banco)
  const endereco = await app.listen({ port: portaEfetiva, host: '0.0.0.0' })
  return endereco
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  iniciarServidor().then((addr) => {
    console.log(`Servidor rodando em ${addr}`)
  })
}
