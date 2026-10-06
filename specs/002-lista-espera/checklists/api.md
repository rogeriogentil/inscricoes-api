# API Requirements Quality Checklist: Lista de Espera em Palestras

**Purpose**: Validação da qualidade dos requisitos de API — completude, clareza, consistência e cobertura de cenários de erro e comportamento atômico. Para uso em revisão de PR.
**Created**: 2026-10-06
**Feature**: [spec.md](../spec.md) · [contracts/http-api.md](../contracts/http-api.md) · [plan.md](../plan.md)

**Review Ownership**: Este checklist é um artefato de revisão de qualidade de requisitos. Marque `[x]` apenas quando o critério de qualidade dos requisitos estiver satisfeito.
**Marker Semantics**: `[x]` significa que o critério foi revisado e aprovado em termos de qualidade de requisito. Não significa que a implementação está completa.

---

## Completude do Contrato (Endpoints Modificados e Novos)

- [x] CHK001 — São ambos os schemas de resposta (201 inscrito, 202 em espera) de `POST /palestras/:id/inscricoes` completamente especificados com todos os campos em `contracts/http-api.md`? [Completeness, contracts/http-api.md]

- [x] CHK002 — A remoção do status 422 de `POST /palestras/:id/inscricoes` está documentada de forma consistente tanto em `spec.md` quanto em `contracts/http-api.md`? [Consistency, Spec §FR-001, contracts/http-api.md]

- [x] CHK003 — A mudança interna de `DELETE /palestras/:id/inscricoes` (promoção automática) está especificada — incluindo que a interface HTTP permanece 204 enquanto o comportamento interno muda? [Completeness, Spec §FR-007, FR-008, contracts/http-api.md]

- [x] CHK004 — Todos os schemas de request/response estão completamente especificados para os dois novos endpoints (`DELETE /espera` e `GET /espera/posicao`)? [Completeness, contracts/http-api.md]

- [x] CHK005 — É documentado o tipo de retorno `ResultadoCancelamento` introduzido na função `cancelar` — ou está explicitamente declarado como detalhe de implementação interna sem reflexo no contrato HTTP? [Completeness, plan.md §cancelar]

---

## Clareza e Precisão dos Requisitos

- [x] CHK006 — A distinção entre HTTP 201 (inscrito) e 202 (em espera) está vinculada a uma condição precisa e testável (`vagas_disponiveis = 0`)? [Clarity, Spec §FR-001, FR-006]

- [x] CHK007 — O campo `posicao` na resposta 202 está definido como 1-indexado e calculado em tempo real (não armazenado) — e esta definição é consistente entre `spec.md` e `data-model.md`? [Clarity, Spec §FR-003, data-model.md]

- [x] CHK008 — Os dois casos de 409 (já inscrito vs já na fila) são distinguíveis via mensagem de erro — pode um cliente programaticamente determinar qual conflito ocorreu? [Clarity, Spec §FR-004, FR-005, contracts/http-api.md §Erros de referência]

- [x] CHK009 — O `GET /espera/posicao` especifica como o e-mail é passado (query parameter com encoding de URL) e o que constitui um valor válido vs malformado? [Clarity, contracts/http-api.md]

- [x] CHK010 — Os casos de 404 dos novos endpoints (palestra não encontrada vs participante não está na fila) estão especificados — e é intencional que compartilhem o mesmo status code? [Clarity, Spec §FR-011, FR-012, contracts/http-api.md]

---

## Comportamento Atômico e FIFO (área de ênfase)

- [x] CHK011 — O invariante de atomicidade (FR-008/SC-005) é preciso o suficiente para distinguir de "melhor esforço" — nomeia especificamente que cancelamento e promoção ocorrem na mesma transação de banco? [Clarity, Spec §FR-008, SC-005, Spec §Edge Cases]

- [x] CHK012 — O critério de ordenação FIFO (FR-002) está vinculado a um atributo concreto (`criada_em`) em vez de deixado como princípio abstrato? [Clarity, Spec §FR-002, data-model.md]

- [x] CHK013 — O invariante de domínio "se a fila de espera não está vazia, `vagas_disponiveis = 0`" está declarado explicitamente na spec ou no data-model? [Completeness, Spec §FR-009, data-model.md §Invariantes]

- [x] CHK014 — A spec esclarece (ou delega explicitamente) o cenário de dois cancelamentos simultâneos com um único participante na fila — como é garantida a promoção única? [Coverage, Spec §Edge Cases, research.md Decisão 2]

- [x] CHK015 — Após cancelamento com promoção, o `vagas_disponiveis` **não** incrementa — este comportamento está declarado tanto em FR-009 quanto em SC-005 de forma consistente? [Consistency, Spec §FR-009, SC-005]

---

## Cobertura de Fluxos de Erro (área de ênfase)

- [x] CHK016 — FR-013 (proteção contra remoção de entrada de outro participante) especifica o mecanismo de proteção — está documentado que a proteção é implícita via par (palestra_id, email)? [Clarity, Spec §FR-013, Assumptions]

- [x] CHK017 — O cenário onde um participante promovido (agora inscrito) tenta executar `DELETE /espera` está coberto por um FR existente (FR-011) — ou é uma lacuna não tratada? [Edge Case, Spec §FR-011, Gap]

- [x] CHK018 — FR-006 (não entrar na fila quando há vagas) é testável via resposta HTTP observável — está documentado que a prevenção ocorre implicitamente (rota chama `inscrever` primeiro) e não via mensagem de erro explícita? [Clarity, Spec §FR-006, quickstart.md]

- [x] CHK019 — Todas as mensagens de erro em `contracts/http-api.md §Erros de referência` seguem a convenção de nomenclatura em português (Princípio III da constituição)? [Consistency, constitution.md §III, contracts/http-api.md]

---

## Critérios de Aceitação e Mensurabidade

- [x] CHK020 — Todos os critérios de sucesso (SC-001 a SC-006) são verificáveis puramente via respostas HTTP — sem acesso direto ao banco de dados? [Measurability, Spec §SC-001–SC-006]

- [x] CHK021 — SC-006 ("consulta retorna posição atual") especifica a distinção entre posição original (no momento da entrada) e posição atual (recalculada) de forma testável? [Clarity, Spec §SC-006]

---

## Dependências e Hipóteses

- [x] CHK022 — A hipótese de unicidade de `criada_em` para ordenação FIFO está documentada com sua condição de validade (Node.js single-threaded + better-sqlite3 síncrono)? [Assumption, data-model.md, research.md Decisão 2]

- [x] CHK023 — Os requisitos para `sairDaFila` (FR-010, FR-011) seguem o mesmo padrão de simetria do `cancelar` existente — mesmo verbo HTTP (DELETE), mesmo esquema de body e mesma estrutura de resposta de erro? [Consistency, contracts/http-api.md, Spec §FR-010]

---

## Notes

- Marque `[x]` apenas quando o critério de qualidade do requisito estiver satisfeito após revisão
- Itens não marcados indicam necessidade de clarificação, correção ou avaliação adicional
- `/speckit-implement` lê o estado dos checkboxes como gate e não modifica os marcadores
- `checklists/requirements.md` tem ciclo de vida separado mantido por `/speckit-specify` e `/speckit-clarify`
- Issues identificados pelo `/speckit-analyze` (C1, C2, I1, C3, A1, A2) são pontos de atenção relacionados a CHK008, CHK012, CHK016 e CHK021
