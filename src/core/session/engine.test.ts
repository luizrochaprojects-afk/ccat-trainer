import { describe, expect, it } from 'vitest'
import { buildQuestion } from '../generators'
import type { Question } from '../schema'
import { DRILL_PER_QUESTION_MS, EXAM_DURATION_MS } from '../taxonomy'
import {
  answer,
  canGoBack,
  createDrill,
  createExam,
  currentQuestion,
  feedbackAvailable,
  finish,
  isFinished,
  remainingMs,
  skip,
  tick,
} from './engine'

const T0 = 1_700_000_000_000
const fila = (n: number): Question[] =>
  Array.from({ length: n }, (_, i) => buildQuestion('serie_simples', i + 1, 3, new Date(T0).toISOString()))

const acertar = (s: ReturnType<typeof createExam>, now: number) =>
  answer(s, currentQuestion(s)!.answerId, now)
const errar = (s: ReturnType<typeof createExam>, now: number) =>
  answer(s, currentQuestion(s)!.options.find((o) => o.id !== currentQuestion(s)!.answerId)!.id, now)

describe('criação', () => {
  it('recusa sessão sem questões', () => {
    expect(() => createExam([], T0)).toThrow()
  })

  it('exam começa na primeira questão, rodando', () => {
    const s = createExam(fila(5), T0)
    expect(s.index).toBe(0)
    expect(s.status).toBe('running')
    expect(currentQuestion(s)?.id).toBe(s.config.questions[0]!.id)
  })
})

describe('exam — fidelidade à prova', () => {
  it('tem orçamento de exatamente 15 minutos', () => {
    const s = createExam(fila(50), T0)
    expect(s.config.totalMs).toBe(EXAM_DURATION_MS)
    expect(remainingMs(s, T0)).toBe(EXAM_DURATION_MS)
  })

  it('encerra sozinho quando o relógio estoura', () => {
    let s = createExam(fila(50), T0)
    s = tick(s, T0 + EXAM_DURATION_MS - 1)
    expect(isFinished(s)).toBe(false)
    s = tick(s, T0 + EXAM_DURATION_MS)
    expect(isFinished(s)).toBe(true)
  })

  it('o fim é cravado no instante do estouro, não no do tick', () => {
    // o rAF pode chamar tick depois do prazo; o resultado não pode registrar
    // uma prova de 15min03s
    let s = createExam(fila(50), T0)
    s = tick(s, T0 + EXAM_DURATION_MS + 3_000)
    expect(s.finishedAt).toBe(T0 + EXAM_DURATION_MS)
  })

  it('não dá feedback antes do fim', () => {
    const s = createExam(fila(50), T0)
    expect(feedbackAvailable(s)).toBe(false)
  })

  it('não permite voltar', () => {
    expect(canGoBack()).toBe(false)
  })

  it('não aceita resposta depois de encerrada', () => {
    let s = createExam(fila(5), T0)
    s = finish(s, T0 + 1000)
    const depois = acertar(s, T0 + 2000)
    expect(depois.answers).toHaveLength(0)
    expect(depois).toBe(s)
  })

  it('encerra ao responder a última questão', () => {
    let s = createExam(fila(3), T0)
    s = acertar(s, T0 + 1000)
    s = acertar(s, T0 + 2000)
    expect(isFinished(s)).toBe(false)
    s = acertar(s, T0 + 3000)
    expect(isFinished(s)).toBe(true)
    expect(s.answers).toHaveLength(3)
  })

  it('responder depois do prazo encerra a sessão no prazo', () => {
    let s = createExam(fila(50), T0)
    s = acertar(s, T0 + EXAM_DURATION_MS + 500)
    expect(isFinished(s)).toBe(true)
    expect(s.finishedAt).toBe(T0 + EXAM_DURATION_MS)
  })

  it('remainingMs nunca fica negativo', () => {
    const s = createExam(fila(50), T0)
    expect(remainingMs(s, T0 + EXAM_DURATION_MS + 60_000)).toBe(0)
  })

  /**
   * O teste que mais importa: o relógio é epoch, não `performance.now()`.
   * Reabrir o app no meio da prova não pode devolver tempo.
   */
  it('um F5 no meio da prova não devolve tempo', () => {
    const s = createExam(fila(50), T0)
    const serializado = JSON.parse(JSON.stringify(s)) as typeof s

    const seteMinutosDepois = T0 + 7 * 60 * 1000
    expect(remainingMs(serializado, seteMinutosDepois)).toBe(EXAM_DURATION_MS - 7 * 60 * 1000)

    // e continua encerrando no prazo original
    expect(isFinished(tick(serializado, T0 + EXAM_DURATION_MS))).toBe(true)
  })
})

