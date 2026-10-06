# Implementation Plan: Inscrições em Palestras

**Branch**: `001-inscricoes-palestras` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-inscricoes-palestras/spec.md`

## Summary

API REST que permite participantes da SECOMP UFSCar 2026 consultarem palestras,
se inscreverem e cancelarem inscrições, garantindo first-come-first-served para
a última vaga via transação SQLite IMMEDIATE. Identificação por e-mail no corpo
da requisição; sem autenticação.

## Technical Context

**Language/Version**: Node.js 22 LTS, TypeScript 5.x

**Primary Dependencies**: Fastify 5.x (framework HTTP), better-sqlite3 (acesso síncrono ao SQLite)

**Storage**: SQLite (arquivo local em dev/prod; `:memory:` em testes)

**Testing**: Vitest — testes de integração com banco em memória como abordagem primária

**Target Platform**: Linux server (ambiente universitário / dev local)

**Project Type**: web-service (REST API)

**Performance Goals**: Evento universitário de pequeno porte; sem metas formais de throughput

**Constraints**: Identificação sem autenticação (e-mail no body); sem paginação no MVP;
vagas máximas imutáveis após cadastro da palestra

**Scale/Scope**: ~20 palestras, ~500 participantes; dados cabem em memória

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I — Regras testadas | research.md especifica testes de integração para FR-002 a FR-009; testes com banco em memória validam constraints SQL + lógica de negócio | ✅ PASS |
| II — Simplicidade | Sem ORM, sem camadas de abstração preventiva; SQL direto via better-sqlite3; repositórios simples | ✅ PASS |
| III — Domínio em Português | Identificadores de domínio em português: `Palestra`, `Inscricao`, `vagas_disponiveis`, `/palestras`, `/inscricoes` | ✅ PASS |
| IV — Dependências justificadas | Todas as dependências documentadas em research.md com problema, alternativas e custo de remoção | ✅ PASS |

**Resultado**: Todos os gates passam. Sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/001-inscricoes-palestras/
├── plan.md              # Este arquivo (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── http-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
src/
├── banco/
│   ├── conexao.ts       # Database connection factory
│   └── migracoes.ts     # Schema creation (CREATE TABLE statements)
├── palestras/
│   ├── repositorio.ts   # SQL queries for Palestra
│   └── rotas.ts         # Fastify routes for /palestras
├── inscricoes/
│   ├── repositorio.ts   # SQL queries for Inscricao (with IMMEDIATE tx)
│   └── rotas.ts         # Fastify routes for /palestras/:id/inscricoes
└── server.ts            # Fastify app setup and startup

tests/
└── integracao/
    ├── palestras.test.ts
    └── inscricoes.test.ts
```

**Structure Decision**: Single project (Option 1). Backend-only REST API sem frontend;
domínio dividido em dois módulos (`palestras/`, `inscricoes/`) que espelham as entidades
da spec. `src/banco/` isola a infraestrutura de banco, conforme Princípio II.

## Complexity Tracking

> Nenhuma violação identificada; seção vazia.
