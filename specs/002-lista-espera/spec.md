# Feature Specification: Lista de Espera em Palestras

**Feature Branch**: `002-lista-espera`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "Quando uma palestra lota, o participante entra numa lista de espera. Se alguém cancelar, o primeiro da fila é inscrito automaticamente."

## Clarifications

### Session 2026-10-06

- Q: Após entrar na lista de espera, o participante precisa de uma forma de consultar sua posição atual na fila em um momento posterior (já que a posição muda conforme outros saem)? → A: Sim — novo endpoint dedicado para consultar posição atual.
- Q: O endpoint de listagem de palestras (`GET /palestras`) deve exibir quantas pessoas estão atualmente na lista de espera de cada palestra? → A: Não — contagem da fila não é exposta na listagem geral; endpoint existente não muda.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Entrar na Lista de Espera (Priority: P1)

Um participante tenta se inscrever em uma palestra que já está com todas as vagas
preenchidas. Em vez de receber um erro de "sem vagas", o participante é adicionado à
lista de espera e recebe uma confirmação com sua posição na fila.

**Why this priority**: É o ponto de entrada de toda a feature; sem ela, a lista de espera
não existe. Entrega valor direto ao participante que chegou tarde e ainda quer garantir
sua vaga se houver desistência.

**Independent Test**: Pode ser testada tentando se inscrever em uma palestra lotada e
verificando que a resposta confirma a entrada na lista de espera com posição 1, 2, 3…

**Acceptance Scenarios**:

1. **Given** uma palestra sem vagas disponíveis e um participante não inscrito, **When**
   o participante solicita inscrição, **Then** ele é adicionado ao final da lista de espera
   e recebe confirmação com sua posição na fila.
2. **Given** uma palestra sem vagas com dois participantes na fila, **When** um terceiro
   solicita inscrição, **Then** ele entra na posição 3 da lista de espera.
3. **Given** um participante já na lista de espera de uma palestra, **When** tenta entrar
   novamente na mesma lista, **Then** a solicitação é recusada com mensagem de duplicata.
4. **Given** um participante já inscrito em uma palestra, **When** tenta entrar na lista
   de espera da mesma palestra, **Then** a solicitação é recusada.
5. **Given** uma palestra com vagas disponíveis, **When** o participante solicita inscrição,
   **Then** ele é inscrito diretamente (não entra na lista de espera).

---

### User Story 2 — Promoção Automática ao Cancelamento (Priority: P2)

Quando um participante inscrito cancela sua participação em uma palestra que tem pessoas
na lista de espera, o sistema promove automaticamente o primeiro da fila para uma inscrição
confirmada. A vaga liberada é imediatamente ocupada pelo próximo em espera.

**Why this priority**: É o coração da feature — sem a promoção automática, a lista de
espera seria apenas uma fila sem utilidade prática.

**Independent Test**: Pode ser testada inscrevendo um participante, lotando a palestra,
adicionando alguém na fila, então cancelando a inscrição original e verificando que o
participante da fila passa a aparecer como inscrito.

**Acceptance Scenarios**:

1. **Given** uma palestra lotada com ao menos um participante na lista de espera, **When**
   um participante inscrito cancela, **Then** o primeiro da lista de espera é automaticamente
   inscrito na palestra e removido da fila; o número de vagas disponíveis permanece zero.
2. **Given** uma palestra lotada com múltiplos participantes na lista de espera, **When**
   um inscrito cancela, **Then** apenas o primeiro da fila é promovido; os demais permanecem
   na fila com suas posições atualizadas.
3. **Given** uma palestra lotada sem ninguém na lista de espera, **When** um inscrito
   cancela, **Then** a vaga é devolvida normalmente (vagas disponíveis incrementa em um)
   sem nenhuma promoção — comportamento idêntico ao atual.

---

### User Story 3 — Sair da Lista de Espera (Priority: P3)

Um participante que está na lista de espera de uma palestra pode desistir e remover
sua própria entrada da fila, liberando sua posição para que os demais avancem.

**Why this priority**: Necessário para gestão do evento; sem essa opção, participantes
que desistiram ocupariam posições na fila indefinidamente, bloqueando outros interessados.

**Independent Test**: Pode ser testada entrando na lista de espera e depois solicitando
saída, verificando que a entrada foi removida e que o participante seguinte avançou de posição.

**Acceptance Scenarios**:

1. **Given** um participante na lista de espera de uma palestra, **When** solicita saída
   da fila, **Then** sua entrada é removida e os participantes posteriores avançam de posição.
2. **Given** um participante que não está na lista de espera de uma palestra, **When**
   tenta sair da fila, **Then** recebe mensagem de erro informando que não há entrada
   a remover.

---

### User Story 4 — Consultar Posição Atual na Lista de Espera (Priority: P4)

Um participante que já está na lista de espera de uma palestra pode verificar, a qualquer
momento, sua posição atual na fila — que pode ter diminuído desde a entrada caso outros
participantes tenham desistido.

**Why this priority**: Permite ao participante saber quão próximo está de uma inscrição
confirmada e tomar uma decisão informada sobre permanecer na fila ou desistir.

