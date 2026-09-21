import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import type { Question } from '../schema'
import { rawToPercentile, wilsonInterval } from '../norms'
import { EXAM_DURATION_MS, EXAM_QUESTION_COUNT } from '../taxonomy'
import { answer, createDrill, createExam, finish, tick } from './engine'
import { scoreSession } from './score'

const T0 = 1_700_000_000_000
const ISO = new Date(T0).toISOString()

const fila = (n: number): Question[] =>
  Array.from({ length: n }, (_, i) => buildQuestion('serie_simples', i + 1, 3, ISO))

/** Responde `certas` questões certas e `erradas` erradas, gastando `msPorQuestao`. */
function rodar(total: number, certas: number, erradas: number, msPorQuestao: number) {
  let s = createExam(fila(total), T0)
  let t = T0
  for (let i = 0; i < certas + erradas; i++) {
    const q = s.config.questions[s.index]
    if (!q) break
    t += msPorQuestao
    s = answer(s, i < certas ? q.answerId : 'errada', t)
  }
  return { s, t }
}

describe('wilsonInterval', () => {
  it('é mais largo com amostra pequena', () => {
    const poucos = wilsonInterval(8, 10)
    const muitos = wilsonInterval(80, 100)
    expect(poucos.high - poucos.low).toBeGreaterThan(muitos.high - muitos.low)
  })

  it('contém a proporção observada', () => {
    for (const [k, n] of [[12, 15], [3, 7], [0, 5], [5, 5]] as const) {
      const { low, high } = wilsonInterval(k, n)
      expect(low).toBeLessThanOrEqual(k / n)
      expect(high).toBeGreaterThanOrEqual(k / n)
    }
  })

  it('nunca sai de [0, 1], nem com acerto total ou erro total', () => {
    for (const [k, n] of [[0, 3], [3, 3], [0, 50], [50, 50]] as const) {
      const { low, high } = wilsonInterval(k, n)
      expect(low).toBeGreaterThanOrEqual(0)
      expect(high).toBeLessThanOrEqual(1)
    }
  })

  it('amostra vazia não divide por zero', () => {
    expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 1 })
  })
})

describe('completeRun', () => {
  it('é true quando o relógio vai até o fim', () => {
    let s = createExam(fila(50), T0)
    s = tick(s, T0 + EXAM_DURATION_MS)
    expect(scoreSession(s, T0 + EXAM_DURATION_MS).completeRun).toBe(true)
  })

  it('é true quando todas as questões são alcançadas', () => {
    const { s, t } = rodar(3, 3, 0, 1000)
    expect(scoreSession(s, t).completeRun).toBe(true)
  })

  it('é false quando o usuário encerra no meio', () => {
    const r = rodar(50, 12, 3, 17_300)
    const s = finish(r.s, r.t)
    expect(scoreSession(s, r.t).completeRun).toBe(false)
  })

  it('drill é sempre completo — nunca se compara com a norma', () => {
    let s = createDrill(fila(5), T0)
    s = answer(s, 'x', T0 + 1000)
    s = finish(s, T0 + 2000)
    const score = scoreSession(s, T0 + 2000)
    expect(score.completeRun).toBe(true)
    expect(score.projection).toBeNull()
  })
})

/**
 * Regressão de produto: uma simulação de 4 minutos mostrava "percentil 8",
 * comparando 12 acertos com uma norma construída sobre provas de 15 minutos.
 * Não media nada e desanimava sem motivo — quem parou antes não tem um score
 * de CCAT, tem um ritmo e uma acurácia.
 */
describe('projeção de simulação interrompida', () => {
  it('não projeta quando a prova foi inteira', () => {
    let s = createExam(fila(50), T0)
    s = tick(s, T0 + EXAM_DURATION_MS)
    expect(scoreSession(s, T0 + EXAM_DURATION_MS).projection).toBeNull()
  })

  it('não projeta com amostra pequena demais', () => {
    const r = rodar(50, 2, 1, 5_000)
    const s = finish(r.s, r.t)
    expect(scoreSession(s, r.t).projection).toBeNull()
  })

  it('o caso real: 12 de 15 a 17,3s por questão', () => {
    const r = rodar(50, 12, 3, 17_300)
    const s = finish(r.s, r.t)
    const score = scoreSession(s, r.t)
    const p = score.projection

    expect(p).not.toBeNull()
    // nesse ritmo daria para alcançar a prova toda
    expect(p!.projectedReached).toBe(EXAM_QUESTION_COUNT)
    // o score bruto sozinho dava percentil 8; a projeção conta outra história
    expect(rawToPercentile(score.raw)).toBeLessThan(15)
    expect(p!.percentile).toBeGreaterThan(80)
    // e a faixa é larga, porque 15 questões não sustentam precisão
    expect(p!.percentileHigh - p!.percentileLow).toBeGreaterThan(20)
  })

  it('a faixa sempre contém o ponto central', () => {
    for (const certas of [3, 6, 9, 12, 15]) {
      const r = rodar(50, certas, 15 - certas, 17_000)
      const s = finish(r.s, r.t)
      const p = scoreSession(s, r.t).projection
      if (!p) continue
      expect(p.projectedRawLow).toBeLessThanOrEqual(p.projectedRaw)
      expect(p.projectedRawHigh).toBeGreaterThanOrEqual(p.projectedRaw)
      expect(p.percentileLow).toBeLessThanOrEqual(p.percentile)
      expect(p.percentileHigh).toBeGreaterThanOrEqual(p.percentile)
    }
  })

  it('ritmo lento reduz quantas questões seriam alcançadas', () => {
    const rapido = rodar(50, 8, 2, 10_000)
    const lento = rodar(50, 8, 2, 40_000)
    const pr = scoreSession(finish(rapido.s, rapido.t), rapido.t).projection!
    const pl = scoreSession(finish(lento.s, lento.t), lento.t).projection!

    expect(pr.projectedReached).toBe(EXAM_QUESTION_COUNT)
    expect(pl.projectedReached).toBeLessThan(EXAM_QUESTION_COUNT)
    // mesma acurácia, ritmo pior: projeção menor
    expect(pl.projectedRaw).toBeLessThan(pr.projectedRaw)
  })

  it('nunca projeta mais que o total da prova', () => {
    const r = rodar(50, 10, 0, 1_000) // absurdamente rápido
    const s = finish(r.s, r.t)
    const p = scoreSession(s, r.t).projection!
    expect(p.projectedReached).toBeLessThanOrEqual(EXAM_QUESTION_COUNT)
    expect(p.projectedRawHigh).toBeLessThanOrEqual(EXAM_QUESTION_COUNT)
  })
})
