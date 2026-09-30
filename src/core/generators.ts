import type { Question, SpatialSpec, StemTable } from './schema'
import { DIFFICULTIES, TIPOS, type Difficulty, type Tipo } from './taxonomy'
import type { LocalizedText } from './i18n'
import { SPATIAL_GENERATORS } from './spatial/generators'
import { SERIES_GENERATORS } from './math/series'
import { LETRAS_GENERATORS } from './math/letras'
import { WORD_GENERATORS } from './math/word'
import { CALCULO_GENERATORS } from './math/calculo'
import { NIVEIS_TABELA, TABLE_GENERATORS } from './math/table'
import { VERBAL_GENERATORS } from './verbal/generators'
import { DETAIL_GENERATORS } from './detail/comparacao'
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
  stemTable?: StemTable
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

  // math_series de letras — verificação por regra + leitor de letras no gate.
  // Sem `expression`: a resposta é texto, e buildQuestion grava o método 'rule'.
  ...Object.fromEntries(
    Object.entries(LETRAS_GENERATORS).map(([id, fn]) => [
      id,
      comTipo('math_series', (seed, d) => {
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

  // math_word — verificação por solver (cálculo básico inclusive: comparação
  // vira min/max/nearest na expressão)
  ...Object.fromEntries(
    Object.entries({ ...WORD_GENERATORS, ...CALCULO_GENERATORS }).map(([id, fn]) => [
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

  // math_word / leitura de tabela — solver quando a resposta é um valor, regra
  // quando é "qual linha" (ver VERIFICATION_METHODS)
  ...Object.fromEntries(
    Object.entries(TABLE_GENERATORS).map(([id, fn]) => [
      id,
      comTipo('math_word', (seed, d) => {
        const q = fn(seed, d)
        return {
          subtipo: q.subtipo,
          stem: q.stem,
          stemTable: q.stemTable,
          options: q.options,
          answerId: q.answerId,
          explanation: q.explanation,
          ...(q.expression !== undefined ? { expression: q.expression } : {}),
          ...(q.answerValue !== undefined ? { answerValue: q.answerValue } : {}),
        }
      }),
    ]),
  ),

  // verbal_detail — verificação por regra: conferência mecânica de strings
  ...Object.fromEntries(
    Object.entries(DETAIL_GENERATORS).map(([id, fn]) => [
      id,
      comTipo('verbal_detail', (seed, d) => {
        const q = fn(seed, d)
        return {
          subtipo: q.subtipo,
          stem: q.stem,
          stemTable: q.stemTable,
          options: q.options,
          answerId: q.answerId,
          explanation: q.explanation,
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

/**
 * Níveis em que cada gerador existe. Quase todos cobrem 1–5; a leitura de
 * tabela começa no 2, como na prova, e pedir o nível 1 a ela é erro.
 */
const NIVEIS_POR_GERADOR: Record<string, readonly Difficulty[]> = {
  tabela: NIVEIS_TABELA,
}

export function generatorLevels(id: string): readonly Difficulty[] {
  return NIVEIS_POR_GERADOR[id] ?? DIFFICULTIES
}

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
    ...(g.stemTable ? { stemTable: g.stemTable } : {}),
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
