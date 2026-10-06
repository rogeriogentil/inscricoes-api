# Tasks: Inscrições em Palestras

**Input**: Design documents from `/specs/001-inscricoes-palestras/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Incluídos — SC-005 e Princípio I da constituição exigem que toda regra de negócio (FR-002 a FR-009) tenha teste automatizado que falhe quando a regra for violada.

**Organization**: Tasks agrupadas por user story (P1 → P2 → P3) para entrega incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente da spec.md

## Path Conventions

Single project (Node.js): `src/` e `tests/` na raiz do repositório.

---

## Phase 1: Setup (Infraestrutura Compartilhada)

**Purpose**: Inicialização do projeto e configuração de tooling

- [x] T001 Initialize Node.js project: create `package.json` with `"type": "module"` and scripts `"test": "vitest run"`, `"dev": "node --experimental-strip-types src/server.ts"` at repo root — uses Node.js 22 native TS execution (see research.md Decisão 1), no extra runtime required
- [x] T002 Install runtime dependencies via npm: `fastify`, `better-sqlite3` at repo root (justified in research.md)
- [x] T003 [P] Install dev dependencies via npm: `typescript`, `@types/node`, `@types/better-sqlite3`, `vitest` at repo root — **omit `tsx`**: Node.js 22 `--experimental-strip-types` covers dev execution natively (Princípio IV: dependência sem justificativa evitada)
- [x] T004 [P] Create `tsconfig.json` at repo root: `target: "ES2022"`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `strict: true`, `outDir: "dist"`
- [x] T005 [P] Create `vitest.config.ts` at repo root: configure `test.environment` to `"node"` and ensure TypeScript files are resolved without transpilation overhead
- [x] T006 [P] Create source directory tree at repo root: `src/banco/`, `src/palestras/`, `src/inscricoes/`, `tests/integracao/`, `seeds/`

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Purpose**: Infraestrutura de banco e servidor que TODAS as user stories dependem

**⚠️ CRÍTICO**: Nenhuma user story pode ser iniciada antes desta fase estar completa

- [x] T007 Create `src/banco/conexao.ts`: export `abrirBanco(caminho: string): Database` wrapping `new Database(caminho)` from `better-sqlite3`; re-export the `Database` type for use in other modules
- [x] T008 Create `src/banco/migracoes.ts`: export `executarMigracoes(banco: Database): void` that runs `db.exec()` with the exact DDL from data-model.md — `CREATE TABLE IF NOT EXISTS palestras (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT NOT NULL, descricao TEXT, data TEXT NOT NULL, horario TEXT NOT NULL, local TEXT NOT NULL, palestrante TEXT NOT NULL, vagas_total INTEGER NOT NULL CHECK (vagas_total > 0), vagas_disponiveis INTEGER NOT NULL CHECK (vagas_disponiveis >= 0)); CREATE TABLE IF NOT EXISTS inscricoes (id INTEGER PRIMARY KEY AUTOINCREMENT, palestra_id INTEGER NOT NULL REFERENCES palestras(id), email TEXT NOT NULL, criada_em TEXT NOT NULL, UNIQUE(palestra_id, email))`
- [x] T009 Create `src/server.ts`: export `criarApp(banco: Database): FastifyInstance` factory (returns a fresh Fastify instance with routes registered — enables per-test isolation via `app.inject()`); export `iniciarServidor(porta?: number): Promise<string>` that calls `criarApp(abrirBanco(DB_PATH)).listen(...)`, reading PORT and DB_PATH from environment variables (defaults: 3000, `dev.db`) — **note**: Fastify's AJV 8 ignores `format` keywords by default; use `pattern` regex in route schemas instead of `format: "email"` (avoids `ajv-formats` dependency — Princípio IV)

**Checkpoint**: Fundação pronta — implementação das user stories pode começar

---

## Phase 3: User Story 1 — Consultar Palestras (Priority: P1) 🎯 MVP

**Goal**: Participante consegue listar todas as palestras com título, descrição, data, horário, local, palestrante e vagas disponíveis

**Independent Test**: `npm test -- tests/integracao/palestras.test.ts` passa com banco em memória; os 3 acceptance scenarios da spec.md estão cobertos

### Testes para User Story 1

> **Escrever ANTES da implementação; verificar que FALHAM antes de implementar**

- [x] T010 [US1] Write failing integration tests in `tests/integracao/palestras.test.ts` covering the 3 acceptance scenarios from spec.md US1: (1) list returns all palestras with all fields including `vagas_disponiveis`; (2) palestra with `vagas_disponiveis = 0` appears in list with zero; (3) empty list returns `{ palestras: [] }` without error — test setup: in `beforeEach`, create `const banco = new Database(':memory:')`, call `executarMigracoes(banco)`, then `const app = criarApp(banco)`; use `app.inject({ method: 'GET', url: '/palestras' })` for HTTP-level assertions; call `await app.close()` in `afterEach`

### Implementação da User Story 1

- [x] T011 [US1] Implement `buscarTodas(banco: Database): Palestra[]` in `src/palestras/repositorio.ts` using `banco.prepare('SELECT id, titulo, descricao, data, horario, local, palestrante, vagas_total, vagas_disponiveis FROM palestras').all()` — define and export `Palestra` type from this module (Princípio III: nomes em português)
- [x] T012 [US1] Implement `registrarRotasPalestras(app: FastifyInstance, banco: Database): void` in `src/palestras/rotas.ts`: register `GET /palestras` handler that calls `buscarTodas(banco)` and returns `{ palestras }` with status 200
- [x] T013 [US1] Register palestras plugin in `src/server.ts` by importing and calling `registrarRotasPalestras(app, banco)` after `executarMigracoes`; confirm `npm test -- tests/integracao/palestras.test.ts` passes (all 3 scenarios green)

**Checkpoint**: US1 funcional e testada — MVP entregável

---

## Phase 4: User Story 2 — Inscrever-se em uma Palestra (Priority: P2)

**Goal**: Participante consegue se inscrever em palestra com vagas; sistema impede inscrição sem vagas e duplicata; first-come-first-served na última vaga (FR-002 a FR-005)

**Independent Test**: `npm test -- tests/integracao/inscricoes.test.ts` passa cobrindo cenários de sucesso, sem vagas e duplicata

### Testes para User Story 2

> **Escrever ANTES da implementação; verificar que FALHAM antes de implementar**

- [x] T014 [US2] Write failing integration tests in `tests/integracao/inscricoes.test.ts` (create file) — test setup: same pattern as T010 (`criarApp(banco)` per suite, `app.inject()` for HTTP calls) — cover: (1) successful enrollment decrements `vagas_disponiveis` by 1 and returns 201 `{ id, palestra_id, email, criada_em }`; (2) enrollment on palestra with `vagas_disponiveis = 0` returns 422 `{ "erro": "Sem vagas disponíveis" }`; (3) second enrollment with same email returns 409 `{ "erro": "Participante já inscrito nesta palestra" }`; (4) enrolling in non-existent `palestra_id` returns 404; (5) POST with missing email field returns 400; (6) POST with invalid email format (e.g. `"nao-e-email"`) returns 400

### Implementação da User Story 2

- [x] T015 [US2] Implement `inscrever(banco: Database, palestraId: number, email: string): Inscricao` in `src/inscricoes/repositorio.ts`: wrap logic in `banco.transaction()` with `BEGIN IMMEDIATE` semantics (research.md); (a) SELECT palestra — throw `PalestraNaoEncontrada` if missing; (b) check `vagas_disponiveis > 0` — throw `SemVagas` if not; (c) INSERT into inscricoes with `criada_em = new Date().toISOString()` — catch SQLITE UNIQUE constraint error and throw `InscricaoDuplicada`; (d) UPDATE palestras SET `vagas_disponiveis = vagas_disponiveis - 1` WHERE id = palestraId; return inserted row — export all error classes and `Inscricao` type (Princípio III: nomes em português)
- [x] T016 [US2] Implement `POST /palestras/:id/inscricoes` route in `src/inscricoes/rotas.ts`: add to `registrarRotasInscricoes(app, banco)` function; use Fastify JSON Schema on body `{ type: 'object', required: ['email'], properties: { email: { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' } } }` — use `pattern` (not `format: 'email'`) because Fastify's AJV 8 ignores `format` keywords without `ajv-formats` (Princípio IV: no extra dep); parse `:id` as integer (400 if not a positive integer); call `inscrever(banco, id, email)`; map errors to response `{ "erro": "<mensagem>" }`: `PalestraNaoEncontrada` → 404 `"Palestra não encontrada"`, `SemVagas` → 422 `"Sem vagas disponíveis"`, `InscricaoDuplicada` → 409 `"Participante já inscrito nesta palestra"`; return 201 with `Inscricao` object
- [x] T017 [US2] Register inscricoes plugin in `src/server.ts` by importing and calling `registrarRotasInscricoes(app, banco)`; confirm `npm test -- tests/integracao/inscricoes.test.ts` passes for US2 scenarios

**Checkpoint**: US1 + US2 funcionais e testadas

---

## Phase 5: User Story 3 — Cancelar Inscrição (Priority: P3)

**Goal**: Participante cancela inscrição ativa; vaga é devolvida; sistema rejeita cancelamento de inscrição inexistente (FR-006 a FR-009)

**Independent Test**: `npm test` passa com todos os cenários de cancelamento cobertos

### Testes para User Story 3

> **Escrever ANTES da implementação; verificar que FALHAM antes de implementar**

- [x] T018 [US3] Add failing integration tests in `tests/integracao/inscricoes.test.ts` — same `criarApp(banco)` / `app.inject()` setup pattern as T010/T014 — cover: (1) successful cancellation removes inscription and increments `vagas_disponiveis` by 1, returns 204 (verify via subsequent GET /palestras); (2) cancellation with unregistered email returns 404 `{ "erro": "Inscrição não encontrada" }`; (3) FR-009: cancel with email `"outro@email.com"` on palestra where only `"alice@email.com"` is enrolled — returns 404 (participant cannot cancel another's inscription)

### Implementação da User Story 3

- [x] T019 [US3] Add `cancelar(banco: Database, palestraId: number, email: string): void` to `src/inscricoes/repositorio.ts`: (a) SELECT palestra — throw `PalestraNaoEncontrada` if missing; (b) DELETE FROM inscricoes WHERE palestra_id = ? AND email = ? — if `changes = 0` throw `InscricaoNaoEncontrada` (covers FR-008 and FR-009: identity is the exact email pair); (c) UPDATE palestras SET `vagas_disponiveis = vagas_disponiveis + 1` WHERE id = palestraId — wrap (b) and (c) in `banco.transaction()` to ensure atomicity
- [x] T020 [US3] Add `DELETE /palestras/:id/inscricoes` route to `registrarRotasInscricoes` in `src/inscricoes/rotas.ts`: same body schema as POST (using `pattern` not `format`); parse `:id` as positive integer (400 if invalid); call `cancelar(banco, id, email)`; map errors to `{ "erro": "<mensagem>" }`: `PalestraNaoEncontrada` → 404 `"Palestra não encontrada"`, `InscricaoNaoEncontrada` → 404 `"Inscrição não encontrada"`; return 204 no content; confirm `npm test` passes (all stories green)

**Checkpoint**: Todas as user stories funcionais e testadas

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Qualidade final e validação manual completa

- [x] T021 [P] Create `seeds/palestras.ts`: script that calls `abrirBanco('dev.db')`, `executarMigracoes`, and inserts sample palestras (at least 2, one with 2 vagas and one with 0 vagas) for manual quickstart.md validation — add `"seed": "node --experimental-strip-types seeds/palestras.ts"` to package.json scripts
- [x] T022 Run quickstart.md validation: start server with `npm run dev`, run `npm run seed`, execute all 9 curl scenarios from `specs/001-inscricoes-palestras/quickstart.md` and verify expected HTTP statuses and response bodies

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sem dependências — pode iniciar imediatamente
- **Phase 2 (Foundational)**: Depende da conclusão de T001–T006
- **Phases 3–5 (User Stories)**: Todas dependem da conclusão da Phase 2
  - Podem ser executadas sequencialmente (P1 → P2 → P3) por um único desenvolvedor
  - Ou em paralelo por equipe (uma story por desenvolvedor)
- **Phase 6 (Polish)**: Depende da conclusão de todas as user stories

### User Story Dependencies

- **US1 (P1)**: Inicia após Phase 2 — sem dependências em outras stories
- **US2 (P2)**: Inicia após Phase 2 — `src/inscricoes/repositorio.ts` é novo; sem conflito com US1
- **US3 (P3)**: Estende `src/inscricoes/repositorio.ts` criado na US2 — deve ser posterior à US2

### Within Each User Story

1. Testes escritos e falhando ANTES da implementação (Princípio I da constituição)
2. Repositório (acesso a dados) antes das rotas (HTTP)
3. Rotas antes do registro no servidor
4. Story completa (testes passando) antes de avançar para a próxima

### Parallel Opportunities

- T003, T004, T005, T006 podem rodar em paralelo com T002 (Phase 1)
- T007, T008, T009 podem rodar em paralelo entre si (Phase 2, arquivos diferentes)
- T010 pode rodar em paralelo com T011 (Phase 3, testes vs. repositório)
- T014 pode rodar em paralelo com T015 (Phase 4)
- T018 pode rodar em paralelo com T019 (Phase 5)
- T021 pode rodar em paralelo com T022 (Phase 6)

---

## Parallel Example: User Story 2

```bash
# Lançar em paralelo:
Task T014: "Write failing tests in tests/integracao/inscricoes.test.ts"
Task T015: "Implement inscrever() in src/inscricoes/repositorio.ts"

# Sequencialmente após T014 e T015:
Task T016: "Implement POST route in src/inscricoes/rotas.ts"
Task T017: "Register plugin in src/server.ts; confirm tests pass"
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Concluir Phase 1: Setup
2. Concluir Phase 2: Foundational (CRÍTICO — bloqueia todas as stories)
3. Concluir Phase 3: User Story 1
4. **PARAR e VALIDAR**: `npm test -- tests/integracao/palestras.test.ts` → todos passando
5. Servidor responde `GET /palestras` com lista correta

### Entrega Incremental

1. Setup + Foundational → base pronta
2. + User Story 1 → participante consulta palestras → **MVP!**
3. + User Story 2 → participante se inscreve → valor incremental
4. + User Story 3 → participante cancela → feature completa

---

## Notes

- `[P]` = arquivos diferentes, sem dependências incompletas
- `[Story]` mapeia a tarefa à user story para rastreabilidade
- Testes DEVEM falhar antes da implementação (Princípio I)
- Nomes de domínio em português em identificadores TypeScript e SQL (Princípio III)
- Sem ORM: SQL direto em todos os repositórios (Princípio II)
- Nenhuma dependência nova sem justificativa em research.md (Princípio IV)
- Commits após cada task ou grupo lógico
- Parar em qualquer checkpoint para validar a story de forma independente
