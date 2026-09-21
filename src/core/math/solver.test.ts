import { describe, expect, it } from 'vitest'
import {
  evaluateExpression,
  formatNumber,
  parseNumber,
  SolverError,
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
})
