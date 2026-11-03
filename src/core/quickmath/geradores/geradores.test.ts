import { describe, expect, it } from 'vitest'
import { gerarCadeia } from './cadeia'
import { gerarDivisao } from './divisao'
import { gerarFracoes } from './fracoes'
import { gerarQuestao } from './index'
import { gerarMultiplicacao } from './multiplicacao'
import { gerarPorcentagem } from './porcentagem'
import { encontrar, taxasDasHeuristicas, verificarPropriedades } from './propriedades'
import { gerarBreakeven } from './breakeven'
import { gerarCrescimento } from './crescimento'
import { gerarMediaPonderada } from './mediaPonderada'
import { gerarUnidades } from './unidades'
import { NIVEIS, type Subskill } from '../taxonomia'

describe.each([
  ['multiplicacao', gerarMultiplicacao],
  ['divisao', gerarDivisao],
  ['porcentagem', gerarPorcentagem],
  ['fracoes', gerarFracoes],
  ['cadeia', gerarCadeia],
  ['crescimento', gerarCrescimento],
  ['unidades', gerarUnidades],
  ['breakeven', gerarBreakeven],
  ['media_ponderada', gerarMediaPonderada],
])('%s', (_, g) => {
  it('satisfaz as propriedades em todos os níveis', () => verificarPropriedades(g))

  // A anti-meta do spec: acertar sem fazer a conta. Nenhum atalho de padrão
  // (valor do meio, dígitos que se repetem) pode passar de 40%; chutar dá 20%.
  it.each(NIVEIS)('nível %i não se resolve por padrão das alternativas', (nivel) => {
    for (const [nome, taxa] of Object.entries(taxasDasHeuristicas(g, nivel))) {
      expect(taxa, `${nome} no nível ${nivel}`).toBeLessThanOrEqual(0.4)
    }
  })
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
  it('a camada esquecida aparece entre as alternativas na maioria das questões', () => {
    const com = Array.from({ length: 100 }, (_, i) => gerarCadeia(i + 1, 3)).filter((q) =>
      q.opcoes.some((o) => o.erro?.pt.startsWith('Esqueceu')),
    ).length
    expect(com).toBeGreaterThanOrEqual(80)
  })
  it('nível 3 tem quatro camadas', () => {
    expect(gerarCadeia(3, 3).expression.split('*')).toHaveLength(4)
  })
})

describe('atalho', () => {
  it('estimativa mostra o arredondamento, não a conta longa', () => {
    for (const g of [gerarMultiplicacao, gerarDivisao]) {
      for (const nivel of [3, 4, 5] as const) expect(g(7, nivel).atalho.pt).toMatch(/^Arredonde/)
    }
  })
  it('número de 4 dígitos sai com separador de milhar nos dois idiomas', () => {
    const q = encontrar(gerarMultiplicacao, 4, (q) => /\d\.\d{3}/.test(q.atalho.pt))
    expect(q.atalho.en).toMatch(/\d,\d{3}/)
  })
})

describe('cadeia: unidades e rótulos', () => {
  it('market sizing: os produtos parciais antes do ticket não são dinheiro', () => {
    const q = encontrar(gerarCadeia, 3, (q) => q.enunciado.pt.includes('adultos'))
    const passos = q.atalho.pt.split(';')
    expect(passos.slice(0, -1).join(';')).not.toContain('R$')
    expect(passos.at(-1)).toContain('R$')
  })
  it('frequência mensal aparece como mensal no erro da camada esquecida', () => {
    const q = encontrar(
      gerarCadeia,
      5,
      (q) => q.enunciado.pt.includes('por mês') && q.opcoes.some((o) => o.erro?.pt.includes('frequência')),
    )
    const erro = q.opcoes.find((o) => o.erro?.pt.includes('frequência'))!.erro!
    expect(erro.pt).toContain('por mês')
    expect(erro.en).toContain('a month')
  })
})

describe('fatia 2', () => {
  /** Quantas das 100 primeiras seeds trazem um distrator cujo erro contém `trecho`. */
  const presenca = (g: (s: number, n: 1 | 2 | 3 | 4 | 5) => { opcoes: { erro?: { pt: string } }[] }, nivel: 1 | 2 | 3 | 4 | 5, trecho: string) =>
    Array.from({ length: 100 }, (_, i) => g(i + 1, nivel)).filter((q) => q.opcoes.some((o) => o.erro?.pt.includes(trecho))).length

  it('crescimento: o erro de somar as taxas aparece nos níveis 1 e 3', () => {
    expect(presenca(gerarCrescimento, 1, 'simples')).toBeGreaterThanOrEqual(80)
    expect(presenca(gerarCrescimento, 3, 'simples')).toBeGreaterThanOrEqual(80)
  })
  it('crescimento: regra do 72 dá anos exatos', () => {
    const q = encontrar(gerarCrescimento, 2, (q) => q.enunciado.pt.includes(' 8%') && q.enunciado.pt.includes('quantos anos'))
    expect(q.opcoes.find((o) => o.id === q.answerId)!.valor).toBe(9)
  })
  it('crescimento: no CAGR, a média simples nunca é a resposta', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const q = gerarCrescimento(seed, 4)
      const certa = q.opcoes.find((o) => o.id === q.answerId)!
      expect(certa.erro).toBeUndefined()
      expect(q.enunciado.pt).toMatch(/CAGR/)
    }
  })
  it('unidades nível 1: o distrator × 10 em vez de × 12 aparece', () => {
    expect(presenca(gerarUnidades, 1, '10 em vez de 12')).toBeGreaterThanOrEqual(80)
  })
  it('break-even nível 1: o distrator "usou o preço" aparece', () => {
    expect(presenca(gerarBreakeven, 1, 'preço')).toBeGreaterThanOrEqual(80)
  })
  it('média ponderada: o distrator da média simples aparece', () => {
    for (const nivel of [1, 2, 3] as const) expect(presenca(gerarMediaPonderada, nivel, 'média simples')).toBeGreaterThanOrEqual(80)
  })
})

describe('gerarQuestao', () => {
  it('recusa subskill sem gerador', () => {
    expect(() => gerarQuestao('inexistente' as Subskill, 1, 1)).toThrow()
  })
  it('despacha para o gerador da subskill', () => {
    expect(gerarQuestao('cadeia', 2, 9).subskill).toBe('cadeia')
  })
})
