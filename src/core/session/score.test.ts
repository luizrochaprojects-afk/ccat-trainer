import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import type { Question } from '../schema'
import { EXAM_DURATION_MS } from '../taxonomy'
import { answer, createDrill, createExam, finish, tick } from './engine'
import { scoreSession } from './score'

const T0 = 1_700_000_000_000
const ISO = new Date(T0).toISOString()

/** Fila com tipos controlados, para testar o diagnóstico por tipo. */
function filaDe(specs: [gerador: string, seed: number][]): Question[] {
  return specs.map(([g, s]) => buildQuestion(g, s, 3, ISO))
}

describe('scoreSession — contagens básicas', () => {
  it('separa acertos, alcançadas e total', () => {
    let s = createExam(filaDe([['serie_simples', 1], ['serie_simples', 2], ['serie_simples', 3]]), T0)
    s = answer(s, s.config.questions[0]!.answerId, T0 + 1000)
    s = answer(s, 'z', T0 + 2000) // errada
    const score = scoreSession(s, T0 + 2000)

    expect(score.raw).toBe(1)
    expect(score.reached).toBe(2)
    expect(score.total).toBe(3)
    expect(score.accuracy).toBeCloseTo(0.5)
  })

  it('distingue pulada de estourada', () => {
    let s = createDrill(filaDe([['serie_simples', 1], ['serie_simples', 2]]), T0)
    s = answer(s, null, T0 + 1000) // pulada
    s = tick(s, T0 + 1000 + 18_000) // estourada
    const score = scoreSession(s, T0 + 20_000)

    expect(score.skipped).toBe(1)
    expect(score.timedOut).toBe(1)
    expect(score.raw).toBe(0)
  })

  it('sessão sem nenhuma resposta não divide por zero', () => {
    const s = createExam(filaDe([['serie_simples', 1]]), T0)
    const score = scoreSession(s, T0 + 5000)
    expect(score.accuracy).toBeNull()
    expect(score.avgMs).toBeNull()
    expect(score.raw).toBe(0)
  })

  it('o tempo médio é por questão respondida', () => {
    let s = createDrill(filaDe([['serie_simples', 1], ['serie_simples', 2]]), T0)
    s = answer(s, 'x', T0 + 4_000)
    s = answer(s, 'x', T0 + 4_000 + 8_000)
    expect(scoreSession(s, T0 + 12_000).avgMs).toBe(6_000)
  })

  it('durationMs usa o fim registrado, não o instante da consulta', () => {
    let s = createExam(filaDe([['serie_simples', 1]]), T0)
    s = answer(s, 'x', T0 + 3_000) // última questão → encerra
    // consultado muito depois, a duração não infla
    expect(scoreSession(s, T0 + 999_000).durationMs).toBe(3_000)
  })

  it('durationMs nunca passa do orçamento da prova', () => {
    let s = createExam(filaDe([['serie_simples', 1], ['serie_simples', 2]]), T0)
    s = tick(s, T0 + EXAM_DURATION_MS + 10_000)
    expect(scoreSession(s, T0 + EXAM_DURATION_MS + 10_000).durationMs).toBe(EXAM_DURATION_MS)
  })
})

describe('percentil', () => {
  it('só é calculado na simulação completa', () => {
    let exam = createExam(filaDe([['serie_simples', 1]]), T0)
    exam = answer(exam, 'x', T0 + 1000)
    expect(scoreSession(exam, T0 + 1000).percentile).not.toBeNull()

    let drill = createDrill(filaDe([['serie_simples', 1]]), T0)
    drill = answer(drill, 'x', T0 + 1000)
    expect(scoreSession(drill, T0 + 1000).percentile).toBeNull()
  })
})

