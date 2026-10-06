# Implementation Plan: Lista de Espera em Palestras

**Branch**: `002-lista-espera` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-lista-espera/spec.md`

## Summary

Quando uma palestra lota, o participante é adicionado a uma fila de espera FIFO (em vez de
receber erro). Ao cancelar uma inscrição, o sistema promove automaticamente o primeiro da fila
para inscrito — em uma única transação atômica. Novos endpoints permitem sair da fila e
consultar a posição atual. Nenhuma dependência nova é necessária.

## Technical Context

**Language/Version**: Node.js 22 LTS com TypeScript 6.x (`--experimental-strip-types`)

**Primary Dependencies**: Fastify 5.x, better-sqlite3 13.x (já no projeto; sem adições)

**Storage**: SQLite — nova tabela `espera` adicionada via migração incremental

**Testing**: Vitest 3.x com banco `:memory:` e padrão `criarApp(banco)` + `app.inject()`

**Target Platform**: Linux server (processo único Node.js 22)

**Project Type**: Web service REST (Fastify)

**Performance Goals**: Evento universitário; volume baixo. Sem metas numéricas formais.

**Constraints**: Operação cancelar + promover DEVE ser atômica via `banco.transaction()`.

**Scale/Scope**: Única aplicação, sem front-end, sem autenticação.

## Constitution Check

| Princípio | Status | Observação |
|-----------|--------|------------|
| I. Regras Testadas | ✅ | 13 FRs cobertos por testes (ver quickstart.md SC-004) |
| II. Simplicidade | ✅ | Sem dependências novas; sem abstrações extras |
| III. Português | ✅ | `Espera`, `entrarNaFila`, `sairDaFila`, `consultarPosicao` |
| IV. Dependências Justificadas | ✅ | Nenhuma nova dependência (ver research.md Decisão 1) |
| V. Camadas | ✅ | Esta PR inclui refatoração completa: `src/domain/`, `src/api/`, `src/infra/`. Todos os módulos (inscricoes, palestras, espera) migram na mesma PR. |

## Project Structure

### Documentation (this feature)

```text
specs/002-lista-espera/
├── plan.md              ← este arquivo
├── research.md          ← decisões técnicas
├── data-model.md        ← modelo de dados
├── quickstart.md        ← guia de validação
├── contracts/
│   └── http-api.md      ← contratos HTTP
└── tasks.md             ← gerado por /speckit-tasks
```

### Source Code

Estrutura pós-refatoração (Princípio V — esta PR migra todos os módulos):

```text
src/
├── domain/
│   ├── inscricoes.ts   (NOVO — tipos Inscricao + erros: PalestraNaoEncontrada, SemVagas,
│   │                            InscricaoDuplicada, InscricaoNaoEncontrada)
│   ├── palestras.ts    (NOVO — tipo Palestra)
│   └── espera.ts       (NOVO — tipo Espera + erros: EsperaNaoEncontrada, JaNaFila, JaInscrito)
├── infra/
│   ├── banco/
│   │   ├── conexao.ts       (MOVER de src/banco/conexao.ts — sem mudança de conteúdo)
│   │   └── migracoes.ts     (MOVER de src/banco/migracoes.ts + adicionar tabela espera)
│   ├── inscricoes/
│   │   └── repositorio.ts   (MOVER de src/inscricoes/repositorio.ts + modificar cancelar)
│   ├── palestras/
│   │   └── repositorio.ts   (MOVER de src/palestras/repositorio.ts — sem mudança de conteúdo)
│   └── espera/
│       └── repositorio.ts   (NOVO — entrarNaFila, sairDaFila, consultarPosicao)
├── api/
│   ├── inscricoes/
│   │   └── rotas.ts         (MOVER de src/inscricoes/rotas.ts + modificar POST handler)
│   ├── palestras/
│   │   └── rotas.ts         (MOVER de src/palestras/rotas.ts — sem mudança de conteúdo)
│   └── espera/
│       └── rotas.ts         (NOVO — DELETE /palestras/:id/espera, GET /espera/posicao)
└── server.ts                (MODIFICAR — atualizar imports + registrar registrarRotasEspera)

tests/
└── integracao/
    ├── inscricoes.test.ts  (MODIFICAR — atualizar imports para novo caminho; 422→202)
    ├── palestras.test.ts   (MODIFICAR — atualizar imports para novo caminho)
    └── espera.test.ts      (NOVO — cobertura dos 13 FRs)
