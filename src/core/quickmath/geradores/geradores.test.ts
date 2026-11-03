import { describe, expect, it } from 'vitest'
import { gerarCadeia } from './cadeia'
import { gerarDivisao } from './divisao'
import { gerarFracoes } from './fracoes'
import { gerarQuestao } from './index'
import { gerarMultiplicacao } from './multiplicacao'
import { gerarPorcentagem } from './porcentagem'
import { encontrar, verificarPropriedades } from './propriedades'

describe.each([
  ['multiplicacao', gerarMultiplicacao],
  ['divisao', gerarDivisao],
  ['porcentagem', gerarPorcentagem],
  ['fracoes', gerarFracoes],
  ['cadeia', gerarCadeia],
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
  it('o atalho em PT usa vírgula decimal', () => {
    expect(gerarDivisao(11, 3).atalho.pt).not.toMatch(/\d\.\d/)
  })
})

describe('frações', () => {
  it('fração do ano: abril → 9/12 = 75%, com mês a mais ou a menos entre os distratores', () => {
    const q = encontrar(gerarFracoes, 3, (q) => q.enunciado.pt.includes('abril'))
    const valores = q.opcoes.map((o) => o.valor)
    expect(q.opcoes.find((o) => o.id === q.answerId)!.valor).toBe(75)
    expect(valores.some((v) => Math.abs(v - 200 / 3) < 1e-6 || Math.abs(v - 250 / 3) < 1e-6)).toBe(true)
  })
  it('nenhum distrator de fração do ano é 0%', () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(gerarFracoes(seed, 3).opcoes.every((o) => o.valor > 0)).toBe(true)
    }
  })
})

describe('porcentagem', () => {
  it('variação percentual aparece com queda e com subida', () => {
    const certas = Array.from({ length: 100 }, (_, i) => {
      const q = gerarPorcentagem(i + 1, 3)
      return q.opcoes.find((o) => o.id === q.answerId)!.valor
    })
    expect(certas.some((v) => v < 0)).toBe(true)
    expect(certas.some((v) => v > 0)).toBe(true)
  })
})

describe('cadeia', () => {
  it('cada camada esquecida vira candidato', () => {
    const q = gerarCadeia(3, 3)
    expect(q.opcoes.filter((o) => o.erro?.pt.startsWith('Esqueceu')).length).toBeGreaterThanOrEqual(1)
  })
  it('nível 3 tem quatro camadas', () => {
    expect(gerarCadeia(3, 3).expression.split('*')).toHaveLength(4)
  })
})

describe('gerarQuestao', () => {
  it('recusa subskill inativa', () => {
    expect(() => gerarQuestao('crescimento', 1, 1)).toThrow()
  })
  it('despacha para o gerador da subskill', () => {
    expect(gerarQuestao('cadeia', 2, 9).subskill).toBe('cadeia')
  })
})
