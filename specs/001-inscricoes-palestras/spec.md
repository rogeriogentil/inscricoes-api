# Feature Specification: Inscrições em Palestras

**Feature Branch**: `001-inscricoes-palestras`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "Participantes da Semana da Computação se inscrevem em palestras. Cada palestra tem um número máximo de vagas. O participante pode ver as palestras, se inscrever e cancelar a inscrição."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Consultar Palestras Disponíveis (Priority: P1)

Um participante acessa o sistema e visualiza a lista de palestras da Semana da
Computação, podendo ver para cada palestra seu título, descrição e quantidade de
vagas disponíveis.

**Why this priority**: Sem ver as palestras o participante não pode tomar nenhuma
ação; é o ponto de entrada de toda a jornada.

**Independent Test**: Pode ser testada isoladamente consultando a lista de palestras
e verificando que os dados retornados são corretos e incluem a contagem de vagas.

**Acceptance Scenarios**:

1. **Given** o sistema possui palestras cadastradas, **When** o participante solicita
   a lista de palestras, **Then** recebe todas as palestras com título, descrição e
   número de vagas disponíveis.
2. **Given** uma palestra está com todas as vagas preenchidas, **When** o participante
   consulta a lista, **Then** essa palestra aparece com vagas disponíveis igual a zero.
3. **Given** nenhuma palestra está cadastrada, **When** o participante consulta a lista,
   **Then** recebe uma lista vazia sem erro.

---

### User Story 2 — Inscrever-se em uma Palestra (Priority: P2)

Um participante escolhe uma palestra com vagas disponíveis e realiza sua inscrição.
Após a inscrição, uma vaga é descontada do total disponível da palestra.

**Why this priority**: É a ação principal do sistema; entrega valor direto ao
participante e ao evento.

**Independent Test**: Pode ser testada inscrevendo um participante identificado em
uma palestra com vagas, verificando que a inscrição é registrada e as vagas diminuem.

**Acceptance Scenarios**:

1. **Given** uma palestra com vagas disponíveis e um participante identificado,
   **When** o participante solicita inscrição nessa palestra, **Then** a inscrição
   é registrada e as vagas disponíveis da palestra diminuem em uma unidade.
2. **Given** uma palestra sem vagas disponíveis, **When** o participante solicita
   inscrição, **Then** a inscrição é recusada com mensagem informando que não há vagas.
3. **Given** um participante já inscrito em uma palestra, **When** tenta se inscrever
   novamente na mesma palestra, **Then** a solicitação é recusada com mensagem
   informando inscrição duplicada.

---

### User Story 3 — Cancelar Inscrição (Priority: P3)

Um participante que já está inscrito em uma palestra pode cancelar sua inscrição.
Ao cancelar, a vaga é devolvida ao total disponível da palestra.

**Why this priority**: Necessário para gestão do evento; sem cancelamento, vagas
ocupadas por desistentes ficam bloqueadas permanentemente.

**Independent Test**: Pode ser testada cancelando uma inscrição existente e
verificando que a vaga é restituída à palestra.

**Acceptance Scenarios**:

1. **Given** um participante com inscrição ativa em uma palestra, **When** solicita
   cancelamento, **Then** a inscrição é removida e as vagas disponíveis da palestra
   aumentam em uma unidade.
2. **Given** um participante sem inscrição em determinada palestra, **When** tenta
   cancelar inscrição nessa palestra, **Then** recebe mensagem de erro informando
   que não há inscrição a cancelar.

---

### Edge Cases

- O que acontece quando dois participantes tentam se inscrever simultaneamente na
  última vaga disponível? A vaga deve ser concedida a apenas um deles.
- O que acontece se o participante tentar se inscrever em uma palestra inexistente?
  O sistema deve informar que a palestra não foi encontrada.
- O que acontece se o identificador do participante for inválido ou não fornecido?
  O sistema deve recusar a operação com mensagem clara.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE listar todas as palestras cadastradas com título, descrição
  e número de vagas disponíveis.
- **FR-002**: O sistema DEVE permitir que um participante identificado se inscreva em
  uma palestra que possua vagas disponíveis.
- **FR-003**: O sistema DEVE impedir a inscrição quando a palestra não tiver vagas
  disponíveis, retornando mensagem explicativa.
- **FR-004**: O sistema DEVE impedir inscrição duplicada do mesmo participante na
  mesma palestra, retornando mensagem explicativa.
- **FR-005**: O sistema DEVE decrementar em uma unidade as vagas disponíveis da
  palestra a cada inscrição confirmada.
- **FR-006**: O sistema DEVE permitir que um participante cancele uma inscrição ativa.
- **FR-007**: O sistema DEVE incrementar em uma unidade as vagas disponíveis da
  palestra a cada cancelamento confirmado.
- **FR-008**: O sistema DEVE retornar erro quando o participante tentar cancelar uma
  inscrição inexistente.

### Key Entities

- **Palestra**: representa uma sessão do evento; possui título, descrição, número
  máximo de vagas e número de vagas disponíveis.
- **Participante**: pessoa que interage com o sistema; identificado de forma única
  (por e-mail).
- **Inscrição**: vínculo entre um participante e uma palestra; registra a data/hora
  da inscrição.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O participante consegue visualizar todas as palestras e suas vagas
  disponíveis em uma única consulta.
- **SC-002**: O participante consegue concluir uma inscrição em palestra com vagas
  em menos de 30 segundos a partir da consulta da lista.
- **SC-003**: O sistema impede 100% das tentativas de inscrição em palestras sem
  vagas disponíveis, informando o motivo da recusa.
- **SC-004**: Após cancelamento de inscrição, a vaga é refletida imediatamente na
  lista de vagas disponíveis da palestra.
- **SC-005**: Toda regra de negócio (FR-002 a FR-008) tem ao menos um teste
  automatizado que falha quando a regra é violada (conforme constituição).

## Assumptions

- O participante já está identificado pelo sistema por meio de e-mail; autenticação
  e cadastro de participantes estão fora do escopo desta feature.
- As palestras são cadastradas previamente por um administrador; gestão de palestras
  (criar, editar, remover) está fora do escopo.
- O número máximo de vagas é definido no momento do cadastro da palestra e não muda.
- Não há lista de espera; inscrição é recusada imediatamente quando não há vagas.
- Paginação da lista de palestras não é necessária no MVP (número de palestras
  compatível com um evento universitário de pequeno porte).