describe('drill — ritmo de 18s por questão', () => {
  it('usa o orçamento por questão, não total', () => {
    const s = createDrill(fila(10), T0)
    expect(s.config.perQuestionMs).toBe(DRILL_PER_QUESTION_MS)
    expect(s.config.totalMs).toBeUndefined()
    expect(remainingMs(s, T0)).toBe(DRILL_PER_QUESTION_MS)
  })

  it('descarta a questão aos 18s e avança', () => {
    let s = createDrill(fila(10), T0)
    s = tick(s, T0 + DRILL_PER_QUESTION_MS - 1)
    expect(s.index).toBe(0)

    s = tick(s, T0 + DRILL_PER_QUESTION_MS)
    expect(s.index).toBe(1)
    expect(s.answers[0]).toMatchObject({ chosenId: null, correct: false, timedOut: true })
  })

  it('o relógio reinicia a cada questão', () => {
    let s = createDrill(fila(10), T0)
    s = acertar(s, T0 + 5_000)
    expect(remainingMs(s, T0 + 5_000)).toBe(DRILL_PER_QUESTION_MS)
    expect(remainingMs(s, T0 + 10_000)).toBe(DRILL_PER_QUESTION_MS - 5_000)
  })

  it('dá feedback imediato', () => {
    expect(feedbackAvailable(createDrill(fila(3), T0))).toBe(true)
  })

  it('encerra ao estourar o tempo da última questão', () => {
    let s = createDrill(fila(2), T0)
    s = tick(s, T0 + DRILL_PER_QUESTION_MS)
    s = tick(s, T0 + 2 * DRILL_PER_QUESTION_MS)
    expect(isFinished(s)).toBe(true)
    expect(s.answers).toHaveLength(2)
  })

  it('o tempo gasto registrado é o orçamento, não o instante do tick', () => {
    let s = createDrill(fila(3), T0)
    s = tick(s, T0 + DRILL_PER_QUESTION_MS + 2_500)
    expect(s.answers[0]!.elapsedMs).toBe(DRILL_PER_QUESTION_MS)
  })
})

describe('registro das respostas', () => {
  it('marca acerto e erro corretamente', () => {
    let s = createDrill(fila(3), T0)
    s = acertar(s, T0 + 1000)
    s = errar(s, T0 + 2000)
    expect(s.answers[0]!.correct).toBe(true)
    expect(s.answers[1]!.correct).toBe(false)
  })

  it('pular conta como não respondida, sem penalidade extra', () => {
    let s = createDrill(fila(3), T0)
    s = skip(s, T0 + 1000)
    expect(s.answers[0]).toMatchObject({ chosenId: null, correct: false, timedOut: false })
  })

  it('distingue pulada de estourada', () => {
    let s = createDrill(fila(3), T0)
    s = skip(s, T0 + 1000)
    s = tick(s, T0 + 1000 + DRILL_PER_QUESTION_MS)
    expect(s.answers[0]!.timedOut).toBe(false)
    expect(s.answers[1]!.timedOut).toBe(true)
  })

  it('mede o tempo de cada questão a partir de quando ela entrou na tela', () => {
    let s = createDrill(fila(3), T0)
    s = acertar(s, T0 + 4_000)
    s = acertar(s, T0 + 4_000 + 6_000)
    expect(s.answers[0]!.elapsedMs).toBe(4_000)
    expect(s.answers[1]!.elapsedMs).toBe(6_000)
  })

  it('guarda tipo e nível para o diagnóstico por tipo', () => {
    let s = createDrill(fila(2), T0)
    s = acertar(s, T0 + 1000)
    expect(s.answers[0]!.tipo).toBe('math_series')
    expect(s.answers[0]!.difficulty).toBe(3)
  })

  it('nunca registra elapsedMs negativo', () => {
    let s = createDrill(fila(2), T0)
    s = acertar(s, T0 - 5_000) // relógio do sistema andou para trás
    expect(s.answers[0]!.elapsedMs).toBe(0)
  })
})

describe('tick é idempotente enquanto nada vence', () => {
  it('não muda o estado sem motivo', () => {
    const s = createExam(fila(10), T0)
    expect(tick(s, T0 + 1000)).toBe(s)
    expect(tick(s, T0 + 2000)).toBe(s)
  })

  it('não faz nada depois de encerrada', () => {
    const s = finish(createExam(fila(10), T0), T0 + 100)
    expect(tick(s, T0 + 999_999)).toBe(s)
  })
})
