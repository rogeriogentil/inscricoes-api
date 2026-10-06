# Quickstart: Lista de Espera em Palestras

**Feature**: 002-lista-espera  
**Date**: 2026-10-06

Guia de validação end-to-end. Para detalhes de contrato, ver [contracts/http-api.md](contracts/http-api.md).
Para o modelo de dados, ver [data-model.md](data-model.md).

## Pré-requisitos

```bash
node --version   # deve ser v22.x
npm install
npm run dev      # servidor em http://localhost:3000
```

## Cenários de validação

### Cenário 1 — Entrar na fila de espera

**Preparação**: crie uma palestra com 1 vaga e inscreva um participante para lotá-la.

```bash
# Criar palestra com 1 vaga
curl -s -X POST http://localhost:3000/palestras \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Demo","descricao":"","data":"2026-11-15","horario":"10:00","local":"Sala 1","palestrante":"Ana","vagas_total":1}'
# Anotar o id retornado (ex: 1)

# Inscrever o participante A (lotará a palestra)
curl -s -X POST http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email":"a@exemplo.com"}'
# Esperado: 201

# Tentar inscrever participante B (palestra lotada)
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email":"b@exemplo.com"}'
# Esperado: 202  (entrou na fila, posicao: 1)
```

**Saída esperada (202)**:
```json
{ "id": 1, "palestra_id": 1, "email": "b@exemplo.com", "posicao": 1, "criada_em": "..." }
```

---

### Cenário 2 — Promoção automática ao cancelamento

Continuando do cenário 1 (participante B está na fila, posição 1):

```bash
# Cancelar inscrição de A
curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email":"a@exemplo.com"}'
# Esperado: 204

# Verificar que B foi inscrito automaticamente
curl -s http://localhost:3000/palestras/1/inscricoes
# B deve aparecer como inscrito; fila de espera deve estar vazia

# Verificar que vagas_disponiveis continua 0 (vaga foi repassada, não liberada)
curl -s http://localhost:3000/palestras
# vagas_disponiveis: 0
```

---

### Cenário 3 — Consultar posição na fila

```bash
# Cenário: C e D entram na fila nesta ordem
curl -s -X POST http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email":"c@exemplo.com"}'
# Esperado: 202, posicao: 1

curl -s -X POST http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email":"d@exemplo.com"}'
# Esperado: 202, posicao: 2

# Consultar posição de D
curl -s "http://localhost:3000/palestras/1/espera/posicao?email=d%40exemplo.com"
# Esperado: 200, { "posicao": 2, "palestra_id": 1, "email": "d@exemplo.com" }

# C sai da fila voluntariamente
curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE http://localhost:3000/palestras/1/espera \
  -H "Content-Type: application/json" \
  -d '{"email":"c@exemplo.com"}'
# Esperado: 204

# D avança para posição 1
curl -s "http://localhost:3000/palestras/1/espera/posicao?email=d%40exemplo.com"
# Esperado: 200, { "posicao": 1, ... }
```

---

### Cenário 4 — Regras de conflito

```bash
# Tentar entrar na fila já estando inscrito
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email":"a@exemplo.com"}'
# Se A ainda está inscrito: 409

# Tentar entrar na fila duas vezes
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email":"d@exemplo.com"}'
# D já está na fila: 409
```

---

### Cenário 5 — Executar a suite de testes automatizados

```bash
npm test
# Todos os testes devem passar (incluindo os novos de espera)
```

---

## Verificação de cobertura (SC-004)

Cada FR deve ter ao menos um teste que falha ao remover a regra:

| FR | Cenário de teste correspondente |
|----|--------------------------------|
| FR-001 | Tentativa de inscrição em palestra lotada → 202 com posição |
| FR-002 | Múltiplas entradas → primeira inscrita tem posição menor |
| FR-003 | Resposta 202 inclui campo `posicao` |
| FR-004 | Inscrito tenta entrar na fila → 409 |
| FR-005 | Duplicata na fila → 409 |
| FR-006 | Palestra com vaga → inscrição direta (201, não 202) |
| FR-007 | Cancelamento com fila não vazia → promoção ocorre |
| FR-008 | Promoção atômica: cancelar + promover em uma transação |
| FR-009 | Vagas_disponiveis inalteradas após cancelamento com fila |
| FR-010 | DELETE /espera com email existente → 204 |
| FR-011 | DELETE /espera com email não cadastrado → 404 |
| FR-012 | GET /espera/posicao retorna posição atual (não original) |
| FR-013 | DELETE /espera com email errado → 404 (não remove entrada de outro) |
