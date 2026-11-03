import { describe, expect, it } from 'vitest'
import { gerarDivisao } from './divisao'
import { gerarMultiplicacao } from './multiplicacao'
import { verificarPropriedades } from './propriedades'

describe.each([
  ['multiplicacao', gerarMultiplicacao],
  ['divisao', gerarDivisao],
])('%s', (_, g) => {
  it('satisfaz as propriedades em todos os níveis', () => verificarPropriedades(g))
})

describe('multiplicação', () => {
  it('níveis 1–2 são exatos e 3–5 são estimativa', () => {
    expect(gerarMultiplicacao(1, 1).estimativa).toBe(false)
    expect(gerarMultiplicacao(1, 2).estimativa).toBe(false)
    expect(gerarMultiplicacao(1, 3).estimativa).toBe(true)
  })
  it('nível 5 tem três fatores', () => {
    expect(gerarMultiplicacao(4, 5).expression.split('*')).toHaveLength(3)
  })
})

describe('divisão', () => {
  it('nível 1 tem quociente de um dígito', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const q = gerarDivisao(seed, 1)
      const certa = q.opcoes.find((o) => o.id === q.answerId)!
      const mantissa = certa.valor / 10 ** Math.floor(Math.log10(certa.valor))
      expect(Number.isInteger(mantissa)).toBe(true)
    }
  })
})