**Independent Test**: Pode ser testada colocando três participantes na fila, removendo o
primeiro, e verificando que o segundo agora aparece na posição 1 ao consultar sua posição.

**Acceptance Scenarios**:

1. **Given** um participante na posição 2 da lista de espera, **When** o primeiro da fila
   sai voluntariamente, **Then** a consulta retorna posição 1 para o participante.
2. **Given** um participante que não está na lista de espera de uma palestra, **When**
   consulta sua posição nessa palestra, **Then** recebe mensagem de erro informando que
   não há entrada na fila.
3. **Given** uma palestra inexistente, **When** o participante tenta consultar sua posição,
   **Then** recebe mensagem de erro informando que a palestra não foi encontrada.

---

### Edge Cases

- O que acontece se o primeiro da lista de espera for automaticamente promovido mas já
  tiver cancelado sua entrada manualmente no mesmo instante? O sistema deve garantir
  que apenas uma promoção ocorra por cancelamento (atomicidade da operação).
- O que acontece se o participante tentar entrar na lista de espera de uma palestra
  inexistente? O sistema deve informar que a palestra não foi encontrada.
- O que acontece se o e-mail não for fornecido ou for inválido? O sistema deve recusar
  a operação com mensagem clara.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Quando uma palestra não tem vagas disponíveis, o sistema DEVE adicionar o
  participante ao final da lista de espera em vez de retornar erro de "sem vagas".
- **FR-002**: O sistema DEVE manter a ordem de chegada (FIFO) na lista de espera de
  cada palestra.
- **FR-003**: O sistema DEVE retornar ao participante sua posição na lista de espera
  no momento da entrada na fila.
- **FR-004**: O sistema DEVE impedir que um participante entre na lista de espera de
  uma palestra na qual já está inscrito.
- **FR-005**: O sistema DEVE impedir que um participante entre na lista de espera mais
  de uma vez para a mesma palestra.
- **FR-006**: O sistema DEVE impedir que um participante entre na lista de espera de
  uma palestra que ainda possui vagas disponíveis.
- **FR-007**: Quando um participante inscrito cancela, o sistema DEVE verificar se há
  participantes na lista de espera da palestra.
- **FR-008**: Se houver participantes na lista de espera, o sistema DEVE promover
  automaticamente o primeiro da fila para uma inscrição confirmada, de forma atômica
  com o cancelamento (ambos ocorrem ou nenhum ocorre).
- **FR-009**: Após a promoção automática, o número de vagas disponíveis da palestra
  DEVE permanecer inalterado (a vaga liberada pelo cancelamento é imediatamente
  ocupada pelo promovido).
- **FR-010**: O sistema DEVE permitir que um participante remova voluntariamente sua
  entrada da lista de espera de uma palestra.
- **FR-011**: O sistema DEVE retornar erro quando o participante tentar sair de uma
  lista de espera na qual não está.
- **FR-012**: O sistema DEVE disponibilizar um mecanismo para que um participante consulte
  sua posição atual na lista de espera de uma palestra a qualquer momento após entrar na fila.
- **FR-013**: O sistema DEVE impedir que um participante remova a entrada de outro
  participante da lista de espera; cada participante só pode remover sua própria entrada,
  identificada pelo par (palestra, e-mail).

### Key Entities

- **Espera**: vínculo entre um participante (e-mail) e uma palestra dentro da lista de
  espera; registra a ordem de chegada e o momento da entrada na fila.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um participante que chega após o esgotamento das vagas consegue entrar na
  lista de espera em uma única operação, sem mensagem de erro.
- **SC-002**: Ao cancelar uma inscrição em palestra com lista de espera, a promoção
  automática ocorre sem intervenção humana e é refletida imediatamente na lista de
  inscritos da palestra.
- **SC-003**: A ordem da lista de espera é estritamente respeitada: nenhum participante
  é promovido antes dos que chegaram antes dele.
- **SC-004**: 100% das regras de lista de espera (FR-001 a FR-013) têm ao menos um
  teste automatizado que falha quando a regra é violada.
- **SC-005**: O cancelamento seguido de promoção automática é atômico: nunca resulta
  em uma vaga "perdida" (nem zerada, nem duplicada).
- **SC-006**: A consulta de posição na fila retorna sempre o valor atualizado: se três
  participantes estavam na fila e o primeiro saiu, o segundo recebe posição 1 na próxima
  consulta.

## Assumptions

- O participante já existe no sistema por meio de e-mail; cadastro não é necessário.
- Não há notificação ativa ao participante promovido (e-mail, SMS, push); a promoção
  ocorre silenciosamente no sistema — consultar a lista de inscrições revela a mudança.
- A lista de espera não tem limite máximo de participantes por palestra no MVP.
- Um participante pode estar na lista de espera de várias palestras simultaneamente.
- A posição na fila não é exposta na listagem geral de palestras (`GET /palestras`
  não muda); existe um endpoint dedicado para que cada participante consulte apenas
  sua própria posição atual.
- A gestão da lista de espera (visualização completa pela organização, remoção
  administrativa) está fora do escopo desta feature.
