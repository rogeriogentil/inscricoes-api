# Research: Lista de Espera em Palestras

**Feature**: 002-lista-espera  
**Date**: 2026-10-06

## Decisão 1 — Sem novas dependências de runtime

**Decision**: Nenhuma biblioteca nova é necessária para implementar a lista de espera.

**Rationale**: A feature requer apenas uma nova tabela SQLite e operações de SELECT/INSERT/DELETE,
todas já suportadas pelo `better-sqlite3` existente. Nenhuma biblioteca de fila, cache ou
mensageria é necessária para o volume esperado de um evento universitário.

**Alternatives considered**: Redis, Bull queue — descartadas por serem overkill para o escopo
e violarem Princípio IV (dependência sem justificativa clara) e Princípio II (abstração prematura).

---

## Decisão 2 — Ordenação FIFO via coluna `id` (AUTOINCREMENT)

**Decision**: A posição na fila é determinada pela coluna `id` (INTEGER AUTOINCREMENT), ordenada
com `ORDER BY id ASC`. A posição de um participante é calculada via
`SELECT COUNT(*) + 1 FROM espera WHERE palestra_id = ? AND id < ?`.

**Rationale**: O `id` AUTOINCREMENT é estritamente crescente e garante ordem de inserção sem
ambiguidade. A alternativa original (`criada_em` ISO 8601) foi descartada na implementação
porque `new Date().toISOString()` tem precisão de milissegundo: dois INSERTs síncronos
no mesmo processo (comum em testes unitários com banco `:memory:`) podem obter o mesmo
timestamp, produzindo empate na ordenação e posições incorretas. O `id`, sendo controlado
pelo SQLite, nunca produz colisão. O `better-sqlite3` é síncrono e o Node.js é
single-threaded — em produção não há INSERTs concorrentes, mas o `id` mantém a correção
também em testes, sem custo adicional.

**Alternatives considered**:
- `criada_em TEXT` ISO 8601 — descartada porque timestamps de milissegundo colidem em
  testes síncronos in-process; seria válida em produção mas insegura em testes automatizados.
- Coluna `posicao INTEGER` incremental — descartada pois exigiria atualização em cadeia a
  cada saída da fila (O(n) writes vs O(1) com `id`).

---

## Decisão 3 — Cancelamento + promoção em uma única transação

**Decision**: A função `cancelar` em `src/inscricoes/repositorio.ts` é modificada para,
dentro da mesma transação `banco.transaction()`, verificar e promover o primeiro da fila de
espera quando houver participantes aguardando.

**Rationale**: `banco.transaction()` no `better-sqlite3` garante atomicidade: ou o cancelamento
e a promoção ocorrem juntos, ou nenhum dos dois. Isso satisfaz FR-008 e SC-005 sem nenhum
mecanismo externo de coordenação.

**Alternatives considered**: Two-phase approach (cancelar primeiro, promover depois em chamadas
separadas) — descartada por não ser atômica e poder resultar em vaga "perdida" se o processo
for interrompido entre as duas operações.

---

## Decisão 4 — HTTP 202 para entrada na fila de espera

**Decision**: Quando um participante é adicionado à fila de espera (em vez de inscrito),
`POST /palestras/:id/inscricoes` retorna HTTP 202 (Accepted) com o corpo da entrada na fila.
Inscrição confirmada continua retornando 201.

**Rationale**: 202 significa "a solicitação foi aceita para processamento futuro" — semantica
correta para "você está na fila, será inscrito quando houver vaga". Clientes existentes que
verificam apenas 201 saberão que não foram inscritos imediatamente. Usar 201 para ambos
criaria ambiguidade no tipo de resposta.

**Alternatives considered**: 201 para ambos com campo `tipo` discriminador no corpo — descartada
pois mescla dois recursos diferentes na mesma resposta; clientes precisariam parsear o corpo
para distinguir o comportamento.

---

## Decisão 5 — Lógica de promoção inline em `cancelar` (sem import cross-módulo)

**Decision**: A SQL de consulta e promoção da fila de espera é escrita diretamente na função
`cancelar` modificada em `src/inscricoes/repositorio.ts`, sem importar nada de `src/espera/`.

**Rationale**: Importar de `src/espera/repositorio.ts` dentro de `src/inscricoes/repositorio.ts`
criaria acoplamento bidirecional entre módulos de domínio distintos. A operação atômica de
cancelar + promover é responsabilidade do módulo de inscrições (ele "sabe" que precisa devolver
a vaga ou repassá-la). O SQL referencia a tabela `espera` diretamente — mesmo padrão já usado
em `src/inscricoes/repositorio.ts` que referencia `palestras` diretamente.

**Alternatives considered**: Função `promoverPrimeiroDaFila` exportada de `src/espera/repositorio.ts`
e importada em `src/inscricoes/repositorio.ts` — descartada pois cria dependência circular de fato
(espera depende de inscricoes para saber o tipo `Inscricao`, inscricoes dependeria de espera para
promover). Separação limpa só viria com o refactor de camadas (Princípio V, PR futuro).

---

## Decisão 6 — Endpoint de posição: `GET /palestras/:id/espera/posicao?email=`

**Decision**: A consulta de posição atual na fila usa `GET /palestras/:id/espera/posicao` com
o e-mail como query parameter.

**Rationale**: Segue REST semântico: GET em sub-recurso `posicao` dentro de `espera` de uma
palestra. E-mail no query parameter evita problemas de encoding de `@` e `.` no path segment.
Consistente com o estilo da API existente (IDs de palestra no path, dados do participante
no body/query).

**Alternatives considered**: `GET /palestras/:id/espera/:email` — descartada por problemas de
encoding de URL com caracteres especiais no e-mail.

---

## Decisão 7 — `GET /palestras` não expõe contagem da fila

**Decision**: O endpoint `GET /palestras` não é modificado. A contagem de participantes em
espera não é incluída na listagem geral de palestras.

**Rationale**: Aprovado na sessão de clarificação (Q2 → opção A). Alinha com Princípio II
(simplicidade antes de abstração) — o endpoint dedicado `GET /palestras/:id/espera/posicao`
já atende a necessidade de consulta de posição.
