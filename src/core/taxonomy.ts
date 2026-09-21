import type { LocalizedText } from './i18n'

/**
 * Fonte única da taxonomia do CCAT Trainer.
 *
 * Schema, geradores, gates, telas e páginas de teoria importam daqui.
 * Nenhum outro arquivo deve declarar uma string de tipo ou subtipo.
 */

export const TIPOS = [
  'verbal_analogy',
  'verbal_vocab',
  'verbal_logic',
  'math_series',
  'math_word',
  'spatial',
] as const

export type Tipo = (typeof TIPOS)[number]

export const SUBTIPOS = {
  verbal_analogy: ['analogia_simples', 'analogia_dupla'],
  verbal_vocab: ['antonimo', 'sinonimo', 'completar_frase'],
  verbal_logic: ['deducao'],
  math_series: ['serie_simples', 'serie_alternada', 'serie_dois_passos'],
  math_word: ['aritmetica', 'razao_proporcao', 'porcentagem', 'taxa'],
  spatial: ['rotacao', 'reflexao', 'odd_one_out', 'serie_formas', 'matriz'],
} as const satisfies Record<Tipo, readonly string[]>

export type Subtipo<T extends Tipo = Tipo> = (typeof SUBTIPOS)[T][number]
export type AnySubtipo = (typeof SUBTIPOS)[Tipo][number]

export const ALL_SUBTIPOS: readonly AnySubtipo[] = TIPOS.flatMap(
  (t) => SUBTIPOS[t] as readonly AnySubtipo[],
)

/**
 * Como o gabarito de cada tipo é verificado no gate G2.
 *
 *  - 'rule'         → o gerador é re-executado a partir da seed e o gabarito comparado
 *  - 'solver'       → tudo de 'rule' MAIS a avaliação da expressão canônica por um
 *                     parser independente. É o método mais forte: dois caminhos
 *                     separados precisam chegar ao mesmo número.
 *  - 'second-model' → um segundo modelo responde às cegas e precisa concordar
 *
 * Os tipos numéricos usam 'solver' justamente porque conseguem os dois caminhos;
 * o espacial só tem a regra, e o verbal não tem nenhum dos dois.
 */
export type VerificationMethod = 'rule' | 'solver' | 'second-model'

/**
 * Métodos ACEITOS por tipo — é uma lista porque o mesmo tipo pode chegar por
 * caminhos diferentes. O conteúdo verbal, por exemplo, é gerado por regra a
 * partir de um léxico curado ('rule'), mas se um dia entrar conteúdo escrito
 * diretamente por um modelo, ele precisa do aval de um segundo modelo.
 */
export const VERIFICATION_METHODS = {
  verbal_analogy: ['rule', 'second-model'],
  verbal_vocab: ['rule', 'second-model'],
  verbal_logic: ['rule', 'second-model'],
  math_series: ['solver'],
  math_word: ['solver'],
  spatial: ['rule'],
} as const satisfies Record<Tipo, readonly VerificationMethod[]>

export function acceptsVerification(tipo: Tipo, method: VerificationMethod): boolean {
  return (VERIFICATION_METHODS[tipo] as readonly VerificationMethod[]).includes(method)
}

/** Tipos cujo gabarito é provado por programa — nunca dependem de julgamento de modelo. */
export const PROGRAMMATIC_TIPOS = TIPOS.filter((t) =>
  (VERIFICATION_METHODS[t] as readonly VerificationMethod[]).includes('rule') ||
  (VERIFICATION_METHODS[t] as readonly VerificationMethod[]).includes('solver'),
)

export const DIFFICULTIES = [1, 2, 3, 4, 5] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

// --- Parâmetros da prova real (PRD §4.3, §4.5, §8) ---------------------------

/** 50 questões em 15 minutos. */
export const EXAM_QUESTION_COUNT = 50
export const EXAM_DURATION_MS = 15 * 60 * 1000

/** Ritmo da prova: ~18s por questão. Usado como relógio por questão no drill. */
export const DRILL_PER_QUESTION_MS = 18_000

