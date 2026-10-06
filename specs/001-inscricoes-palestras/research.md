# Research: Inscrições em Palestras

**Feature**: 001-inscricoes-palestras
**Date**: 2026-10-06
**Stack fornecido pelo usuário**: Node.js 22, TypeScript, Fastify, SQLite (better-sqlite3), Vitest

Todas as decisões tecnológicas foram definidas pelo usuário. Este arquivo documenta
as justificativas (conforme Princípio IV da constituição) e as boas práticas adotadas
para cada escolha.

---

## Decisão 1: Node.js 22 + TypeScript

**Decision:** Node.js 22 LTS com TypeScript 5.x como linguagem de produção.

**Rationale:**
- Node.js 22 está em LTS ativo; inclui suporte nativo experimental a TypeScript
  (`--experimental-strip-types`) e melhorias de performance no V8.
- TypeScript fornece verificação de tipos em tempo de compilação, essencial para
  um projeto didático onde os contratos de dados (Palestra, Inscrição) devem ser
  claros e verificáveis.

**Alternatives considered:**
- JavaScript puro: descartado — sem tipos, os contratos de domínio ficariam
  implícitos e difíceis de ensinar.
- Deno / Bun: descartados — ecossistema menos familiar para estudantes e menor
  quantidade de material de referência em português.

---

## Decisão 2: Fastify (framework HTTP)

**Decision:** Fastify 5.x como framework HTTP.

**Rationale:**
- Schema-first: validação de entrada via JSON Schema embutida no framework,
  sem dependência extra.
- Suporte nativo a TypeScript: tipos gerados automaticamente a partir dos schemas
  de rotas.
- Mais leve e mais rápido que Express, com API semelhante — fácil de aprender.
- Roteamento hierárquico facilita o agrupamento de rotas por domínio
  (`/palestras/:id/inscricoes`).

**Alternatives considered:**
- Express: mais conhecido, mas sem validação embutida e sem tipos nativos; exigiria
  dependências extras (joi, zod, express-validator) violando o Princípio IV.
- Hono: mais moderno, porém menos material didático disponível em português.
- Node.js http nativo: simples demais — roteamento manual aumentaria a complexidade
  acidental sem benefício didático.

---

## Decisão 3: SQLite via better-sqlite3

**Decision:** SQLite como banco de dados, acessado via `better-sqlite3`.

**Rationale:**
- SQLite requer zero infraestrutura: banco é um arquivo local, ideal para desenvolvimento
  e testes em ambiente universitário.
- `better-sqlite3` oferece API síncrona, eliminando complexidade de async/await
  no acesso a dados — mais fácil de entender e ensinar.
- Transações IMMEDIATE do SQLite garantem first-come-first-served para concorrência
  na última vaga (FR-005): a natureza síncrona + single-writer do SQLite serializa
  naturalmente as escritas.

**Alternatives considered:**
- PostgreSQL: mais robusto em produção, mas exige servidor externo; fuga do escopo
  didático.
- `node:sqlite` (built-in Node.js 22): experimental; API assíncrona mais complexa;
  ainda sem adoção consolidada.
- `better-sqlite3` vs `sqlite3` (async): a versão assíncrona adiciona callbacks/Promises
  sem benefício para carga single-process; `better-sqlite3` é mais direta para ensinar.

---

## Decisão 4: Sem ORM

**Decision:** SQL direto via `better-sqlite3`, sem ORM ou query builder.

**Rationale:**
- Alinhado ao Princípio II (Simplicidade): repositórios com SQL explícito são
  mais legíveis e educativos do que abstrações de ORM.
- SQL explícito torna visíveis as garantias de integridade (UNIQUE, CHECK, FK).
- Facilita o ensino de transações e controle de concorrência sem camadas intermediárias.

**Alternatives considered:**
- Drizzle ORM: type-safe, mas adiciona dependência e abstração que obscurece o SQL
  subjacente — viola o Princípio II.
- Knex: query builder que ainda exige conhecimento de SQL; custo sem benefício.
- Prisma: ORM completo com migrations; adiciona três dependências e conceito de
  "schema.prisma" externo ao TypeScript — complexidade injustificada para este escopo.

