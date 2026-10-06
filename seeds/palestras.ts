import { abrirBanco } from '../src/infra/banco/conexao.js'
import { executarMigracoes } from '../src/infra/banco/migracoes.js'

const banco = abrirBanco('dev.db')
executarMigracoes(banco)

const inserir = banco.prepare(`
  INSERT INTO palestras (titulo, descricao, data, horario, local, palestrante, vagas_total, vagas_disponiveis)
  VALUES (@titulo, @descricao, @data, @horario, @local, @palestrante, @vagas_total, @vagas_disponiveis)
`)

const palestras = [
  {
    titulo: 'Introdução à Inteligência Artificial',
    descricao: 'Visão geral sobre IA e machine learning para iniciantes.',
    data: '2026-11-10',
    horario: '14:00',
    local: 'Auditório A',
    palestrante: 'Dra. Ana Souza',
    vagas_total: 100,
    vagas_disponiveis: 100,
  },
  {
    titulo: 'Segurança em Aplicações Web',
    descricao: 'OWASP Top 10 e boas práticas de segurança.',
    data: '2026-11-10',
    horario: '16:00',
    local: 'Sala 101',
    palestrante: 'Prof. Carlos Lima',
    vagas_total: 2,
    vagas_disponiveis: 0,
  },
]

const inserirTodos = banco.transaction(() => {
  for (const palestra of palestras) {
    inserir.run(palestra)
  }
})

inserirTodos()
console.log(`Seed concluído: ${palestras.length} palestras inseridas.`)
