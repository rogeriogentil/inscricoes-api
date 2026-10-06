# HTTP API Contract: Inscrições em Palestras

**Feature**: 001-inscricoes-palestras
**Date**: 2026-10-06
**Base URL**: `http://localhost:3000` (dev)

---

## Endpoints

### 1. Listar Palestras

**FR-001** — Retorna todas as palestras com vagas disponíveis calculadas.

```
GET /palestras
```

**Response 200 OK**

```json
{
  "palestras": [
    {
      "id": 1,
      "titulo": "Introdução a Inteligência Artificial",
      "descricao": "Uma visão geral sobre IA e machine learning.",
      "data": "2026-11-10",
      "horario": "14:00",
      "local": "Auditório A",
      "palestrante": "Dra. Ana Souza",
      "vagas_total": 100,
      "vagas_disponiveis": 42
    }
  ]
}
```

| Campo               | Tipo   | Sempre presente | Descrição                              |
|---------------------|--------|-----------------|----------------------------------------|
| `id`                | number | sim             | Identificador da palestra              |
| `titulo`            | string | sim             |                                        |
| `descricao`         | string | não             | null quando não cadastrada             |
| `data`              | string | sim             | Formato `YYYY-MM-DD`                   |
| `horario`           | string | sim             | Formato `HH:MM`                        |
| `local`             | string | sim             |                                        |
| `palestrante`       | string | sim             |                                        |
| `vagas_total`       | number | sim             | Capacidade máxima                      |
| `vagas_disponiveis` | number | sim             | Vagas ainda disponíveis (>= 0)         |

**Response 200 OK (sem palestras cadastradas)**

```json
{ "palestras": [] }
```

---

### 2. Inscrever-se em uma Palestra

**FR-002, FR-003, FR-004, FR-005** — Registra inscrição do participante.

```
POST /palestras/:id/inscricoes
Content-Type: application/json
```

**Path Params**:

| Param | Tipo   | Descrição             |
|-------|--------|-----------------------|
| `id`  | number | ID da palestra        |

**Request Body**:

```json
{ "email": "participante@email.com" }
```

| Campo   | Tipo   | Obrigatório | Regra                   |
|---------|--------|-------------|-------------------------|
| `email` | string | sim         | Formato válido de e-mail |

**Responses**:

| Status | Quando                                        | Body exemplo                                                |
|--------|-----------------------------------------------|-------------------------------------------------------------|
| 201    | Inscrição criada com sucesso                  | `{ "id": 7, "palestra_id": 1, "email": "...", "criada_em": "2026-10-06T14:32:00.000Z" }` |
| 400    | E-mail ausente ou inválido                    | `{ "erro": "E-mail inválido" }`                            |
| 404    | Palestra não encontrada                       | `{ "erro": "Palestra não encontrada" }`                    |
| 409    | Participante já inscrito (duplicata)          | `{ "erro": "Participante já inscrito nesta palestra" }`    |
| 422    | Palestra sem vagas disponíveis                | `{ "erro": "Sem vagas disponíveis" }`                      |

**Response 201 Created**:

```json
{
  "id": 7,
  "palestra_id": 1,
  "email": "participante@email.com",
  "criada_em": "2026-10-06T14:32:00.000Z"
}
```

---

### 3. Cancelar Inscrição

**FR-006, FR-007, FR-008, FR-009** — Remove inscrição e devolve vaga.

```
DELETE /palestras/:id/inscricoes
Content-Type: application/json
```

**Path Params**:

| Param | Tipo   | Descrição             |
|-------|--------|-----------------------|
| `id`  | number | ID da palestra        |

**Request Body**:

```json
{ "email": "participante@email.com" }
```

> Nota: corpo em DELETE é incomum porém válido per RFC 7231. Escolhido para
> consistência com o endpoint de inscrição e por constar na spec ("corpo/parâmetro").
> Alternativa equivalente: `DELETE /palestras/:id/inscricoes?email=...`.

**Responses**:

| Status | Quando                                        | Body exemplo                                              |
|--------|-----------------------------------------------|-----------------------------------------------------------|
| 204    | Inscrição cancelada com sucesso               | (sem corpo)                                               |
| 400    | E-mail ausente ou inválido                    | `{ "erro": "E-mail inválido" }`                          |
| 404    | Palestra não encontrada                       | `{ "erro": "Palestra não encontrada" }`                  |
| 404    | Inscrição não encontrada para este e-mail     | `{ "erro": "Inscrição não encontrada" }`                 |

> **FR-009**: O sistema usa o e-mail como identificador; um participante só
> consegue cancelar sua própria inscrição pois a chave composta
> `(palestra_id, email)` garante unicidade. Não há como cancelar a inscrição
> de outro participante fornecendo o e-mail correto sem conhecê-lo.

---

## Convenções Gerais

- **Formato de datas**: `YYYY-MM-DD` (ISO 8601 date)
- **Formato de timestamps**: `YYYY-MM-DDTHH:MM:SS.sssZ` (ISO 8601 UTC)
- **Erros**: sempre `{ "erro": "<mensagem legível>" }`
- **Content-Type de resposta**: `application/json; charset=utf-8`
- **IDs de palestra inválidos** (não numérico, negativo): 400 Bad Request
- **Campos extras no body** são ignorados silenciosamente

---

## Fora do Escopo (MVP)

- Autenticação e autorização
- CRUD de palestras (admin)
- Cadastro de participantes
- Paginação de resultados
- Busca/filtro de palestras
- Lista de inscrições de um participante