describe('diagnóstico por tipo', () => {
  const misto = (): Question[] => [
    ...Array.from({ length: 4 }, (_, i) => buildQuestion('serie_simples', i + 1, 3, ISO)),
    ...Array.from({ length: 4 }, (_, i) => buildQuestion('rotacao', i + 1, 3, ISO)),
  ]

  it('reporta acurácia separada por tipo', () => {
    let s = createExam(misto(), T0)
    let t = T0
    for (const q of misto()) {
      t += 1000
      // acerta as séries, erra as espaciais
      const escolha = q.tipo === 'math_series' ? q.answerId : 'z'
      s = answer(s, escolha, t)
    }
    const score = scoreSession(s, t)
    expect(score.byTipo.find((b) => b.tipo === 'math_series')!.accuracy).toBe(1)
    expect(score.byTipo.find((b) => b.tipo === 'spatial')!.accuracy).toBe(0)
    expect(score.weakestTipo).toBe('spatial')
  })

  it('não lista tipo que não foi alcançado', () => {
    let s = createExam(misto(), T0)
    s = answer(s, 'x', T0 + 1000)
    const score = scoreSession(s, T0 + 1000)
    expect(score.byTipo.every((b) => b.reached > 0)).toBe(true)
  })

  /**
   * Regressão: com todas as acurácias iguais, o cálculo antigo ainda elegia um
   * "mais fraco". Quem acertava 50 de 50 saía lendo que seu ponto fraco era
   * Analogias — diagnóstico inventado a partir de empate.
   */
  it('não inventa ponto fraco quando não há diferença entre tipos', () => {
    let s = createExam(misto(), T0)
    let t = T0
    for (const q of misto()) {
      t += 1000
      s = answer(s, q.answerId, t) // acerta tudo
    }
    expect(scoreSession(s, t).weakestTipo).toBeNull()
  })

  it('não aponta ponto fraco errando tudo de forma uniforme', () => {
    let s = createExam(misto(), T0)
    let t = T0
    for (let i = 0; i < 8; i++) {
      t += 1000
      s = answer(s, 'z', t)
    }
    expect(scoreSession(s, t).weakestTipo).toBeNull()
  })

  it('exige um mínimo de questões antes de acusar um tipo', () => {
    // 4 séries acertadas + 1 espacial errada: a amostra espacial é pequena
    // demais para virar diagnóstico
    const fila = [
      ...Array.from({ length: 4 }, (_, i) => buildQuestion('serie_simples', i + 1, 3, ISO)),
      buildQuestion('rotacao', 1, 3, ISO),
    ]
    let s = createExam(fila, T0)
    let t = T0
    for (const q of fila) {
      t += 1000
      s = answer(s, q.tipo === 'math_series' ? q.answerId : 'z', t)
    }
    expect(scoreSession(s, t).weakestTipo).toBeNull()
  })
})

/**
 * Regressão: a tela de resultado dizia "O relógio cortou a prova" mesmo quando
 * o usuário clicava em Encerrar. São diagnósticos opostos — um é problema de
 * ritmo, o outro não é problema nenhum.
 */
describe('endedByTimeout', () => {
  it('é true quando o relógio do exam estoura', () => {
    let s = createExam(filaDe([['serie_simples', 1], ['serie_simples', 2]]), T0)
    s = tick(s, T0 + EXAM_DURATION_MS)
    expect(scoreSession(s, T0 + EXAM_DURATION_MS).endedByTimeout).toBe(true)
  })

  it('é false quando o usuário encerra antes', () => {
    let s = createExam(filaDe([['serie_simples', 1], ['serie_simples', 2]]), T0)
    s = answer(s, 'x', T0 + 4_000)
    s = finish(s, T0 + 5_000)
    expect(scoreSession(s, T0 + 5_000).endedByTimeout).toBe(false)
  })

  it('é false quando a prova termina por acabarem as questões', () => {
    let s = createExam(filaDe([['serie_simples', 1]]), T0)
    s = answer(s, 'x', T0 + 2_000)
    expect(scoreSession(s, T0 + 2_000).endedByTimeout).toBe(false)
  })

  it('no drill, é true só se TODAS as questões estouraram o relógio', () => {
    let todas = createDrill(filaDe([['serie_simples', 1], ['serie_simples', 2]]), T0)
    todas = tick(todas, T0 + 18_000)
    todas = tick(todas, T0 + 36_000)
    expect(scoreSession(todas, T0 + 36_000).endedByTimeout).toBe(true)

    let mista = createDrill(filaDe([['serie_simples', 1], ['serie_simples', 2]]), T0)
    mista = answer(mista, 'x', T0 + 3_000)
    mista = tick(mista, T0 + 3_000 + 18_000)
    expect(scoreSession(mista, T0 + 21_000).endedByTimeout).toBe(false)
  })

  it('sessão sem nenhuma resposta não conta como estouro no drill', () => {
    const s = createDrill(filaDe([['serie_simples', 1]]), T0)
    expect(scoreSession(s, T0 + 1_000).endedByTimeout).toBe(false)
  })
})
