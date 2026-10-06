# Data Model: Inscrições em Palestras

**Feature**: 001-inscricoes-palestras
**Date**: 2026-10-06

---

## Entidades

### Palestra

Representa uma sessão do evento SECOMP UFSCar 2026. Criada por administrador;
fora do escopo desta feature (dados pré-populados via seed/fixture).

| Campo               | Tipo SQL                  | Restrições                        | Descrição                                    |
|---------------------|---------------------------|-----------------------------------|----------------------------------------------|
| `id`                | `INTEGER`                 | `PRIMARY KEY AUTOINCREMENT`       | Identificador único                          |
| `titulo`            | `TEXT`                    | `NOT NULL`                        | Título da palestra                           |
| `descricao`         | `TEXT`                    |                                   | Descrição detalhada (pode ser NULL)          |
| `data`              | `TEXT`                    | `NOT NULL` (formato `YYYY-MM-DD`) | Data da palestra                             |
| `horario`           | `TEXT`                    | `NOT NULL` (formato `HH:MM`)      | Horário de início                            |
| `local`             | `TEXT`                    | `NOT NULL`                        | Local/sala do evento                         |
| `palestrante`       | `TEXT`                    | `NOT NULL`                        | Nome do(a) palestrante                       |
| `vagas_total`       | `INTEGER`                 | `NOT NULL`, `CHECK (vagas_total > 0)` | Capacidade máxima (imutável após cadastro) |
| `vagas_disponiveis` | `INTEGER`                 | `NOT NULL`, `CHECK (vagas_disponiveis >= 0)` | Contador de vagas livres; decrementado em inscrição, incrementado em cancelamento |

**Regras de validação**:
- `vagas_disponiveis <= vagas_total` (garantido pela lógica de negócio)
- `vagas_disponiveis` nunca negativo (CHECK constraint)
- Datas e horários armazenados como TEXT (SQLite não tem tipo DATE/TIME nativo);
  formato fixo permite ordenação lexicográfica correta

---

### Inscricao

Vínculo entre um participante (identificado por e-mail) e uma palestra.

| Campo          | Tipo SQL    | Restrições                                        | Descrição                             |
|----------------|-------------|---------------------------------------------------|---------------------------------------|
| `id`           | `INTEGER`   | `PRIMARY KEY AUTOINCREMENT`                       | Identificador único                   |
| `palestra_id`  | `INTEGER`   | `NOT NULL`, `REFERENCES palestras(id)`            | FK para a palestra                    |
| `email`        | `TEXT`      | `NOT NULL`                                        | E-mail do participante (case-insensitive tratado na aplicação) |
| `criada_em`    | `TEXT`      | `NOT NULL` (ISO 8601: `YYYY-MM-DDTHH:MM:SS.sssZ`) | Timestamp de criação da inscrição     |

**Constraints**:
- `UNIQUE(palestra_id, email)` — impede inscrição duplicada (FR-004)
- `FOREIGN KEY(palestra_id) REFERENCES palestras(id)` — rejeita inscrição em palestra inexistente

---

### Participante (não persistido)

O participante **não é uma entidade armazenada**. É identificado apenas pelo
e-mail fornecido no corpo de cada requisição. O sistema valida o e-mail e age
em seu nome sem cadastro prévio.

---

## DDL (Schema SQL)

```sql
CREATE TABLE palestras (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo             TEXT    NOT NULL,
  descricao          TEXT,
  data               TEXT    NOT NULL,
  horario            TEXT    NOT NULL,
  local              TEXT    NOT NULL,
  palestrante        TEXT    NOT NULL,
  vagas_total        INTEGER NOT NULL CHECK (vagas_total > 0),
  vagas_disponiveis  INTEGER NOT NULL CHECK (vagas_disponiveis >= 0)
);

CREATE TABLE inscricoes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  palestra_id  INTEGER NOT NULL REFERENCES palestras(id),
  email        TEXT    NOT NULL,
  criada_em    TEXT    NOT NULL,
  UNIQUE(palestra_id, email)
);
```

---

## Relacionamentos

```
palestras 1 ──── N inscricoes
```

Uma palestra pode ter N inscrições (máximo `vagas_total`). Cada inscrição
pertence a exatamente uma palestra.

---

## Transição de estado (vagas_disponiveis)

```
vagas_disponiveis = vagas_total   (estado inicial)
       │
       │ inscrição confirmada (FR-005)
       ▼
vagas_disponiveis = vagas_total - N_inscritos
       │
       │ cancelamento confirmado (FR-007)
       ▼
vagas_disponiveis = vagas_total - N_inscritos + 1
```

O decremento e incremento de `vagas_disponiveis` ocorrem **dentro de transação
SQLite IMMEDIATE** para garantir first-come-first-served (FR-005). O contador
é a fonte de verdade; não é derivado do COUNT de inscrições em tempo real.

---

## Validações de entrada (Aplicação)

| Campo   | Regra                                              | Erro                       |
|---------|----------------------------------------------------|----------------------------|
| `email` | Formato válido de e-mail (regex RFC 5322 básico)   | 400 Bad Request            |
| `email` | Não vazio                                          | 400 Bad Request            |
| `:id`   | Inteiro positivo                                   | 400 Bad Request            |
| `:id`   | Palestra existente no banco                        | 404 Not Found              |
