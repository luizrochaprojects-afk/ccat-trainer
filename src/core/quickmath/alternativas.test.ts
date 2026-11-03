import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import { montarAlternativas, type Candidato } from './alternativas'
import { ordemDeGrandeza } from './formato'

const erro = { pt: 'x', en: 'x' }
const c = (valor: number): Candidato => ({ valor, erro })

describe('montarAlternativas', () => {
  it('aplica folga, ordem de grandeza e unicidade', () => {
    const r = montarAlternativas(
      mulberry32(1),
      840_000_000,
      [c(8_400_000_000), c(84_000_000), c(860_000_000), c(840_000), c(8_400_000_000)],
      'moeda',
      false,
    )!
    const certa = r.opcoes.find((o) => o.id === r.answerId)!
    const outras = r.opcoes.filter((o) => o !== certa)

    expect(r.opcoes).toHaveLength(5)
    expect(certa.valor).toBe(840_000_000)
    for (const o of outras) {
      expect(Math.abs(o.valor - certa.valor) / certa.valor).toBeGreaterThanOrEqual(0.1)
    }
    expect(outras.filter((o) => ordemDeGrandeza(o.valor) === 8).length).toBeGreaterThanOrEqual(2)
    expect(new Set(r.opcoes.map((o) => o.texto.pt)).size).toBe(5)
    expect(new Set(r.opcoes.map((o) => o.texto.en)).size).toBe(5)
    expect(r.opcoes.some((o) => o.valor === 860_000_000)).toBe(false) // a 2,4% da certa
  })

  it('estimativa arredonda a 2 sig e usa folga de 15%', () => {
    const r = montarAlternativas(
      mulberry32(3),
      825.86,
      [c(8258.6), c(82.586), c(700), c(950), c(1000)],
      'numero',
      true,
    )!
    const certa = r.opcoes.find((o) => o.id === r.answerId)!
    expect(certa.valor).toBe(830)
    for (const o of r.opcoes.filter((o) => o !== certa)) {
      expect(o.valor <= 705.5 || o.valor >= 954.5).toBe(true)
    }
  })

  it('distrator carrega o erro que representa; a certa não tem erro', () => {
    // o erro real mais plausível na mesma ordem de grandeza sempre entra
    const r = montarAlternativas(mulberry32(1), 100, [{ valor: 140, erro: { pt: 'dígito', en: 'digit' } }], 'numero', false)!
    expect(r.opcoes.find((o) => o.valor === 140)?.erro?.pt).toBe('dígito')
    expect(r.opcoes.find((o) => o.id === r.answerId)?.erro).toBeUndefined()
  })

  it('descarta valor não positivo fora de percentual', () => {
    const r = montarAlternativas(mulberry32(1), 100, [c(-100), c(0)], 'numero', false)!
    expect(r.opcoes.every((o) => o.valor > 0)).toBe(true)
  })

  it('mesma seed → mesma ordem', () => {
    const cand = [c(8_400_000_000), c(84_000_000), c(840_000)]
    const a = montarAlternativas(mulberry32(7), 840_000_000, cand, 'moeda', false)!
    const b = montarAlternativas(mulberry32(7), 840_000_000, cand, 'moeda', false)!
    expect(a).toEqual(b)
  })
})
