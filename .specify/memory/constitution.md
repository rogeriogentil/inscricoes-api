# API de Inscrições SECOMP UFSCar 2026 — Constituição

## Princípios Fundamentais

### I. Regras de Negócio Testadas (NÃO NEGOCIÁVEL)

Toda regra de negócio DEVE ter pelo menos um teste automatizado que a verifique
diretamente. Testes de integração ou unitários são igualmente válidos, desde que
o comportamento esperado seja explicitamente afirmado — sem testes que apenas
"não quebram" sem validar saída. Nenhuma lógica de domínio é considerada pronta
enquanto não houver um teste que falhe quando a regra for violada.

**Rationale**: A didática do projeto exige que o código seja auditável e
confiável; testes automatizados são a documentação executável das regras.

### II. Simplicidade Antes de Abstração

Toda solução DEVE começar simples. Abstrações (interfaces extras, camadas de
indireção, padrões de projeto) só PODEM ser introduzidas quando a duplicação ou
complexidade concretas já estiverem presentes no código — nunca de forma
preventiva. Três linhas semelhantes são preferíveis a uma abstração prematura.
Antes de extrair uma abstração, questione: "a remoção desta abstração tornaria
o código mais difícil de entender?"

**Rationale**: O projeto é didático; código direto é mais legível e mais fácil
de ensinar do que hierarquias de classes especulativas.

### III. Domínio em Português

Todos os identificadores que representam conceitos do domínio (entidades,
campos, serviços, casos de uso, rotas) DEVEM ser nomeados em português
brasileiro. Identificadores técnicos genéricos (variáveis de loop, helpers
de infraestrutura, nomes de framework) PODEM permanecer em inglês quando a
convenção da ferramenta assim exigir. Em caso de dúvida, o português prevalece.

Exemplos corretos: `Inscricao`, `buscarInscricaoPorId`, `/inscricoes`,
`StatusInscricao`.
Exemplos incorretos: `Enrollment`, `findEnrollmentById`.

**Rationale**: Aproximar o código da língua dos usuários e contribuidores
reduz a distância conceitual e torna o projeto acessível a estudantes
brasileiros sem fluência técnica em inglês.

### IV. Dependências Justificadas

Nenhuma dependência nova (biblioteca, framework, serviço externo) PODE ser
adicionada ao projeto sem que o plano de implementação associado contenha
uma justificativa explícita respondendo: (a) qual problema ela resolve,
(b) por que uma solução nativa ou existente não é suficiente, e (c) qual o
custo de removê-la no futuro. Dependências de desenvolvimento (lint, test
runner) seguem a mesma regra.

**Rationale**: Em projetos didáticos, dependências desnecessárias obscurecem
o aprendizado e aumentam o custo de manutenção; a justificativa força
reflexão deliberada antes de qualquer adição.

## Restrições de Desenvolvimento

- O projeto é **intencionalmente pequeno**: escopo limitado ao domínio de
  inscrições para o evento SECOMP UFSCar 2026.
- A API DEVE ser funcional sem autenticação complexa no estágio inicial;
  segurança pode ser adicionada mediante princípio IV.
- O código de produção e os testes DEVEM ser escritos na mesma linguagem/runtime
  escolhida na especificação inicial do projeto.
- Configuração de ambiente DEVE ser via variáveis de ambiente; nenhum segredo
  PODE ser versionado.

## Processo de Contribuição

- Toda mudança de comportamento DEVE incluir testes que cubram o caso de uso
  alterado (princípio I).
- Antes de abrir uma PR/commit com nova dependência, a justificativa (princípio IV)
  DEVE constar na descrição da PR ou no plano de implementação vinculado.
- O revisor DEVE verificar conformidade com os quatro princípios; não conformidades
  bloqueiam o merge.
- Refatorações puramente internas não precisam de aprovação prévia, desde que
  todos os testes continuem passando.

## Governance

Esta constituição tem precedência sobre convenções implícitas e preferências
individuais. Emendas DEVEM:

1. Incrementar a versão conforme semver de governança (MAJOR para remoção/redefinição
   de princípio; MINOR para novo princípio ou seção; PATCH para clarificações).
2. Registrar a data de emenda em `LAST_AMENDED_DATE`.
3. Ser aprovadas pelo responsável do projeto antes de entrarem em vigor.

Toda PR/revisão de código DEVE verificar conformidade com esta constituição.

**Version**: 1.0.0 | **Ratified**: 2026-10-04 | **Last Amended**: 2026-10-04
