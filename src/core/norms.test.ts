import { describe, expect, it } from 'vitest'
import { CCAT_NORMS, EXAM_QUESTION_COUNT } from './taxonomy'
import { rawNeededForPercentile, rawToPercentile, standardNormalCdf } from './norms'

describe('standardNormalCdf', () => {
  it('vale 0.5 na média', () => {
    expect(standardNormalCdf(0)).toBeCloseTo(0.5, 6)
  })

  it('bate com os valores conhecidos de z', () => {
    expect(standardNormalCdf(1)).toBeCloseTo(0.8413, 4)
    expect(standardNormalCdf(-1)).toBeCloseTo(0.1587, 4)
    expect(standardNormalCdf(1.96)).toBeCloseTo(0.975, 3)
  })

  it('é simétrica', () => {
    for (const z of [0.3, 1.1, 2.4]) {
      expect(standardNormalCdf(z) + standardNormalCdf(-z)).toBeCloseTo(1, 6)
    }
  })
})

describe('rawToPercentile', () => {
  it('coloca a média da norma perto do percentil 50', () => {
    expect(rawToPercentile(CCAT_NORMS.mean)).toBe(50)
  })

  it('é monotônica não-decrescente', () => {
    let anterior = 0
    for (let raw = 0; raw <= EXAM_QUESTION_COUNT; raw++) {
      const p = rawToPercentile(raw)
      expect(p).toBeGreaterThanOrEqual(anterior)
      anterior = p
    }
  })

  it('fica preso em 1..99 nos extremos', () => {
    expect(rawToPercentile(0)).toBe(1)
    expect(rawToPercentile(50)).toBe(99)
  })

  it('trata score fora da faixa por clamp, não por erro', () => {
    expect(rawToPercentile(-5)).toBe(1)
    expect(rawToPercentile(999)).toBe(99)
  })

  it('rejeita entrada não numérica', () => {
    expect(() => rawToPercentile(Number.NaN)).toThrow()
  })

  it('um desvio-padrão acima da média cai perto do percentil 84', () => {
    const raw = CCAT_NORMS.mean + CCAT_NORMS.sd
    expect(rawToPercentile(raw)).toBeGreaterThanOrEqual(83)
    expect(rawToPercentile(raw)).toBeLessThanOrEqual(85)
  })
})

describe('rawNeededForPercentile', () => {
  it('encontra o menor score bruto que atinge o alvo', () => {
    const raw = rawNeededForPercentile(80)
    expect(rawToPercentile(raw)).toBeGreaterThanOrEqual(80)
    expect(rawToPercentile(raw - 1)).toBeLessThan(80)
  })
})