---

## Decisão 5: Vitest

**Decision:** Vitest como test runner.

**Rationale:**
- Configuração mínima para projetos TypeScript: funciona out-of-the-box com
  `tsconfig.json` sem transpilação extra.
- API compatível com Jest — estudantes familiarizados com Jest se adaptam rapidamente.
- Suporte nativo a módulos ES; importação de TypeScript sem necessidade de
  `ts-jest` ou `babel-jest`.

**Alternatives considered:**
- Jest: requer `ts-jest` ou `@swc/jest` para TypeScript — configuração adicional
  sem ganho funcional para este projeto.
- Mocha + Chai: requer combinação de múltiplos pacotes; mais configuração.
- Node.js test runner nativo: funcional mas sem integração nativa com TypeScript
  e com saída de relatório inferior.

---

## Decisão 6: Estratégia de testes

**Decision:** Testes de integração como abordagem primária; testes unitários apenas
para lógica pura isolada (se surgir).

**Rationale:**
- A constituição exige que toda regra de negócio (FR-002 a FR-009) tenha teste
  que falhe quando a regra é violada. Testes de integração com banco em memória
  (`':memory:'`) verificam SQL + lógica de negócio juntos, sem mocks que poderiam
  mascarar regressões.
- O banco em memória torna os testes rápidos e reproduzíveis sem estado entre suites.
- Cada teste recria o esquema e dados de fixture → isolamento total.

**Alternatives considered:**
- Mocks do banco: mais rápidos, mas não testam as constraints SQL (UNIQUE, CHECK,
  FK) — risco de falsos positivos documentado na constituição.
- Banco de arquivo separado por teste: funciona, mas adiciona complexidade de
  limpeza; banco em memória é mais simples.

---

## Decisão 7: Execução de TypeScript em desenvolvimento (sem tsx)

**Decision:** Usar `node --experimental-strip-types` (built-in Node.js 22) para executar
arquivos TypeScript diretamente no dev script e no seed script; **não adicionar `tsx`**.

**Rationale:**
- Node.js 22 já inclui suporte nativo experimental a TypeScript via `--experimental-strip-types`,
  conforme documentado na Decisão 1. Adicionar `tsx` para a mesma finalidade viola o
  Princípio IV (dependência que resolve problema já solucionado por recurso nativo).
- `--experimental-strip-types` é suficiente para scripts de desenvolvimento simples
  (server de dev, seed de banco); não há imports dinâmicos complexos nem transformações
  de decorators que exigiriam `tsx`.
- Custo de remoção: zero — o flag está no `package.json`; basta removê-lo.

**Alternatives considered:**
- `tsx`: executa TypeScript via esbuild, suporte completo; descartado — dependência
  injustificada quando o runtime nativo cobre o caso de uso.
- `ts-node`: mais antigo, mais lento; mesmo problema de dependência desnecessária.

---

## Boas Práticas Consolidadas

### Estrutura de diretórios (Princípio III — Domínio em Português)

Nomes de domínio em português nos diretórios e identificadores:
- `src/banco/` — infraestrutura de banco de dados
- `src/palestras/` — repositório e rotas do domínio Palestra
- `src/inscricoes/` — repositório e rotas do domínio Inscrição
- `tests/integracao/` — testes de integração

### Concorrência com SQLite (FR-005)

Usar `BEGIN IMMEDIATE` em transações de escrita para garantir que apenas uma
thread/request adquira o lock de escrita por vez. Como `better-sqlite3` é
síncrono e Node.js é single-threaded no event loop, requisições HTTP que chegam
concorrentemente são enfileiradas antes de acessar o banco. A transação IMMEDIATE
elimina a janela de race condition entre o SELECT de vagas e o INSERT/UPDATE.

### Banco em memória para testes

```typescript
// Em cada arquivo de teste:
const banco = new Database(':memory:')
executarMigracoes(banco)
```

Recria esquema completo antes de cada suite, sem estado compartilhado entre testes.
