import { describe, expect, it } from 'vitest'
import { arredondarSig, formatarLocalizado, formatarValor, ordemDeGrandeza } from './formato'

describe('formatarValor', () => {
  it.each([
    [1_400_000_000, 'moeda', 'pt', 'R$ 1,4 bi'],
    [1_400_000_000, 'moeda', 'en', '$1.4B'],
    [980_000_000, 'moeda', 'pt', 'R$ 980 mi'],
    [1_380_000, 'numero', 'pt', '1,38 mi'],
    [1_380_000, 'numero', 'en', '1.38M'],
    [45_000, 'moeda', 'en', '$45K'],
    [45_000, 'moeda', 'pt', 'R$ 45 mil'],
    [240, 'numero', 'pt', '240'],
    [999_600_000, 'moeda', 'pt', 'R$ 1 bi'],
    [999_600_000, 'moeda', 'en', '$1B'],
    [12.5, 'percent', 'pt', '12,5%'],
    [-13.04, 'percent', 'en', '-13%'],
    [0.5, 'percent', 'pt', '0,5%'],
    [2_500_000_000_000, 'moeda', 'en', '$2.5T'],
    [-1_400_000_000, 'moeda', 'pt', '-R$ 1,4 bi'],
    [0.046, 'numero', 'pt', '0,046'],
  ] as const)('%s %s %s → %s', (v, u, l, esperado) => {
    expect(formatarValor(v, u, l)).toBe(esperado)
  })

  it('formatarLocalizado devolve os dois idiomas', () => {
    expect(formatarLocalizado(1_400_000_000, 'moeda')).toEqual({ pt: 'R$ 1,4 bi', en: '$1.4B' })
  })
})

describe('ordemDeGrandeza', () => {
  it('usa o valor exibido, não o exato', () => {
    expect(ordemDeGrandeza(999_600_000)).toBe(9)
    expect(ordemDeGrandeza(980_000_000)).toBe(8)
    expect(ordemDeGrandeza(-45)).toBe(1)
  })
})

describe('arredondarSig', () => {
  it('arredonda a n algarismos significativos', () => {
    expect(arredondarSig(3.47 * 238, 2)).toBe(830)
    expect(arredondarSig(0.0456, 2)).toBe(0.046)
    expect(arredondarSig(0, 2)).toBe(0)
    expect(arredondarSig(-1_234_000, 2)).toBe(-1_200_000)
  })
})