/** Meta de banco aprovado para o v1. */
export const TARGET_APPROVED_PER_TIPO = 150

/**
 * Normas oficiais da CCAT (PRD §4.18).
 * `sd` alimenta a aproximação normal em core/norms.ts.
 */
export const CCAT_NORMS = {
  mean: 24.2,
  median: 24,
  sd: 8.58,
} as const

/**
 * Distribuição de tipos numa simulação de 50 questões.
 *
 * A Criteria não publica o mix exato da prova; este blueprint é uma aproximação
 * baseada na divisão aproximadamente igual entre verbal, matemática/lógica e
 * espacial. É config, não verdade — ajustar aqui muda a simulação inteira.
 */
export const EXAM_BLUEPRINT = {
  verbal_analogy: 7,
  verbal_vocab: 6,
  verbal_logic: 4,
  math_series: 7,
  math_word: 10,
  spatial: 16,
} as const satisfies Record<Tipo, number>

// --- Rótulos de UI ---------------------------------------------------------

/**
 * Nomes de tipo e subtipo nos dois idiomas.
 *
 * Ficam aqui, e não no catálogo de strings da interface, porque são parte da
 * taxonomia: quem adiciona um subtipo tem de dar nome a ele nos dois idiomas no
 * mesmo arquivo, e o `Record` completo torna isso erro de compilação.
 */
export const TIPO_LABEL: Record<Tipo, LocalizedText> = {
  verbal_analogy: { pt: 'Analogias', en: 'Analogies' },
  verbal_vocab: { pt: 'Vocabulário', en: 'Vocabulary' },
  verbal_logic: { pt: 'Lógica verbal', en: 'Verbal logic' },
  math_series: { pt: 'Séries numéricas', en: 'Number series' },
  math_word: { pt: 'Problemas matemáticos', en: 'Word problems' },
  spatial: { pt: 'Raciocínio espacial', en: 'Spatial reasoning' },
}

export const SUBTIPO_LABEL: Record<AnySubtipo, LocalizedText> = {
  analogia_simples: { pt: 'Analogia simples', en: 'Simple analogy' },
  analogia_dupla: { pt: 'Analogia dupla', en: 'Double analogy' },
  antonimo: { pt: 'Antônimo', en: 'Antonym' },
  sinonimo: { pt: 'Sinônimo', en: 'Synonym' },
  completar_frase: { pt: 'Completar frase', en: 'Sentence completion' },
  deducao: { pt: 'Dedução', en: 'Deduction' },
  serie_simples: { pt: 'Série simples', en: 'Simple series' },
  serie_alternada: { pt: 'Série alternada', en: 'Interleaved series' },
  serie_dois_passos: { pt: 'Série de dois passos', en: 'Two-step series' },
  aritmetica: { pt: 'Aritmética', en: 'Arithmetic' },
  razao_proporcao: { pt: 'Razão e proporção', en: 'Ratio and proportion' },
  porcentagem: { pt: 'Porcentagem', en: 'Percentage' },
  taxa: { pt: 'Taxa e velocidade', en: 'Rate and speed' },
  rotacao: { pt: 'Rotação', en: 'Rotation' },
  reflexao: { pt: 'Reflexão', en: 'Reflection' },
  odd_one_out: { pt: 'Qual não pertence', en: 'Odd one out' },
  serie_formas: { pt: 'Série de formas', en: 'Figure series' },
  matriz: { pt: 'Matriz', en: 'Matrix' },
}

// --- Helpers -----------------------------------------------------------------

export function isTipo(value: unknown): value is Tipo {
  return typeof value === 'string' && (TIPOS as readonly string[]).includes(value)
}

export function subtiposOf(tipo: Tipo): readonly AnySubtipo[] {
  return SUBTIPOS[tipo] as readonly AnySubtipo[]
}

/** Retorna o tipo ao qual um subtipo pertence, ou undefined se não existir. */
export function tipoOfSubtipo(subtipo: string): Tipo | undefined {
  return TIPOS.find((t) => (SUBTIPOS[t] as readonly string[]).includes(subtipo))
}
