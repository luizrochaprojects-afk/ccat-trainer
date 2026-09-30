import { describe, expect, it } from 'vitest'
import {
  comparacaoDe,
  evaluateExpression,
  formatNumber,
  parseNumber,
  SolverError,
  toleranciaDe,
} from './solver'

describe('evaluateExpression', () => {
  it('resolve as quatro operações', () => {
    expect(evaluateExpression('2+3')).toBe(5)
    expect(evaluateExpression('10-4')).toBe(6)
    expect(evaluateExpression('6*7')).toBe(42)
    expect(evaluateExpression('84/4')).toBe(21)
  })

  it('respeita a precedência', () => {
    expect(evaluateExpression('2+3*4')).toBe(14)
    expect(evaluateExpression('8*12-15')).toBe(81)
    expect(evaluateExpression('100-20/4')).toBe(95)
  })

  it('respeita parênteses', () => {
    expect(evaluateExpression('(2+3)*4')).toBe(20)
    expect(evaluateExpression('((1+2)*(3+4))')).toBe(21)
  })

  it('aceita decimais e sinal unário', () => {
    expect(evaluateExpression('120*0.15')).toBeCloseTo(18, 9)
    expect(evaluateExpression('-5+8')).toBe(3)
    expect(evaluateExpression('10*-2')).toBe(-20)
  })

  it('é associativo à esquerda na subtração e na divisão', () => {
    expect(evaluateExpression('10-3-2')).toBe(5)
    expect(evaluateExpression('100/5/2')).toBe(10)
  })

  it('ignora espaços', () => {
    expect(evaluateExpression('  12 *  ( 3 + 1 ) ')).toBe(48)
  })

  describe('recusa entrada que não seja aritmética pura', () => {
    const venenos = [
      'process.exit(1)',
      'require("fs")',
      '2+alert(1)',
      'a+b',
      '2**8',
      '1;2',
      '__proto__',
      '',
      '   ',
    ]
    for (const v of venenos) {
      it(`rejeita ${JSON.stringify(v)}`, () => {
        expect(() => evaluateExpression(v)).toThrow(SolverError)
      })
    }
  })

  it('rejeita expressão malformada', () => {
    expect(() => evaluateExpression('2+')).toThrow(SolverError)
    expect(() => evaluateExpression('(2+3')).toThrow(SolverError)
    expect(() => evaluateExpression('2 3')).toThrow(SolverError)
    expect(() => evaluateExpression(')2+3(')).toThrow(SolverError)
  })

  it('rejeita divisão por zero em vez de devolver Infinity', () => {
    expect(() => evaluateExpression('5/0')).toThrow(SolverError)
    expect(() => evaluateExpression('5/(3-3)')).toThrow(SolverError)
  })
})

