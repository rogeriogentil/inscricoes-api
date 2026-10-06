# Tasks: Lista de Espera em Palestras

**Input**: Design documents from `specs/002-lista-espera/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [data-model.md](data-model.md) · [contracts/http-api.md](contracts/http-api.md) · [research.md](research.md)

**Organization**: Tarefas agrupadas por fase. Fase 0 (refatoração) é pré-requisito bloqueante para todas as user stories. US1–US4 em ordem de prioridade.

## Format: `[ID] [P?] [Story?] Descrição com caminho de arquivo`

- **[P]**: pode executar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: user story a que pertence (US1–US4); ausente nas fases de infraestrutura

---

## Fase 0: Refatoração de Camadas (Princípio V — pré-requisito bloqueante)

**Objetivo**: Mover o código existente para `src/domain/`, `src/infra/`, `src/api/`. Comportamento inalterado. Todos os testes devem continuar passando ao fim desta fase.

**⚠️ CRÍTICO**: Nenhuma user story pode começar antes desta fase estar completa e `npm run check` passando.

**Passo 1 — criar módulos de domínio e mover banco/ (paralelos entre si):**

- [X] T001 [P] Criar `src/domain/palestras.ts` com `export type Palestra = { id: number; titulo: string; descricao: string; data: string; horario: string; local: string; palestrante: string; vagas_total: number; vagas_disponiveis: number }` (extraído de `src/palestras/repositorio.ts`)
- [X] T002 [P] Criar `src/domain/inscricoes.ts` com `export type Inscricao`, `export class PalestraNaoEncontrada`, `SemVagas`, `InscricaoDuplicada`, `InscricaoNaoEncontrada` (extraídos de `src/inscricoes/repositorio.ts`)
- [X] T003 [P] Mover `src/banco/conexao.ts` → `src/infra/banco/conexao.ts` sem mudança de conteúdo; criar diretório `src/infra/banco/` se necessário
- [X] T004 [P] Mover `src/banco/migracoes.ts` → `src/infra/banco/migracoes.ts` sem mudança de conteúdo

**Passo 2 — mover repositórios para infra/ (T005 e T007 paralelos entre si, dependem de T001–T002):**

- [X] T005 [P] Mover `src/palestras/repositorio.ts` → `src/infra/palestras/repositorio.ts`; substituir definição local de `Palestra` por `import type { Palestra } from '../../domain/palestras.js'`
- [X] T007 [P] Mover `src/inscricoes/repositorio.ts` → `src/infra/inscricoes/repositorio.ts`; remover definição de `Inscricao` e classes de erro; adicionar `import type { Inscricao } from '../../domain/inscricoes.js'` e `import { PalestraNaoEncontrada, SemVagas, InscricaoDuplicada, InscricaoNaoEncontrada } from '../../domain/inscricoes.js'`

**Passo 3 — mover rotas para api/ (T006 e T008 paralelos entre si, dependem de T005/T007):**

- [X] T006 [P] Mover `src/palestras/rotas.ts` → `src/api/palestras/rotas.ts`; remover import de `./repositorio.js`; alterar assinatura para `registrarRotasPalestras(app, { buscarTodas })` onde `buscarTodas` é função sem `banco` (já parcializada); importar apenas tipos de `../../domain/palestras.js` (api → infra ❌: sem import de infra)
- [X] T008 [P] Mover `src/inscricoes/rotas.ts` → `src/api/inscricoes/rotas.ts`; remover import de `./repositorio.js`; alterar assinatura para `registrarRotasInscricoes(app, { inscrever, cancelar })`; chamar `inscrever(palestraId, email)` sem `banco`; importar apenas de `../../domain/inscricoes.js` (api → infra ❌: sem import de infra)

**Passo 4 — atualizar server.ts e testes (dependem de T006/T008):**

- [X] T009 Atualizar `src/server.ts`: (1) atualizar imports de banco: `'./infra/banco/conexao.js'`, `'./infra/banco/migracoes.js'`; (2) atualizar imports de rotas: `'./api/inscricoes/rotas.js'`, `'./api/palestras/rotas.js'`; (3) adicionar imports das funções de infra: `import { inscrever, cancelar } from './infra/inscricoes/repositorio.js'` e `import { buscarTodas } from './infra/palestras/repositorio.js'`; (4) injetar funções parcializadas com `banco`: `registrarRotasInscricoes(app, { inscrever: (id, email) => inscrever(banco, id, email), cancelar: (id, email) => cancelar(banco, id, email) })` e `registrarRotasPalestras(app, { buscarTodas: () => buscarTodas(banco) })`
- [X] T010 [P] Atualizar imports em `tests/integracao/inscricoes.test.ts` para os novos caminhos (`src/infra/banco/`, `src/api/inscricoes/`, `src/server.ts`)
- [X] T011 [P] Atualizar imports em `tests/integracao/palestras.test.ts` para os novos caminhos (`src/infra/banco/`, `src/api/palestras/`, `src/server.ts`)

**Checkpoint — Fase 0 completa:**

- [X] T012 Executar `npm run check` — todos os testes e verificações devem passar com a estrutura refatorada antes de avançar

---

## Fase 1: Setup (Infraestrutura para a feature)

**Objetivo**: Criar os módulos de domínio e infraestrutura da fila de espera e adicionar a migração do banco.

**⚠️ CRÍTICO**: Fase 0 deve estar concluída (T012 passando) antes de iniciar.

- [X] T013 [P] Criar `src/domain/espera.ts` com `export type Espera = { id: number; palestra_id: number; email: string; posicao: number; criada_em: string }` e `export class EsperaNaoEncontrada`, `JaNaFila`, `JaInscrito extends Error {}`
- [X] T014 [P] Adicionar tabela `espera` ao final do `banco.exec(...)` em `src/infra/banco/migracoes.ts`: `CREATE TABLE IF NOT EXISTS espera (id INTEGER PRIMARY KEY AUTOINCREMENT, palestra_id INTEGER NOT NULL REFERENCES palestras(id), email TEXT NOT NULL, criada_em TEXT NOT NULL, UNIQUE(palestra_id, email));`

---

## Fase 2: US1 — Entrar na Lista de Espera (P1) 🎯 MVP

**Objetivo**: Quando uma palestra está lotada, `POST /palestras/:id/inscricoes` adiciona o participante à fila FIFO e retorna 202 com `posicao`.

**Teste independente**: `POST` em palestra com 0 vagas retorna 202 com `{ id, palestra_id, email, posicao: 1, criada_em }`; segunda entrada retorna `posicao: 2`; tentativa duplicada retorna 409.

- [X] T015 [US1] Criar `src/infra/espera/repositorio.ts` com função `entrarNaFila(banco, palestraId, email): Espera`: (1) SELECT palestra → `PalestraNaoEncontrada`; (2) SELECT em inscricoes → `JaInscrito`; (3) INSERT com `criada_em = new Date().toISOString()` (UNIQUE violation → `JaNaFila`); (4) calcular `posicao` via `SELECT COUNT(*) + 1 FROM espera WHERE palestra_id = ? AND criada_em < ?` (usar a mesma variável `criada_em` do INSERT; `<` não `<=`); retornar `Espera`. Importar de `../../domain/espera.js` e `../../domain/inscricoes.js`
- [X] T016 [US1] Modificar handler `POST /palestras/:id/inscricoes` em `src/api/inscricoes/rotas.ts`: expandir parâmetro para `registrarRotasInscricoes(app, { inscrever, cancelar, entrarNaFila })`; capturar `SemVagas` → chamar `entrarNaFila(palestraId, email)` (sem `banco`); capturar `JaInscrito` e `JaNaFila` → 409; sucesso → `reply.code(202).send(entradaEspera)`; importar erros de `../../domain/espera.js` (api → infra ❌: sem import de infra)
- [X] T017 [P] [US1] Criar `tests/integracao/espera.test.ts` com `beforeEach`/`afterEach` no padrão de `inscricoes.test.ts` (`:memory:`, `executarMigracoes`, `criarApp`) e testes: palestra lotada → 202 posicao 1; segunda entrada → posicao 2; duplicata na fila → 409; inscrito tenta entrar → 409; palestra com vaga → 201 (não 202)
- [X] T018 [P] [US1] Atualizar `tests/integracao/inscricoes.test.ts`: substituir expectativa de 422 (palestra lotada) por 202 com body `{ posicao: 1 }`

**Checkpoint**: US1 completa — `npm test` passando para `espera.test.ts` (US1) e `inscricoes.test.ts`

---

## Fase 3: US2 — Promoção Automática ao Cancelamento (P2)

**Objetivo**: `DELETE /palestras/:id/inscricoes` promove automaticamente o primeiro da fila para inscrito em uma única transação atômica; `vagas_disponiveis` permanece 0.

**Teste independente**: Cancelar inscrição com 1 participante na fila → 204; consultar inscrições → participante da fila agora inscrito; consultar palestra → `vagas_disponiveis = 0`. Cancelar sem fila → `vagas_disponiveis = 1`.

- [X] T019 [US2] Modificar `cancelar` em `src/infra/inscricoes/repositorio.ts`: (1) adicionar `export type ResultadoCancelamento = { promovido: string | null }`; (2) envolver toda a lógica em `banco.transaction()`; (3) após DELETE de inscricoes: SELECT primeiro da fila via `SELECT id, email FROM espera WHERE palestra_id = ? ORDER BY criada_em ASC LIMIT 1`; se encontrado: DELETE de espera + INSERT em inscricoes (sem alterar `vagas_disponiveis`); se não: UPDATE `vagas_disponiveis + 1`; retornar `{ promovido: email | null }`
- [X] T020 [US2] Atualizar handler `DELETE /palestras/:id/inscricoes` em `src/api/inscricoes/rotas.ts`: ignorar o valor de retorno de `cancelar` (resposta permanece 204)
- [X] T021 [P] [US2] Adicionar testes de US2 a `tests/integracao/espera.test.ts`: cancelamento com fila → promoção automática + vagas_disponiveis = 0; cancelamento sem fila → vagas_disponiveis = 1; múltiplos na fila → apenas o primeiro (criada_em mais antiga) é promovido

**Checkpoint**: US2 completa — `npm test` passando para todos os testes de espera

---

## Fase 4: US3 — Sair da Lista de Espera (P3)

**Objetivo**: `DELETE /palestras/:id/espera` com `{ email }` remove o participante da fila; 204 em sucesso, 404 se não encontrado.

**Teste independente**: Participante na fila + DELETE → 204; DELETE novamente → 404; DELETE para e-mail não cadastrado → 404.

- [X] T022 [US3] Adicionar função `sairDaFila(banco, palestraId, email): void` a `src/infra/espera/repositorio.ts`: (1) SELECT palestra → `PalestraNaoEncontrada`; (2) DELETE WHERE palestra_id = ? AND email = ?; se `changes = 0` → `EsperaNaoEncontrada`
- [X] T023 [US3] Criar `src/api/espera/rotas.ts` com `export function registrarRotasEspera(app, { sairDaFila, consultarPosicao })`: handler `DELETE /palestras/:id/espera` com `schema: { body: schemaEmail }` (mesmo padrão de `api/inscricoes/rotas.ts`); chamar `sairDaFila(palestraId, email)` (sem `banco`); `PalestraNaoEncontrada` → 404; `EsperaNaoEncontrada` → 404; AJV → 400; importar apenas erros de `../../domain/espera.js` e `../../domain/inscricoes.js` (api → infra ❌: sem import de infra)
- [X] T024 [US3] Atualizar `src/server.ts`: adicionar import `import { entrarNaFila, sairDaFila, consultarPosicao } from './infra/espera/repositorio.js'`; adicionar import `import { registrarRotasEspera } from './api/espera/rotas.js'`; registrar `registrarRotasEspera(app, { sairDaFila: (id, email) => sairDaFila(banco, id, email), consultarPosicao: (id, email) => consultarPosicao(banco, id, email) })`; também expandir injeção de `registrarRotasInscricoes` para incluir `entrarNaFila: (id, email) => entrarNaFila(banco, id, email)`
- [X] T025 [P] [US3] Adicionar testes de US3 a `tests/integracao/espera.test.ts`: DELETE /espera existente → 204; DELETE /espera inexistente → 404; palestra inexistente → 404

**Checkpoint**: US3 completa — `npm test` passando para todos os testes

---

## Fase 5: US4 — Consultar Posição Atual (P4)

**Objetivo**: `GET /palestras/:id/espera/posicao?email=` retorna `{ posicao, palestra_id, email }` com a posição atual (recalculada).

**Teste independente**: Dois participantes na fila → GET posicao do segundo retorna 2; após saída do primeiro → GET retorna 1; participante não na fila → 404.

- [X] T026 [US4] Adicionar função `consultarPosicao(banco, palestraId, email): Espera` a `src/infra/espera/repositorio.ts`: (1) SELECT palestra → `PalestraNaoEncontrada`; (2) SELECT `criada_em` WHERE palestra_id = ? AND email = ? → se ausente: `EsperaNaoEncontrada`; (3) calcular posição via `SELECT COUNT(*) + 1 FROM espera WHERE palestra_id = ? AND criada_em < ?`; retornar `Espera` com posição
- [X] T027 [US4] Adicionar handler `GET /palestras/:id/espera/posicao` a `src/api/espera/rotas.ts` com `schema: { querystring: schemaEmailQuery }` onde `schemaEmailQuery = { type: 'object', required: ['email'], properties: { email: { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' } } }`; `consultarPosicao` → 200 `{ posicao, palestra_id, email }`; `PalestraNaoEncontrada`/`EsperaNaoEncontrada` → 404; AJV → 400
- [X] T028 [P] [US4] Adicionar testes de US4 a `tests/integracao/espera.test.ts`: GET posicao retorna posição atual (não original); GET após saída voluntária de anterior → posição diminui; GET para e-mail não cadastrado → 404; GET sem query param email → 400

**Checkpoint**: US4 completa — `npm test` passando para todos os testes

---

## Fase 6: Polish & Verificação Final

- [X] T029 Executar `npm run check` — todos os checks (lint, tipos, testes) devem passar; resolver quaisquer falhas antes de marcar a feature como concluída

---

## Dependências e Ordem de Execução

### Dependências entre fases

- **Fase 0 (Refatoração)**: Sem dependências — iniciar imediatamente
- **Fase 1 (Setup)**: Depende de Fase 0 (T012) — bloqueia US1–US4
- **US1 (Fase 2)**: Depende de Fase 1 — pode iniciar após T013+T014
- **US2 (Fase 3)**: Depende de US1 (POST handler modificado em T016)
- **US3 (Fase 4)**: Depende de Fase 1; independente de US1/US2
- **US4 (Fase 5)**: Depende de Fase 1 e de US3 (adiciona ao `espera/rotas.ts` criado em T023)
- **Polish (Fase 6)**: Depende de todas as user stories concluídas

### Dependências dentro da Fase 0

```
T001, T002, T003, T004  (paralelos — sem dependências entre si)
        ↓
T005, T007  (paralelos — dependem de T001 e T002 respectivamente)
        ↓
T006, T008  (paralelos — dependem de T005 e T007 respectivamente)
        ↓
T009  (depende de T006, T008, T003, T004)
        ↓
T010, T011  (paralelos — dependem de T009)
        ↓
T012  (npm run check — valida tudo)
```

---

## Oportunidades de Paralelismo

### Fase 0 — Passo 1 (paralelos entre si)
```
T001  src/domain/palestras.ts
T002  src/domain/inscricoes.ts
T003  src/infra/banco/conexao.ts
T004  src/infra/banco/migracoes.ts
```

### Fase 0 — Passos 2 e 3 (paralelos dentro de cada passo)
```
# Passo 2 (após T001+T002):
T005  src/infra/palestras/repositorio.ts
T007  src/infra/inscricoes/repositorio.ts

# Passo 3 (após T005+T007):
T006  src/api/palestras/rotas.ts
T008  src/api/inscricoes/rotas.ts
```

### Fase 1 (paralelos entre si)
```
T013  src/domain/espera.ts
T014  src/infra/banco/migracoes.ts  ← adicionar tabela espera
```

### Por user story (paralelos dentro de cada US)
```
US1: T017+T018 (testes) em paralelo com T015+T016 (implementação)
US2: T021 (testes) em paralelo com T019+T020 (implementação)
US3: T025 (testes) em paralelo com T022+T023+T024 (implementação)
US4: T028 (testes) em paralelo com T026+T027 (implementação)
```

---

## Estratégia de Implementação

### MVP (US1 apenas)

1. Completar Fase 0 (T001–T012) — refatoração sem quebrar nada
2. Completar Fase 1 (T013–T014) — tabela espera + domínio
3. Completar US1 (T015–T018)
4. **PARAR E VALIDAR**: `npm test` passando; `POST` em palestra lotada retorna 202
5. Demonstrar se necessário

### Entrega incremental

1. Fase 0 + Fase 1 → base pronta
2. + US1 → lista de espera funcional (202 ao invés de erro)
3. + US2 → promoção automática ao cancelar
4. + US3 → participante pode sair da fila voluntariamente
5. + US4 → participante pode consultar posição atual
6. Fase 6 → verificação final completa

---

## Notes

- `[P]` = arquivos diferentes, sem dependências — pode executar em paralelo
- `[Story]` ausente = tarefa de infraestrutura (sem user story direta)
- A Fase 0 é refatoração pura — **não alterar comportamento**, mas muda padrão de injeção (banco → funções parcializadas)
- Verificar `npm run check` após Fase 0 antes de iniciar qualquer user story
- `api/*/rotas.ts` NUNCA importa de `infra/` — recebe funções por parâmetro (Princípio V: api → infra ❌)
- O `banco.transaction()` em `cancelar` (T019) garante atomicidade de cancelamento + promoção (FR-008)
- `consultarPosicao` usa `criada_em <` (menor que, não ≤) para calcular posição 1-indexada corretamente
- Testes incluídos conforme Princípio I (Regras Testadas) da constituição

---

## Fase 7: Convergence

- [X] T030 Atualizar `specs/002-lista-espera/research.md` Decisão 2 e `specs/002-lista-espera/data-model.md` §Posição na fila para documentar que ordenação FIFO usa coluna `id` (AUTOINCREMENT, estritamente crescente) em vez de `criada_em < ?` — timestamps ISO 8601 com precisão de milissegundo podem colidir em testes síncronos in-process, tornando `id` a escolha mais robusta; atualizar também a menção a `ORDER BY criada_em ASC` em `cancelar` para `ORDER BY id ASC` per research.md Decisão 2 e data-model.md §Posição (contradicts)
