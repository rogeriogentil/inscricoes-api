/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'api-nao-importa-infra',
      comment: 'Princípio V — api → infra é proibido',
      severity: 'error',
      from: { path: '^src/api' },
      to: { path: '^src/infra' },
    },
    {
      name: 'domain-nao-importa-api',
      comment: 'Princípio V — domain → api é proibido',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: '^src/api' },
    },
    {
      name: 'domain-nao-importa-infra',
      comment: 'Princípio V — domain → infra é proibido',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: '^src/infra' },
    },
    {
      name: 'infra-nao-importa-api',
      comment: 'Princípio V — infra → api é proibido',
      severity: 'error',
      from: { path: '^src/infra' },
      to: { path: '^src/api' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
}