describe('formatNumber', () => {
  it('formata inteiros com separador de milhar en-US', () => {
    expect(formatNumber(42)).toBe('42')
    expect(formatNumber(1234)).toBe('1,234')
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('formata decimais com duas casas e ponto decimal', () => {
    expect(formatNumber(3.5)).toBe('3.50')
    expect(formatNumber(0.125)).toBe('0.13')
  })

  it('formata moeda e porcentagem', () => {
    expect(formatNumber(1234.5, 'currency')).toBe('$1,234.50')
    expect(formatNumber(20, 'percent')).toBe('20%')
    expect(formatNumber(12.5, 'percent')).toBe('12.5%')
  })

  it('formata negativo com o sinal antes do separador', () => {
    expect(formatNumber(-1234)).toBe('-1,234')
  })

  it('é determinístico (o gate compara string com string)', () => {
    for (const v of [0, 7, 99.99, 1e6]) {
      expect(formatNumber(v, 'currency')).toBe(formatNumber(v, 'currency'))
    }
  })
})

describe('parseNumber', () => {
  it('faz o caminho de volta do formatNumber', () => {
    for (const v of [0, 42, 1234, 1234.5, 999999.99]) {
      expect(parseNumber(formatNumber(v, 'currency'))).toBeCloseTo(v, 2)
      expect(parseNumber(formatNumber(v))).toBeCloseTo(Math.round(v * 100) / 100, 2)
    }
  })

  it('lê números soltos', () => {
    expect(parseNumber('81')).toBe(81)
    expect(parseNumber('$102.00')).toBe(102)
    expect(parseNumber('1,234.50')).toBe(1234.5)
    expect(parseNumber('15%')).toBe(15)
  })

  it('rejeita texto que não é número', () => {
    expect(() => parseNumber('nenhuma das anteriores')).toThrow(SolverError)
  })

  it('lê fração simples, que é alternativa nas questões de comparação', () => {
    expect(parseNumber('7/13')).toBe(7 / 13)
    expect(parseNumber('1/2')).toBe(0.5)
    expect(parseNumber('-3/4')).toBe(-0.75)
  })

  it('rejeita fração malformada ou com denominador zero', () => {
    for (const t of ['1/0', '1/2/3', '/2', '3/', 'a/b', 'and/or']) {
      expect(() => parseNumber(t), t).toThrow(SolverError)
    }
  })

  it('não confunde série de letras com número', () => {
    for (const t of ['GIK', 'I32', 'A2']) expect(() => parseNumber(t), t).toThrow(SolverError)
  })
})

describe('funções de comparação', () => {
  it('min, max e nearest escolhem entre os argumentos', () => {
    expect(evaluateExpression('min(0.07,0.009,0.0081,0.0077,0.00779)')).toBe(0.0077)
    expect(evaluateExpression('max(2/3,5/9,7/13,4/7,3/5)')).toBe(2 / 3)
    expect(evaluateExpression('nearest(1/3,0.3,0.35,0.33,0.4)')).toBe(0.33)
  })

  it('a menor fração da prova real: 7/13', () => {
    expect(evaluateExpression('min(2/3, 5/9, 7/13, 4/7, 3/5)')).toBe(7 / 13)
  })

  it('compõe com o resto da aritmética', () => {
    expect(evaluateExpression('2*max(1,4)+min(3,1)')).toBe(9)
  })

  it('empate é erro: a questão teria duas respostas', () => {
    expect(() => evaluateExpression('min(0.5,1/2,3)')).toThrow(SolverError)
    expect(() => evaluateExpression('nearest(0.5,0.4,0.6)')).toThrow(SolverError)
  })

  it('exige ao menos dois candidatos', () => {
    expect(() => evaluateExpression('min(3)')).toThrow(SolverError)
    expect(() => evaluateExpression('nearest(1,2)')).toThrow(SolverError)
  })

  it('só aceita as três funções de nome fixo', () => {
    for (const v of ['abs(-2)', 'sqrt(4)', 'min', 'min 1,2', 'max(1,2', 'Min(1,2)', 'min(1,,2)']) {
      expect(() => evaluateExpression(v), v).toThrow(SolverError)
    }
  })

  it('comparacaoDe devolve os candidatos só quando a expressão inteira é a chamada', () => {
    expect(comparacaoDe('nearest(1/3,0.3,0.33)')).toEqual({
      funcao: 'nearest',
      alvo: 1 / 3,
      candidatos: [0.3, 0.33],
      valor: 0.33,
    })
    expect(comparacaoDe('min(1,2)')?.candidatos).toEqual([1, 2])
    expect(comparacaoDe('1+min(1,2)')).toBeNull()
    expect(comparacaoDe('8*12-15')).toBeNull()
    expect(comparacaoDe('min(1,2)+1')).toBeNull()
  })
})

describe('toleranciaDe', () => {
  it('meia unidade da última casa, com o teto antigo de 0.005 até duas casas', () => {
    expect(toleranciaDe('81')).toBe(0.005)
    expect(toleranciaDe('$102.50')).toBe(0.005)
    expect(toleranciaDe('5.5')).toBe(0.005)
    expect(toleranciaDe('0.0077')).toBeCloseTo(0.00005, 12)
    expect(toleranciaDe('0.00779')).toBeCloseTo(0.000005, 12)
  })

  it('fração é exata', () => {
    expect(toleranciaDe('7/13')).toBe(1e-9)
  })

  it('separa 0.0077 de 0.00779, que a tolerância fixa de 0.005 confundia', () => {
    expect(Math.abs(0.00779 - 0.0077)).toBeGreaterThan(toleranciaDe('0.0077'))
  })
})
