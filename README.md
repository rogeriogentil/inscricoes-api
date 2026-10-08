# inscricoes-api

Código de apoio do minicurso **Desenvolvimento de Software com SDD - Usando Spec Kit e Aplicando Arquitetura com Harness na Prática**, 
apresentado na Semana da Computação ([SECOMP](https://www.secompufscar.com.br/)) 2026 da [Universidade Federal de São Carlos](https://www.ufscar.br/) 
(UFSCar), no [Departamento de Computação](https://www.dc.ufscar.br/) (DC).

O projeto é uma API pequena, e propositalmente simples, para inscrição de participantes nas palestras do evento. O participante consulta 
as palestras, se inscreve, cancela a inscrição e, quando a palestra lota, entra numa lista de espera que é promovida automaticamente quando 
alguém desiste. O interesse não está no domínio em si, e sim em como o código foi produzido: cada funcionalidade nasceu de uma especificação 
escrita com o Spec Kit (`spec` → `plan` → `tasks` → implementação) e foi implementada com apoio de um agente de IA, dentro de limites 
arquiteturais verificados automaticamente.

### O que observar no repositório

- **`.specify/memory/constitution.md`**: a constituição do projeto, com os cinco princípios que guiam toda especificação e implementação (regras de negócio testadas, simplicidade antes de abstração, domínio em português, dependências justificadas e camadas).
- **`specs/`**: os artefatos do Spec Kit para cada feature, incluindo especificação, clarificações, plano, modelo de dados, contrato HTTP, checklists e tarefas.
  - `001-inscricoes-palestras`: listagem de palestras, inscrição e cancelamento.
  - `002-lista-espera`: fila de espera com promoção automática.
- **Architecture Harness**: o `AGENTS.md` informa ao agente as regras de arquitetura, e o `.dependency-cruiser.cjs` as transforma em verificação executável. `npm run check` roda tipos, lint, regras de dependência entre camadas e testes, e o agente precisa passar por ele antes de considerar uma tarefa concluída.
- **`src/`**: código organizado em três camadas, `domain` (regras de negócio puras), `api` (rotas HTTP com Fastify) e `infra` (SQLite), com dependências apenas na direção `api → domain ← infra`.

### Duas tags para comparar as implementações

O histórico tem duas tags que marcam cada etapa do minicurso:

- **`impl-spec1`**: implementação da spec 001 (inscrições em palestras), feita só com Spec Kit. O código está organizado por funcionalidade (`src/palestras`, `src/inscricoes`, `src/banco`), sem separação entre regras de negócio, HTTP e banco de dados, e não existe nenhuma verificação automática de arquitetura.
- **`impl-spec2`**: implementação da spec 002 (lista de espera), feita já com o Architecture Harness. Além da nova funcionalidade, esta etapa traz uma refatoração arquitetural do código da spec 001 para as camadas `domain`, `api` e `infra`. A constituição ganha o princípio V (Camadas), o `AGENTS.md` passa a orientar o agente e o `npm run check` (TypeScript, ESLint, dependency-cruiser e testes) passa a barrar qualquer import que viole a direção das dependências.

Para ver a diferença entre as duas etapas:

```bash
git checkout impl-spec1           # estado após a spec 001
git checkout impl-spec2           # estado após a spec 002 + refatoração
git diff --stat impl-spec1 impl-spec2
```

Ou direto no GitHub: [comparar `impl-spec1...impl-spec2`](https://github.com/rogeriogentil/inscricoes-api/compare/impl-spec1...impl-spec2).

### Como rodar

Requer Node.js 22 (veja `.nvmrc`).

```bash
npm install
npm run seed     # popula o banco com palestras de exemplo
npm run dev      # sobe a API
npm run check    # tipos + lint + regras de arquitetura + testes
```

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/palestras` | Lista as palestras com vagas disponíveis |
| POST | `/palestras/:id/inscricoes` | Inscreve um participante (ou o coloca na lista de espera, se lotada) |
| DELETE | `/palestras/:id/inscricoes` | Cancela a inscrição e promove o primeiro da fila |
| GET | `/palestras/:id/espera/posicao?email=` | Consulta a posição na lista de espera |
| DELETE | `/palestras/:id/espera` | Sai da lista de espera |

### Licença

MIT
