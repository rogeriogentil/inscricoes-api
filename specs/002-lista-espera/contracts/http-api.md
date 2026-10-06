# HTTP API Contract: Lista de Espera em Palestras

**Feature**: 002-lista-espera  
**Date**: 2026-10-06  
**Base URL**: `/palestras/:id`

---

## Endpoints modificados

### POST /palestras/:id/inscricoes — Modificado

Comportamento anterior: retornava 422 quando a palestra estava lotada.  
Novo comportamento: quando lotada, adiciona à fila de espera e retorna 202.

**Request**

```
POST /palestras/:id/inscricoes
Content-Type: application/json

{
  "email": "string"   -- obrigatório; formato: <local>@<domínio>.<tld>
}
```

**Responses**

| Status | Situação | Corpo |
|--------|----------|-------|
| 201 | Inscrito com sucesso (vagas disponíveis) | `Inscricao` |
| 202 | Adicionado à fila de espera (palestra lotada) | `EntradaEspera` |
| 400 | Corpo inválido ou email ausente/malformado | `{ "erro": string }` |
| 404 | Palestra não encontrada | `{ "erro": string }` |
| 409 | Já inscrito nesta palestra OU já está na fila de espera desta palestra | `{ "erro": string }` |

**Schemas**

`Inscricao` (201):
```json
{
  "id": 1,
  "palestra_id": 42,
  "email": "participante@exemplo.com",
  "criada_em": "2026-10-06T14:30:00.000Z"
}
```

`EntradaEspera` (202):
```json
{
  "id": 7,
  "palestra_id": 42,
  "email": "participante@exemplo.com",
  "posicao": 3,
  "criada_em": "2026-10-06T14:31:00.000Z"
}
```

> **Nota**: O status 422 (`SemVagas`) deixa de existir neste endpoint. O que antes era
> erro agora é tratado como entrada na fila (202).

---

### DELETE /palestras/:id/inscricoes — Comportamento interno modificado

A interface HTTP permanece idêntica. O comportamento interno é modificado: quando houver
participantes na fila de espera, o cancelamento promove automaticamente o primeiro.
A resposta 204 não muda.

---

## Endpoints novos

### DELETE /palestras/:id/espera — Sair da lista de espera

**Request**

```
DELETE /palestras/:id/espera
Content-Type: application/json

{
  "email": "string"   -- obrigatório; e-mail do participante a remover da fila
}
```

**Responses**

| Status | Situação | Corpo |
|--------|----------|-------|
| 204 | Removido da fila com sucesso | (vazio) |
| 400 | Corpo inválido ou email ausente/malformado | `{ "erro": string }` |
| 404 | Palestra não encontrada OU participante não está na fila desta palestra | `{ "erro": string }` |

---

### GET /palestras/:id/espera/posicao — Consultar posição atual na fila

**Request**

```
GET /palestras/:id/espera/posicao?email=participante%40exemplo.com
```

Query parameter:

| Parâmetro | Tipo   | Obrigatório | Descrição |
|-----------|--------|-------------|-----------|
| `email`   | string | Sim         | E-mail do participante |

**Responses**

| Status | Situação | Corpo |
|--------|----------|-------|
| 200 | Posição retornada com sucesso | `PosicaoEspera` |
| 400 | Email ausente ou malformado | `{ "erro": string }` |
| 404 | Palestra não encontrada OU participante não está na fila desta palestra | `{ "erro": string }` |

`PosicaoEspera` (200):
```json
{
  "posicao": 1,
  "palestra_id": 42,
  "email": "participante@exemplo.com"
}
```

> A posição é calculada em tempo real: reflete saídas voluntárias e promoções ocorridas
> desde a entrada na fila.

---

## Erros de referência

| Situação | Status | Mensagem de erro esperada |
|----------|--------|--------------------------|
| Palestra não encontrada | 404 | `"Palestra não encontrada"` |
| Já inscrito na palestra | 409 | `"Participante já inscrito nesta palestra"` |
| Já na fila de espera | 409 | `"Participante já está na lista de espera desta palestra"` |
| Não está na fila | 404 | `"Entrada na lista de espera não encontrada"` |
| Email inválido/ausente | 400 | _(mensagem de validação AJV)_ |

---

## Endpoints não modificados

- `GET /palestras` — sem alteração (ver research.md Decisão 7)
- `GET /palestras/:id` — sem alteração (caso exista)
