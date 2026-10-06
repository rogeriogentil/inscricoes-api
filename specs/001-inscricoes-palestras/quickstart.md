# Quickstart & Validation Guide: Inscrições em Palestras

**Feature**: 001-inscricoes-palestras
**Date**: 2026-10-06

Este guia descreve como validar end-to-end que a feature funciona corretamente,
tanto via testes automatizados quanto via chamadas HTTP manuais.

---

## Pré-requisitos

- Node.js 22 LTS instalado (`node --version` → `v22.x.x`)
- Repositório clonado e branch `001-inscricoes-palestras` ativa
- Dependências instaladas: `npm install`

---

## Testes Automatizados (validação primária)

Os testes de integração verificam todas as regras de negócio com banco SQLite
em memória (`:memory:`). Nenhum servidor precisa estar rodando.

```bash
npm test
```

**Saída esperada**: todos os testes passando, cobrindo:

| Cenário                                               | FR coberta |
|-------------------------------------------------------|------------|
| Lista palestras com vagas disponíveis corretas        | FR-001     |
| Lista vazia quando não há palestras                   | FR-001     |
| Inscrição bem-sucedida decrementa vagas               | FR-002, FR-005 |
| Erro ao inscrever em palestra sem vagas               | FR-003     |
| Erro ao inscrever duplicado (mesmo e-mail)            | FR-004     |
| Cancelamento bem-sucedido devolve vaga                | FR-006, FR-007 |
| Erro ao cancelar inscrição inexistente                | FR-008     |
| Erro ao cancelar inscrição de outra palestra          | FR-008     |
| Concorrência: only one wins na última vaga            | FR-005     |

Para rodar apenas os testes de inscrições:

```bash
npm test -- tests/integracao/inscricoes.test.ts
```

---

## Validação Manual (servidor HTTP)

### 1. Iniciar o servidor

```bash
npm run dev
```

Esperado: `Servidor rodando em http://localhost:3000`

### 2. Popular dados de teste (fixture manual)

> As palestras são pré-cadastradas. Use um script seed ou insira diretamente
> via SQLite CLI para os testes manuais abaixo.

```bash
# Inserir palestra com 2 vagas (exemplo)
sqlite3 dev.db "
  INSERT INTO palestras (titulo, descricao, data, horario, local, palestrante, vagas_total, vagas_disponiveis)
  VALUES ('IA na Prática', 'Workshop hands-on', '2026-11-10', '14:00', 'Sala 101', 'Prof. Carlos', 2, 2);
"
```

Anotar o `id` retornado (provavelmente `1`).

### 3. Cenário: Consultar palestras (FR-001)

```bash
curl -s http://localhost:3000/palestras | jq .
```

**Esperado**: array com a palestra inserida; `vagas_disponiveis: 2`.

### 4. Cenário: Inscrição bem-sucedida (FR-002)

```bash
curl -s -X POST http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@exemplo.com"}' | jq .
```

**Esperado**: HTTP 201 com `{ "id": 1, "palestra_id": 1, "email": "alice@exemplo.com", "criada_em": "..." }`

Verificar decremento de vagas:

```bash
curl -s http://localhost:3000/palestras | jq '.[0].vagas_disponiveis'
# Esperado: 1
```

### 5. Cenário: Inscrição duplicada (FR-004)

```bash
curl -s -X POST http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@exemplo.com"}' | jq .
```

**Esperado**: HTTP 409 com `{ "erro": "Participante já inscrito nesta palestra" }`

### 6. Cenário: Sem vagas (FR-003)

```bash
# Inscrever segundo participante (ocupa a última vaga)
curl -s -X POST http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@exemplo.com"}' | jq .
# Esperado: 201

# Tentar inscrever terceiro
curl -s -X POST http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email": "carol@exemplo.com"}' | jq .
```

**Esperado**: HTTP 422 com `{ "erro": "Sem vagas disponíveis" }`

### 7. Cenário: Cancelamento bem-sucedido (FR-006, FR-007)

```bash
curl -s -X DELETE http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@exemplo.com"}'
# Esperado: HTTP 204 (sem corpo)

# Confirmar devolução de vaga
curl -s http://localhost:3000/palestras | jq '.[0].vagas_disponiveis'
# Esperado: 1
```

### 8. Cenário: Cancelar inscrição inexistente (FR-008)

```bash
curl -s -X DELETE http://localhost:3000/palestras/1/inscricoes \
  -H "Content-Type: application/json" \
  -d '{"email": "naoexiste@exemplo.com"}' | jq .
```

**Esperado**: HTTP 404 com `{ "erro": "Inscrição não encontrada" }`

### 9. Cenário: Palestra não encontrada

```bash
curl -s http://localhost:3000/palestras/9999/inscricoes \
  -X POST -H "Content-Type: application/json" \
  -d '{"email": "teste@exemplo.com"}' | jq .
```

**Esperado**: HTTP 404 com `{ "erro": "Palestra não encontrada" }`

---

## Referências

- Contratos HTTP detalhados: [contracts/http-api.md](contracts/http-api.md)
- Modelo de dados e DDL: [data-model.md](data-model.md)
- Decisões de stack e boas práticas: [research.md](research.md)
- Requisitos funcionais: [spec.md](spec.md)
