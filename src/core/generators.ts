import type { Question, SpatialSpec } from './schema'
import { TIPOS, type Difficulty, type Tipo } from './taxonomy'
import type { LocalizedText } from './i18n'
import { SPATIAL_GENERATORS } from './spatial/generators'
import { SERIES_GENERATORS } from './math/series'
import { WORD_GENERATORS } from './math/word'
import { VERBAL_GENERATORS } from './verbal/generators'
import { seedFromString } from './rng'

/**
 * Registro único dos geradores determinísticos.
 *
 * O pipeline grava apenas `(generator, seed, difficulty)` na questão; o gate
 * re-executa por aqui e compara. Sem esse registro, "verificar o gabarito"
 * viraria confiar no JSON que o próprio gerador escreveu.
 */

export interface Generated {
  tipo: Tipo
  subtipo: string
  stem: string
  stemSpatial?: SpatialSpec
  options: { id: string; text?: string; spatial?: SpatialSpec }[]
  answerId: string
  explanation: LocalizedText
  /** presente apenas nos tipos com verificação por solver */
  expression?: string
  answerValue?: number
}

export type GeneratorFn = (seed: number, difficulty: Difficulty) => Generated

function comTipo(tipo: Tipo, fn: (s: number, d: Difficulty) => Omit<Generated, 'tipo'>): GeneratorFn {
  return (seed, difficulty) => ({ tipo, ...fn(seed, difficulty) })
}

/** A qual tipo pertence cada gerador verbal. */
const VERBAL_TIPO: Record<string, Tipo> = {
  analogia: 'verbal_analogy',
  antonimo: 'verbal_vocab',
  sinonimo: 'verbal_vocab',
  completar_frase: 'verbal_vocab',
  deducao: 'verbal_logic',
}

export const GENERATORS: Record<string, GeneratorFn> = {
  // spatial — verificação por regra
  ...Object.fromEntries(
    Object.entries(SPATIAL_GENERATORS).map(([id, fn]) => [
      id,
      comTipo('spatial', (seed, d) => {
        const q = fn(seed, d)
        return {
          subtipo: q.subtipo,
          stem: q.stem,
          ...(q.stemSpatial ? { stemSpatial: q.stemSpatial } : {}),
          options: q.options,
          answerId: q.answerId,
          explanation: q.explanation,
        }
      }),
    ]),
  ),

  // math_series — verificação por regra + solver
  ...Object.fromEntries(
    Object.entries(SERIES_GENERATORS).map(([id, fn]) => [
      id,
      comTipo('math_series', (seed, d) => {
        const q = fn(seed, d)
        return {
          subtipo: q.subtipo,
          stem: q.stem,
          options: q.options,
          answerId: q.answerId,
          explanation: q.explanation,
          expression: q.expression,
          answerValue: q.answerValue,
        }
      }),
    ]),
  ),

  // math_word — verificação por solver
  ...Object.fromEntries(
    Object.entries(WORD_GENERATORS).map(([id, fn]) => [
      id,
      comTipo('math_word', (seed, d) => {
        const q = fn(seed, d)
        return {
          subtipo: q.subtipo,
          stem: q.stem,
          options: q.options,
          answerId: q.answerId,
          explanation: q.explanation,
          expression: q.expression,
          answerValue: q.answerValue,
        }
      }),
    ]),
  ),

  // verbal — verificação por regra, a partir do léxico curado
  ...Object.fromEntries(
    Object.entries(VERBAL_GENERATORS).map(([id, fn]) => [
      id,
      comTipo(VERBAL_TIPO[id] as Tipo, (seed, d) => {
        const q = fn(seed, d)
        return {
          subtipo: q.subtipo,
          stem: q.stem,
          options: q.options,
          answerId: q.answerId,
          explanation: q.explanation,
        }
      }),
    ]),
  ),
}

export const GENERATOR_IDS = Object.keys(GENERATORS)

/** Tipos cobertos por gerador determinístico — os demais dependem de LLM. */
export const GENERATED_TIPOS: Tipo[] = [...TIPOS]

export function runGenerator(id: string, seed: number, difficulty: Difficulty): Generated {
  const fn = GENERATORS[id]
  if (!fn) throw new Error(`gerador desconhecido: "${id}"`)
  return fn(seed, difficulty)
}

/** Ids determinísticos e legíveis — a mesma questão sempre tem o mesmo id. */
export function questionId(generator: string, seed: number, difficulty: Difficulty): string {
  return `${generator}-d${difficulty}-${String(seed).padStart(5, '0')}`
}

/**
 * Monta a questão em formato de banco a partir de um gerador determinístico.
 * Nasce sempre como `draft` (PRD §4.12) — quem promove é o gate.
 */
export function buildQuestion(
  generator: string,
  seed: number,
  difficulty: Difficulty,
  createdAt: string,
): Question {
  const g = runGenerator(generator, seed, difficulty)
  const usaSolver = g.expression !== undefined

  return {
    id: questionId(generator, seed, difficulty),
    tipo: g.tipo,
    subtipo: g.subtipo,
    difficulty,
    stem: g.stem,
    ...(g.stemSpatial ? { stemSpatial: g.stemSpatial } : {}),
    options: g.options,
    answerId: g.answerId,
    explanation: g.explanation,
    theoryRef: `${g.tipo}.md#${g.subtipo}`,
    origin: 'claude-code',
    status: 'draft',
    verification: {
      method: usaSolver ? 'solver' : 'rule',
      seed,
      generator,
      ...(g.expression ? { expression: g.expression } : {}),
      checkedAt: createdAt,
    },
    createdAt,
  } as Question
}

/** Seed reprodutível a partir de um rótulo, para lotes nomeados. */
export function seedFor(label: string): number {
  return seedFromString(label)
}
