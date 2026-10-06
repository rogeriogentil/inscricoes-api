# Data Model: Lista de Espera em Palestras

**Feature**: 002-lista-espera  
**Date**: 2026-10-06

## Entidade Nova

### Espera

Representa a posição de um participante na fila de espera de uma palestra.

| Campo        | Tipo    | Nullable | Restrições                                    |
|--------------|---------|----------|-----------------------------------------------|
| `id`         | INTEGER | NÃO      | PK, AUTOINCREMENT                             |
| `palestra_id`| INTEGER | NÃO      | FK → `palestras(id)`                          |
| `email`      | TEXT    | NÃO      | Identificador do participante                 |
| `criada_em`  | TEXT    | NÃO      | ISO 8601 UTC; define a ordem FIFO na fila     |

**Restrição de unicidade**: `UNIQUE(palestra_id, email)` — um participante só pode estar
na fila de espera de uma palestra uma única vez.

**Posição na fila** (calculada, não armazenada): número de entradas com `id` inferior ao
`id` do participante + 1. Calculada em tempo de consulta via SQL:
`SELECT COUNT(*) + 1 FROM espera WHERE palestra_id = ? AND id < ?`.
O campo `criada_em` registra o instante de entrada (auditoria), mas a ordenação FIFO usa
`id` — ver research.md Decisão 2 para justificativa.

**DDL**:

```sql
CREATE TABLE IF NOT EXISTS espera (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  palestra_id  INTEGER NOT NULL REFERENCES palestras(id),
  email        TEXT    NOT NULL,
  criada_em    TEXT    NOT NULL,
  UNIQUE(palestra_id, email)
);
```

---

## Entidades Existentes (impacto desta feature)

### Inscricao (tabela `inscricoes`) — sem mudança estrutural

| Campo        | Tipo    | Restrições                     |
|--------------|---------|--------------------------------|
| `id`         | INTEGER | PK, AUTOINCREMENT              |
| `palestra_id`| INTEGER | FK → `palestras(id)`           |
| `email`      | TEXT    | Identificador do participante  |
| `criada_em`  | TEXT    | ISO 8601 UTC                   |

**Único impacto**: A função `cancelar` agora pode inserir uma linha em `inscricoes` durante
a promoção automática de um participante da fila, dentro da mesma transação.

### Palestra (tabela `palestras`) — sem mudança estrutural

`vagas_disponiveis` continua sendo a fonte de verdade para vagas disponíveis. Quando
a fila de espera está ativa (alguém na fila), `vagas_disponiveis = 0`. A promoção de um
participante da fila não altera `vagas_disponiveis` (a vaga liberada é imediatamente consumida).

---

## Relacionamentos

```
palestras 1──* inscricoes   (existente)
palestras 1──* espera       (nova)

inscricoes.palestra_id → palestras.id
espera.palestra_id     → palestras.id
```

---

## Invariantes de domínio

1. Se `vagas_disponiveis > 0`, a tabela `espera` para essa palestra DEVE estar vazia
   (não há razão para estar em espera com vagas disponíveis — FR-006).
2. O e-mail de um participante NÃO pode aparecer simultaneamente em `inscricoes` e `espera`
   para a mesma `palestra_id` (FR-004).
3. Cada operação de cancelamento libera exatamente uma vaga: ou para um participante em espera
   (via promoção) ou para o pool de vagas (`vagas_disponiveis += 1`).

---

## Transições de estado

### Ciclo de vida de um participante em relação a uma palestra

```
                 ┌──────────────┐
                 │  Sem vínculo │
                 └──────┬───────┘
                        │ POST /inscricoes
           ┌────────────┴────────────┐
           │ vagas > 0               │ vagas = 0
           ▼                         ▼
    ┌─────────────┐           ┌─────────────┐
    │  Inscrito   │           │  Em espera  │
    └──────┬──────┘           └──────┬──────┘
           │ DELETE /inscricoes       │ DELETE /espera
           ▼                         ▼
    ┌──────────────┐          ┌──────────────┐
    │ Sem vínculo  │          │ Sem vínculo  │
    │ (+promove    │          └──────────────┘
    │  1º da fila) │
    └──────────────┘
```
