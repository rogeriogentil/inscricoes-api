export type Espera = {
  id: number
  palestra_id: number
  email: string
  posicao: number
  criada_em: string
}

export class EsperaNaoEncontrada extends Error {
  constructor() {
    super('Entrada na lista de espera não encontrada')
  }
}

export class JaNaFila extends Error {
  constructor() {
    super('Participante já está na lista de espera desta palestra')
  }
}

export class JaInscrito extends Error {
  constructor() {
    super('Participante já inscrito nesta palestra')
  }
}
