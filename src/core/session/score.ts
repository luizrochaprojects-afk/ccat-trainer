import { rawToPercentile } from '../norms'
import { EXAM_QUESTION_COUNT, TIPOS, type Tipo } from '../taxonomy'
import type { AnswerRecord, SessionState } from './engine'

/**
 * Apuração da sessão (PRD §4.17–4.19).
 *
 * `reached` (questões alcançadas dentro do tempo) é separado de `total` de
 * propósito: na CCAT a maioria não termina as 50, e não distinguir "errei" de
 * "nem cheguei lá" esconde exatamente o diagnóstico que interessa — se o
 * problema é precisão ou ritmo.
 */

export interface TipoBreakdown {
  tipo: Tipo
  reached: number
  correct: number
  /** null quando não chegou a nenhuma questão do tipo */
  accuracy: number | null
  avgMs: number | null
}

export interface SessionScore {
  mode: 'exam' | 'drill'
  /** acertos */
  raw: number
  /** questões que chegaram a ser vistas dentro do tempo */
  reached: number
  /** tamanho da fila composta */
  total: number
  /** não respondidas por estouro de relógio */
  timedOut: number
  /** puladas deliberadamente */
  skipped: number
  accuracy: number | null
  avgMs: number | null
  /** só faz sentido na simulação completa */
  percentile: number | null
  durationMs: number
  /**
   * A sessão acabou porque o tempo esgotou (true) ou porque o usuário encerrou
   * antes (false). São diagnósticos opostos — "o relógio te cortou" é um
   * problema de ritmo; "você parou" não é problema nenhum — e a tela de
   * resultado precisa dizer a coisa certa.
   */
  endedByTimeout: boolean
  byTipo: TipoBreakdown[]
  /** tipo com menor acurácia entre os que tiveram ao menos 3 questões */
  weakestTipo: Tipo | null
}

export function scoreSession(state: SessionState, now: number): SessionScore {
  const { answers, config } = state
  const durationMs = Math.max(0, (state.finishedAt ?? now) - config.startedAt)
  const reached = answers.length
  const raw = answers.filter((a) => a.correct).length
  const timedOut = answers.filter((a) => a.timedOut).length
  const skipped = answers.filter((a) => !a.timedOut && a.chosenId === null).length

  const byTipo = TIPOS.map((tipo) => breakdown(tipo, answers)).filter((b) => b.reached > 0)

  return {
    mode: config.mode,
    raw,
    reached,
    total: config.questions.length,
    timedOut,
    skipped,
    accuracy: reached > 0 ? raw / reached : null,
    avgMs: media(answers.map((a) => a.elapsedMs)),
    // O percentil da CCAT é definido sobre a prova inteira de 50 questões.
    // Aplicá-lo a um drill de 10 questões produziria um número sem significado.
    percentile: config.mode === 'exam' ? rawToPercentile(raw) : null,
    durationMs,
    endedByTimeout: esgotouTempo(state, durationMs),
    byTipo,
    weakestTipo: maisFraco(byTipo),
  }
}

/**
 * Terminou por tempo?
 *
 * No exam, quando a duração bate no orçamento. No drill, quando todas as
 * questões alcançadas estouraram o relógio — aí o ritmo é o diagnóstico, não
 * a precisão.
 */
function esgotouTempo(state: SessionState, durationMs: number): boolean {
  const { totalMs } = state.config
  if (totalMs !== undefined) return durationMs >= totalMs
  const respondidas = state.answers.length
  return respondidas > 0 && state.answers.every((a) => a.timedOut)
}

function breakdown(tipo: Tipo, answers: AnswerRecord[]): TipoBreakdown {
  const doTipo = answers.filter((a) => a.tipo === tipo)
  const correct = doTipo.filter((a) => a.correct).length
  return {
    tipo,
    reached: doTipo.length,
    correct,
    accuracy: doTipo.length > 0 ? correct / doTipo.length : null,
    avgMs: media(doTipo.map((a) => a.elapsedMs)),
  }
}

/**
 * Exige um mínimo de questões antes de apontar um tipo como fraco: com uma ou
 * duas questões, 0% de acurácia é ruído, e mandar o usuário estudar o tipo
 * errado custa a sessão seguinte inteira.
 */
const MINIMO_PARA_DIAGNOSTICO = 3

function maisFraco(byTipo: TipoBreakdown[]): Tipo | null {
  const elegiveis = byTipo.filter((b) => b.reached >= MINIMO_PARA_DIAGNOSTICO)
  if (elegiveis.length < 2) return null

  const acuracias = elegiveis.map((b) => b.accuracy ?? 1)
  const pior = Math.min(...acuracias)
  const melhor = Math.max(...acuracias)

  // Sem diferença entre os tipos, não há ponto fraco — só ruído. Quem acertou
  // 50 de 50 não pode sair da tela lendo "seu ponto mais fraco: Analogias".
  if (pior === melhor) return null

  return elegiveis.find((b) => (b.accuracy ?? 1) === pior)!.tipo
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null
  return valores.reduce((a, b) => a + b, 0) / valores.length
}

/** Ritmo necessário para terminar as 50 questões no tempo da prova. */
export function paceTargetMs(): number {
  return Math.round((15 * 60 * 1000) / EXAM_QUESTION_COUNT)
}
