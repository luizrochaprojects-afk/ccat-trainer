import { describe, expect, it } from 'vitest'
import { mulberry32, type Rng } from '../rng'
import { ajustarNivel, escolherSubskill, fraqueza, type QmResposta } from './selecao'
import { SUBSKILLS_ATIVAS, type Nivel, type Subskill } from './taxonomia'

const fixo = (v: number): Rng => ({ ...mulberry32(1), next: () => v })

let n = 0
function resp(subskill: Subskill, correta: boolean, elapsedMs = 1_000, alvoMs = 10_000): QmResposta {
  n++
  return {
    id: `r${n}`, sessaoId: 's', questaoId: `q${n}`, subskill, nivel: 1,
    chosenId: correta ? 'a' : 'b', correta, elapsedMs, alvoMs, respondidaEm: n,
  }
}
const varias = (s: Subskill, certas: number, total: number) =>
  Array.from({ length: total }, (_, i) => resp(s, i < certas))

describe('escolherSubskill', () => {
  it('histórico vazio escolhe uma ativa sem lançar', () => {
    expect(SUBSKILLS_ATIVAS).toContain(escolherSubskill(mulberry32(1), [], SUBSKILLS_ATIVAS))
  })
  it('prefere a mais fraca quando não explora', () => {
    const historico = SUBSKILLS_ATIVAS.flatMap((s) => varias(s, s === 'porcentagem' ? 2 : 10, 10))
    expect(escolherSubskill(fixo(0.9), historico, SUBSKILLS_ATIVAS)).toBe('porcentagem')
  })
  it('subskill com menos de 5 respostas vem antes de qualquer outra', () => {
    const historico = SUBSKILLS_ATIVAS.filter((s) => s !== 'cadeia').flatMap((s) => varias(s, 0, 10))
    expect(fraqueza(historico, 'cadeia')).toBe(Number.POSITIVE_INFINITY)
    expect(escolherSubskill(fixo(0.9), historico, SUBSKILLS_ATIVAS)).toBe('cadeia')
  })
  it('lentidão também pesa', () => {
    const lenta = Array.from({ length: 10 }, () => resp('divisao', true, 30_000, 10_000))
    const rapida = Array.from({ length: 10 }, () => resp('fracoes', true, 1_000, 10_000))
    expect(fraqueza(lenta, 'divisao')).toBeGreaterThan(fraqueza(rapida, 'fracoes'))
  })
})

describe('ajustarNivel', () => {
  it.each([
    [3, [1, 1, 1, 1, 0], 4],
    [5, [1, 1, 1, 1, 1], 5],
    [3, [1, 1, 0, 0, 0], 2],
    [1, [0, 0, 0, 0, 0], 1],
    [3, [1, 1, 1, 0, 0], 3],
  ] as const)('nível %i com %j → %i', (nivel, certas, esperado) => {
    expect(ajustarNivel(nivel as Nivel, certas.map((c) => resp('cadeia', c === 1)))).toBe(esperado)
  })
  it('4 certas mas 2 fora do tempo não sobem', () => {
    const bloco = [resp('cadeia', true), resp('cadeia', true), resp('cadeia', true, 20_000), resp('cadeia', true, 20_000), resp('cadeia', false)]
    expect(ajustarNivel(3, bloco)).toBe(3)
  })
})
