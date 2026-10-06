export type Inscricao = {
  id: number
  palestra_id: number
  email: string
  criada_em: string
}

export class PalestraNaoEncontrada extends Error {
  constructor() {
    super('Palestra não encontrada')
  }
}

export class SemVagas extends Error {
  constructor() {
    super('Sem vagas disponíveis')
  }
}

export class InscricaoDuplicada extends Error {
  constructor() {
    super('Participante já inscrito nesta palestra')
  }
}

export class InscricaoNaoEncontrada extends Error {
  constructor() {
    super('Inscrição não encontrada')
  }
}
