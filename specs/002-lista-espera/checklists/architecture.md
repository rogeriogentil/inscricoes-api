# Architecture Requirements Checklist: Lista de Espera em Palestras

**Purpose**: Validação da qualidade dos requisitos de arquitetura em camadas (Princípio V) — regras de dependência, completude da migração (Fase 0) e rastreabilidade com as user stories US1–US4.
**Created**: 2026-10-06
**Feature**: [plan.md](../plan.md) · [spec.md](../spec.md) · [data-model.md](../data-model.md)

**Review Ownership**: Este checklist é um artefato de revisão de qualidade de requisitos. Marque `[x]` apenas quando o critério de qualidade dos requisitos estiver satisfeito.
**Marker Semantics**: `[x]` significa que o critério foi revisado e aprovado em termos de qualidade de requisito. Não significa que a implementação está completa.

---

## Regras de Camadas — Completude e Precisão

- [x] CHK001 — A proibição de `domain/` importar de `api/` ou `infra/` está declarada explicitamente no plano como regra não-negociável e testável (e.g., verificável via linter ou inspeção de imports)? [Clarity, plan.md §Dependências entre camadas, Princípio V]

- [x] CHK002 — As três regras de dependência (`api→domain`, `infra→domain`, `domain→nothing`) estão especificadas de forma mensurável — é possível determinar se um import viola a regra sem executar o código? [Measurability, plan.md §Dependências entre camadas]

- [x] CHK003 — A classe `PalestraNaoEncontrada` compartilhada entre `infra/inscricoes/repositorio.ts` e `infra/espera/repositorio.ts` está especificada como originária de um único módulo (`domain/inscricoes.ts`), sem duplicação? [Completeness, plan.md §Detalhamento §domain/espera.ts]

- [x] CHK004 — O tipo `Espera` (incluindo o campo `posicao`) declarado em `domain/espera.ts` está especificado de forma consistente com a entidade `espera` em `data-model.md`? [Consistency, plan.md §domain/espera.ts, data-model.md]

- [x] CHK005 — Os tipos declarados em `domain/palestras.ts` cobrem todos os campos da entidade `Palestra` definidos em `data-model.md`? [Completeness, plan.md §domain/palestras.ts, data-model.md]

---

## Fase 0 — Completude da Migração

- [x] CHK006 — A tabela de migração no plano especifica o destino de TODOS os arquivos existentes (`src/banco/conexao.ts`, `src/banco/migracoes.ts`, `src/inscricoes/repositorio.ts`, `src/inscricoes/rotas.ts`, `src/palestras/repositorio.ts`, `src/palestras/rotas.ts`)? [Completeness, plan.md §Fase 0]

- [x] CHK007 — Para cada arquivo migrado, está claramente distinguido o que é "mover sem mudança de conteúdo" versus "mover com modificação de lógica" — de forma que um revisor saiba o que validar em cada arquivo? [Clarity, plan.md §Fase 0]

- [x] CHK008 — A necessidade de atualizar os imports em `tests/integracao/inscricoes.test.ts` e `tests/integracao/palestras.test.ts` está documentada, dado que os caminhos de origem mudam? [Completeness, plan.md §Fase 0, Gap]

- [x] CHK009 — A atualização de `src/server.ts` (imports para `./infra/banco/` e `./api/*/rotas.js`) está especificada com os caminhos concretos necessários? [Clarity, plan.md §server.ts]

- [x] CHK010 — Há especificação de que a Fase 0 (migração) deve manter todos os testes existentes passando antes de avançar para as user stories — ou seja, a Fase 0 é um increment testável independentemente? [Coverage, Gap]

---

## Rastreabilidade com User Stories

- [x] CHK011 — **US1**: Os arquivos `domain/espera.ts`, `infra/espera/repositorio.ts` e `api/inscricoes/rotas.ts` estão identificados como responsáveis por US1 no plano, com a função `entrarNaFila` rastreada até FR-001, FR-003? [Traceability, plan.md §US1, Spec §US1]

- [x] CHK012 — **US2**: A dependência de `infra/inscricoes/repositorio.ts` na tabela `espera` via inline SQL (sem importar de `infra/espera/repositorio.ts`) está especificada como decisão intencional que preserva a atomicidade? [Traceability, plan.md §cancelar, research.md Decisão 5]

- [x] CHK013 — **US3**: Os arquivos `api/espera/rotas.ts` e `infra/espera/repositorio.ts` estão mapeados explicitamente a US3 (sair da fila) e às funções `sairDaFila` / `DELETE /espera`? [Traceability, plan.md §espera/rotas.ts, Spec §US3]

- [x] CHK014 — **US4**: O endpoint `GET /espera/posicao` e a função `consultarPosicao` em `infra/espera/repositorio.ts` estão rastreados até US4 e ao FR-012? [Traceability, plan.md §consultarPosicao, Spec §US4, Spec §FR-012]

- [x] CHK015 — Os erros de domínio (`EsperaNaoEncontrada`, `JaNaFila`, `JaInscrito`, `PalestraNaoEncontrada`) estão mapeados às user stories e FRs que os disparam — nenhuma classe de erro existe sem uma user story que a utilize? [Completeness, plan.md §domain/espera.ts, Spec §FR-004, FR-005, FR-011, FR-013]

---

## Consistência entre Plano e Contratos

- [x] CHK016 — Os nomes das funções exportadas no plano (`entrarNaFila`, `sairDaFila`, `consultarPosicao`, `cancelar`) são consistentes com a terminologia das user stories na spec e com os endpoints em `contracts/http-api.md`? [Consistency, plan.md §Detalhamento, contracts/http-api.md]

- [x] CHK017 — O tipo `ResultadoCancelamento` (retorno de `cancelar`) está consistente entre `plan.md §cancelar` e os requisitos de US2 — ambos especificam que `promovido` é o e-mail promovido ou `null`? [Consistency, plan.md §cancelar, Spec §FR-007, FR-008]

- [x] CHK018 — A distinção entre arquivos movidos com e sem mudança de conteúdo está documentada de forma que um revisor de PR possa verificar cada arquivo individualmente sem ler o diff completo? [Clarity, plan.md §Fase 0]

---

## Hipóteses e Dependências

- [x] CHK019 — O mecanismo de injeção de dependência (`registrarRotas*(app, { fn1, fn2, ... })`) está especificado como o único meio pelo qual `api/*/rotas.ts` acessa funções de repositório — sem import direto de `infra/` — e essa regra está explícita e consistente com `api → infra ❌` do Princípio V? [Completeness, plan.md §Dependências entre camadas]

- [x] CHK020 — A hipótese de que `banco.transaction()` é acessado diretamente em `infra/inscricoes/repositorio.ts` (sem abstração de interface) está documentada como decisão de simplicidade compatível com Princípio II e Princípio V? [Assumption, plan.md §cancelar, research.md Decisão 3]

---

## Notes

- Marque `[x]` apenas quando o critério de qualidade do requisito estiver satisfeito após revisão
- Itens não marcados indicam necessidade de clarificação, correção ou avaliação adicional
- `/speckit-implement` lê o estado dos checkboxes como gate e não modifica os marcadores
- `checklists/requirements.md` tem ciclo de vida separado mantido por `/speckit-specify` e `/speckit-clarify`
- Este checklist complementa `api.md` (contrato HTTP) — juntos cobrem a PR completa
- Verificar CHK001/CHK002 com inspeção de imports antes de aprovar a PR de Fase 0
