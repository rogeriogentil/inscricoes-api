import Fastify, { type FastifyInstance } from 'fastify'
import type { Database } from 'better-sqlite3'
import { abrirBanco } from './infra/banco/conexao.js'
import { executarMigracoes } from './infra/banco/migracoes.js'
import { buscarTodas } from './infra/palestras/repositorio.js'
import { inscrever, cancelar } from './infra/inscricoes/repositorio.js'
import { entrarNaFila, sairDaFila, consultarPosicao } from './infra/espera/repositorio.js'
import { registrarRotasPalestras } from './api/palestras/rotas.js'
import { registrarRotasInscricoes } from './api/inscricoes/rotas.js'
import { registrarRotasEspera } from './api/espera/rotas.js'

export function criarApp(banco: Database): FastifyInstance {
  const app = Fastify({ logger: false })

  registrarRotasPalestras(app, {
    buscarTodas: () => buscarTodas(banco),
  })
  registrarRotasInscricoes(app, {
    inscrever: (id, email) => inscrever(banco, id, email),
    cancelar: (id, email) => cancelar(banco, id, email),
    entrarNaFila: (id, email) => entrarNaFila(banco, id, email),
  })
  registrarRotasEspera(app, {
    sairDaFila: (id, email) => sairDaFila(banco, id, email),
    consultarPosicao: (id, email) => consultarPosicao(banco, id, email),
  })

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
