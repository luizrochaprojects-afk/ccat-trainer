import type { Question } from '../schema'
import { DRILL_PER_QUESTION_MS, EXAM_DURATION_MS, type Tipo } from '../taxonomy'

/**
 * Motor de sessão — reducer puro (PRD §4.1–4.7).
 *
 * Todo o tempo é medido em **epoch ms** (`Date.now()`), nunca em
 * `performance.now()`. Parece detalhe, mas é a diferença entre a simulação ser
 * fiel ou não: `performance.now()` zera a cada carregamento de página, então um
 * F5 no meio da prova devolveria os 15 minutos. Com epoch persistido, o relógio
 * continua correndo mesmo que o app feche.
 *
 * A UI usa requestAnimationFrame só para redesenhar; a verdade do tempo é
 * sempre `now - startedAt`.
 */

export type SessionMode = 'exam' | 'drill'

export interface SessionConfig {
  mode: SessionMode
  /** fila já composta, na ordem em que será apresentada */
  questions: Question[]
  /** epoch ms do início da sessão */
  startedAt: number
  /** exam: orçamento total. undefined em drill. */
  totalMs?: number
  /** drill: orçamento POR questão. undefined em exam. */
  perQuestionMs?: number
}

export interface AnswerRecord {
  questionId: string
  tipo: Tipo
  difficulty: number
  /** null = não respondida (pulada ou estourou o tempo) */
  chosenId: string | null
  correct: boolean
  elapsedMs: number
  timedOut: boolean
}

export interface SessionState {
  config: SessionConfig
  index: number
  answers: AnswerRecord[]
  /** epoch ms em que a questão atual entrou na tela */
  questionStartedAt: number
  status: 'running' | 'finished'
  finishedAt?: number
}

// --- Criação -----------------------------------------------------------------

export function createExam(questions: Question[], startedAt: number): SessionState {
  return novaSessao({ mode: 'exam', questions, startedAt, totalMs: EXAM_DURATION_MS })
}

export function createDrill(
  questions: Question[],
  startedAt: number,
  perQuestionMs: number = DRILL_PER_QUESTION_MS,
): SessionState {
  return novaSessao({ mode: 'drill', questions, startedAt, perQuestionMs })
}

function novaSessao(config: SessionConfig): SessionState {
  if (config.questions.length === 0) {
    throw new Error('sessão sem questões')
  }
  return {
    config,
    index: 0,
    answers: [],
    questionStartedAt: config.startedAt,
    status: 'running',
  }
}

// --- Consultas ---------------------------------------------------------------

export function currentQuestion(state: SessionState): Question | undefined {
  return state.config.questions[state.index]
}

/**
 * Feedback imediato só existe no drill (PRD §4.5). Na simulação, nada é
 * revelado até o fim — é o que torna a medição comparável à prova real.
 */
export function feedbackAvailable(state: SessionState): boolean {
  return state.config.mode === 'drill'
}

/**
 * Nunca se volta a uma questão já respondida — nem no drill.
 *
 * No exam é exigência do PRD §4.6 (fidelidade à prova). No drill seria possível
 * permitir, mas o feedback é imediato: voltar só serviria para reler a resposta
 * certa, e o objetivo é treinar decisão sob relógio.
 */
export function canGoBack(): boolean {
  return false
}

/** Tempo restante da sessão (exam) ou da questão atual (drill). */
export function remainingMs(state: SessionState, now: number): number {
  if (state.status === 'finished') return 0
  const { totalMs, perQuestionMs, startedAt } = state.config

  if (totalMs !== undefined) {
    return Math.max(0, totalMs - (now - startedAt))
  }
  if (perQuestionMs !== undefined) {
    return Math.max(0, perQuestionMs - (now - state.questionStartedAt))
  }
  return Number.POSITIVE_INFINITY
}

/** Quanto da sessão inteira já passou — para a barra de progresso do exam. */
export function elapsedTotalMs(state: SessionState, now: number): number {
  const fim = state.finishedAt ?? now
  return Math.max(0, fim - state.config.startedAt)
}

export function isFinished(state: SessionState): boolean {
  return state.status === 'finished'
}

// --- Transições --------------------------------------------------------------

/**
 * Registra a resposta e avança. Na simulação não há volta.
 * `chosenId` null significa pulada — sem penalidade (PRD §4.7).
 */
export function answer(state: SessionState, chosenId: string | null, now: number): SessionState {
  if (state.status === 'finished') return state
  const q = currentQuestion(state)
  if (!q) return finish(state, now)

  const registro: AnswerRecord = {
    questionId: q.id,
    tipo: q.tipo,
    difficulty: q.difficulty,
    chosenId,
    correct: chosenId !== null && chosenId === q.answerId,
    elapsedMs: Math.max(0, now - state.questionStartedAt),
    timedOut: false,
  }

  return avancar(state, registro, now)
}

export function skip(state: SessionState, now: number): SessionState {
  return answer(state, null, now)
}

/**
 * Passagem do tempo. Chamada pelo loop de render.
 *
 * - exam: estourou o total → sessão encerra imediatamente (PRD §4.3)
 * - drill: estourou a questão → conta como não respondida e avança (PRD §4.5)
 */
export function tick(state: SessionState, now: number): SessionState {
  if (state.status === 'finished') return state

  const { totalMs, perQuestionMs } = state.config

  if (totalMs !== undefined && now - state.config.startedAt >= totalMs) {
    return finish(state, state.config.startedAt + totalMs)
  }

  if (perQuestionMs !== undefined && now - state.questionStartedAt >= perQuestionMs) {
    const q = currentQuestion(state)
    if (!q) return finish(state, now)
    const estouro = state.questionStartedAt + perQuestionMs
    return avancar(
      state,
      {
        questionId: q.id,
        tipo: q.tipo,
        difficulty: q.difficulty,
        chosenId: null,
        correct: false,
        elapsedMs: perQuestionMs,
        timedOut: true,
      },
      estouro,
    )
  }

  return state
}

export function finish(state: SessionState, now: number): SessionState {
  if (state.status === 'finished') return state
  return { ...state, status: 'finished', finishedAt: now }
}

function avancar(state: SessionState, registro: AnswerRecord, now: number): SessionState {
  const answers = [...state.answers, registro]
  const proximo = state.index + 1

  const avancado: SessionState = {
    ...state,
    answers,
    index: proximo,
    questionStartedAt: now,
  }

  // Acabaram as questões, ou o relógio do exam já estourou no caminho.
  if (proximo >= state.config.questions.length) return finish(avancado, now)

  const { totalMs, startedAt } = state.config
  if (totalMs !== undefined && now - startedAt >= totalMs) {
    return finish(avancado, startedAt + totalMs)
  }

  return avancado
}