```

**Dependências entre camadas** (conforme Princípio V):
- `domain/*` → não importa nada interno ao projeto
- `infra/*/repositorio.ts` → importa de `domain/*` (tipos, erros)
- `api/*/rotas.ts` → importa **apenas** de `domain/*` (tipos, erros); funções de repositório são recebidas por injeção de parâmetro — nunca importadas de `infra/` diretamente (`api → infra ❌`)
- `server.ts` → importa de `api/*/rotas.ts` **e** de `infra/*/repositorio.ts`; parcializa cada função com `banco` e injeta em `registrarRotas*(app, { fn1, fn2, ... })`

---

## Detalhamento das modificações

### Fase 0 — Refatoração de camadas (pré-requisito)

Antes das user stories, mover o código existente para a nova estrutura. Apenas renomeação de
arquivos e atualização de imports — sem mudança de comportamento.

| De | Para | Conteúdo |
|----|------|----------|
| `src/banco/conexao.ts` | `src/infra/banco/conexao.ts` | sem mudança |
| `src/banco/migracoes.ts` | `src/infra/banco/migracoes.ts` | + tabela espera (ver abaixo) |
| `src/palestras/repositorio.ts` | `src/infra/palestras/repositorio.ts` | sem mudança de lógica |
| `src/palestras/rotas.ts` | `src/api/palestras/rotas.ts` | sem mudança de lógica |
| `src/inscricoes/repositorio.ts` | `src/infra/inscricoes/repositorio.ts` | + modificar cancelar |
| `src/inscricoes/rotas.ts` | `src/api/inscricoes/rotas.ts` | + modificar POST handler |

Tipos e classes de erro extraídos dos repositórios existentes para `src/domain/`:

**`src/domain/palestras.ts`** (extraído de `src/palestras/repositorio.ts`):
```typescript
export type Palestra = { id: number; titulo: string; descricao: string; data: string;
  horario: string; local: string; palestrante: string; vagas_total: number;
  vagas_disponiveis: number }
```

**`src/domain/inscricoes.ts`** (extraído de `src/inscricoes/repositorio.ts`):
```typescript
export type Inscricao = { id: number; palestra_id: number; email: string; criada_em: string }
export class PalestraNaoEncontrada extends Error {}
export class SemVagas extends Error {}
export class InscricaoDuplicada extends Error {}
export class InscricaoNaoEncontrada extends Error {}
```

**`src/domain/espera.ts`** (novo — para a feature):
```typescript
export type Espera = { id: number; palestra_id: number; email: string; posicao: number; criada_em: string }
export class EsperaNaoEncontrada extends Error {}
export class JaNaFila extends Error {}
export class JaInscrito extends Error {}
```

> **Nota**: `PalestraNaoEncontrada` é importada de `src/domain/inscricoes.ts` tanto em
> `infra/inscricoes/` quanto em `infra/espera/` — não duplicar a classe.

Atualizar `src/server.ts`: imports de `./infra/banco/...` e `./api/*/rotas.js`.
Atualizar `tests/integracao/*.test.ts`: imports dos novos caminhos.

---

### `src/infra/banco/migracoes.ts` (+ tabela espera)

Adicionar ao `banco.exec(...)` existente:

```sql
CREATE TABLE IF NOT EXISTS espera (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  palestra_id  INTEGER NOT NULL REFERENCES palestras(id),
  email        TEXT    NOT NULL,
  criada_em    TEXT    NOT NULL,
  UNIQUE(palestra_id, email)
);
```

### `src/infra/espera/repositorio.ts` (novo)

Importa tipos/erros de `../../domain/espera.js` e `../../domain/inscricoes.js`.

Funções:
- `entrarNaFila(banco, palestraId, email): Espera`
  1. Verifica palestra existe → `PalestraNaoEncontrada`
  2. Verifica participante não está em `inscricoes` → `JaInscrito`
  3. INSERT em `espera` (UNIQUE constraint → `JaNaFila`)
  4. Calcula posição via COUNT de entradas anteriores + 1
  5. Retorna `Espera` com posição calculada
- `sairDaFila(banco, palestraId, email): void`
  1. Verifica palestra existe → `PalestraNaoEncontrada`
  2. DELETE de `espera` WHERE palestra_id = ? AND email = ?
  3. Se changes = 0 → `EsperaNaoEncontrada`
- `consultarPosicao(banco, palestraId, email): Espera`
  1. Verifica palestra existe → `PalestraNaoEncontrada`
  2. SELECT posição calculada (COUNT de criada_em anteriores + 1)
  3. Se email não encontrado → `EsperaNaoEncontrada`

### `src/infra/inscricoes/repositorio.ts` (modificado)

Importa tipos/erros de `../../domain/inscricoes.js`.

Alteração na função `cancelar`:

```typescript
export type ResultadoCancelamento = { promovido: string | null }

export function cancelar(banco, palestraId, email): ResultadoCancelamento {
  return banco.transaction(() => {
    // 1. Verificar palestra (existente)
    // 2. DELETE de inscricoes (existente; changes = 0 → InscricaoNaoEncontrada)
    // 3. NOVO: buscar primeiro da fila de espera
    const proximo = banco
      .prepare('SELECT id, email FROM espera WHERE palestra_id = ? ORDER BY id ASC LIMIT 1')
      .get(palestraId) as { id: number; email: string } | undefined

    if (proximo) {
      banco.prepare('DELETE FROM espera WHERE id = ?').run(proximo.id)
      banco.prepare('INSERT INTO inscricoes (palestra_id, email, criada_em) VALUES (?, ?, ?)')
           .run(palestraId, proximo.email, new Date().toISOString())
      return { promovido: proximo.email }
    } else {
      banco.prepare('UPDATE palestras SET vagas_disponiveis = vagas_disponiveis + 1 WHERE id = ?')
           .run(palestraId)
      return { promovido: null }
    }
  })()
}
```

### `src/api/inscricoes/rotas.ts` (modificado)

Importa **apenas** de `../../domain/inscricoes.js` e `../../domain/espera.js`.
Funções de repositório chegam injetadas via parâmetro — **sem** import de `infra/`.

```typescript
export function registrarRotasInscricoes(app, { inscrever, cancelar, entrarNaFila }): void
```

Handler `POST /palestras/:id/inscricoes`:
- Capturar `SemVagas` → chamar `entrarNaFila(palestraId, email)` → 202
- Capturar `JaInscrito` e `JaNaFila` → 409

Handler `DELETE /palestras/:id/inscricoes`:
- `cancelar` retorna `ResultadoCancelamento` — ignorar o valor (resposta continua 204)

### `src/api/espera/rotas.ts` (novo)

Importa **apenas** de `../../domain/espera.js` e `../../domain/inscricoes.js`.
Funções injetadas via parâmetro — **sem** import de `infra/`.

```typescript
export function registrarRotasEspera(app, { sairDaFila, consultarPosicao }): void {
  app.delete('/palestras/:id/espera', { schema: { body: schemaEmail } }, async (req, reply) => {
    // sairDaFila(palestraId, email) → 204 | 404 | 400
  })
  app.get('/palestras/:id/espera/posicao', { schema: { querystring: schemaEmailQuery } }, async (req, reply) => {
    // consultarPosicao(palestraId, email) → 200 | 404 | 400
  })
}
```

### `src/server.ts` (modificado)

```typescript
import { criarConexao } from './infra/banco/conexao.js'
import { executarMigracoes } from './infra/banco/migracoes.js'
import { inscrever, cancelar } from './infra/inscricoes/repositorio.js'
import { buscarTodas } from './infra/palestras/repositorio.js'
import { entrarNaFila, sairDaFila, consultarPosicao } from './infra/espera/repositorio.js'
import { registrarRotasInscricoes } from './api/inscricoes/rotas.js'
import { registrarRotasPalestras } from './api/palestras/rotas.js'
import { registrarRotasEspera } from './api/espera/rotas.js'

// injeção — parcializa cada função com banco:
registrarRotasInscricoes(app, {
  inscrever:    (id, email) => inscrever(banco, id, email),
  cancelar:     (id, email) => cancelar(banco, id, email),
  entrarNaFila: (id, email) => entrarNaFila(banco, id, email),
})
registrarRotasPalestras(app, {
  buscarTodas: () => buscarTodas(banco),
})
registrarRotasEspera(app, {
  sairDaFila:       (id, email) => sairDaFila(banco, id, email),
  consultarPosicao: (id, email) => consultarPosicao(banco, id, email),
})
```

### `tests/integracao/espera.test.ts` (novo)

Padrão idêntico ao `inscricoes.test.ts` com imports dos novos caminhos:
- `beforeEach`: `new Database(':memory:')`, `executarMigracoes`, `criarApp(banco)`, `await app.ready()`
- `afterEach`: `app.close()`, `banco.close()`

Casos de teste mínimos (13 FRs — ver quickstart.md):
1. POST em palestra lotada → 202 com posicao: 1
2. Segunda entrada na fila → posicao: 2
3. Duplicata na fila → 409
4. Inscrito tenta entrar na fila → 409
5. Palestra com vaga → 201 (não 202)
6. DELETE inscrição com fila → promoção automática; vagas_disponiveis = 0
7. DELETE inscrição sem fila → vagas_disponiveis = 1
8. Múltiplos na fila → só o primeiro é promovido
9. GET posicao → retorna posição atual
10. GET posicao após saída voluntária de anterior → posição diminui
11. DELETE /espera existente → 204
12. DELETE /espera inexistente → 404
13. GET posicao não cadastrado → 404
