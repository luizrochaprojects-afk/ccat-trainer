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
  'verbal_detail',
  'math_series',
  'math_word',
  'spatial',
] as const

export type Tipo = (typeof TIPOS)[number]

export const SUBTIPOS = {
  verbal_analogy: ['analogia_simples', 'analogia_dupla', 'analogia_lacuna'],
  verbal_vocab: ['antonimo', 'sinonimo', 'completar_frase', 'completar_frase_dupla'],
  verbal_logic: ['deducao', 'verdadeiro_falso', 'ordenacao'],
  verbal_detail: ['comparacao'],
  math_series: ['serie_simples', 'serie_alternada', 'serie_dois_passos', 'serie_letras'],
  math_word: ['aritmetica', 'razao_proporcao', 'porcentagem', 'taxa', 'calculo_basico', 'tabela'],
  spatial: ['rotacao', 'reflexao', 'odd_one_out', 'serie_formas', 'matriz', 'identical_pair'],
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
 *
 * Exceção numérica: a leitura de tabela que pergunta QUAL LINHA vence. A
 * resposta é um rótulo ("Westgate"), não um número, e o solver não tem o que
 * comparar — ela é provada pela regra. O gate só aceita 'rule' em matemática
 * quando a alternativa marcada não é número; resposta numérica continua
 * obrigada ao solver.
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
  // Comparação de colunas é conferência mecânica de strings: a regra basta, e
  // não há motivo para aceitar julgamento de modelo onde o programa decide.
  verbal_detail: ['rule'],
  math_series: ['solver'],
  math_word: ['solver', 'rule'],
  spatial: ['rule'],
} as const satisfies Record<Tipo, readonly VerificationMethod[]>

/**
 * Exceções por subtipo, quando o método do tipo não cabe nele.
 *
 * Série de letras é math_series, mas letra não vira número: não há expressão
 * para o solver avaliar. Ela é provada pela regra re-executada MAIS o leitor de
 * séries de letras do gate (core/math/alfabeto.ts), que reconstrói a regra só a
 * partir do enunciado — os mesmos dois caminhos do 'solver', com outro
 * avaliador. A exceção é por subtipo, e não no tipo inteiro, para que uma série
 * numérica nunca passe só pela regra.
 */
export const VERIFICATION_METHODS_POR_SUBTIPO: Partial<
  Record<AnySubtipo, readonly VerificationMethod[]>
> = {
  serie_letras: ['rule'],
}

/** Métodos aceitos para um tipo, já com a exceção do subtipo quando houver. */
export function verificationMethodsOf(
  tipo: Tipo,
  subtipo?: string,
): readonly VerificationMethod[] {
  const excecao = subtipo ? VERIFICATION_METHODS_POR_SUBTIPO[subtipo as AnySubtipo] : undefined
  return excecao ?? (VERIFICATION_METHODS[tipo] as readonly VerificationMethod[])
}

export function acceptsVerification(
  tipo: Tipo,
  method: VerificationMethod,
  subtipo?: string,
): boolean {
  return verificationMethodsOf(tipo, subtipo).includes(method)
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

/**
 * Toda questão da CCAT tem 5 alternativas — as amostras oficiais confirmam,
 * inclusive nas fáceis. Com 4 nos níveis baixos o chute acertava 25% em vez de
 * 20% e a eliminação ficava mais curta que na prova de verdade.
 */
export const OPCOES_POR_QUESTAO = 5

/**
 * Exceção por subtipo ao número de alternativas. "Verdadeiro, falso ou
 * incerto" tem exatamente três na prova real — True, False, Uncertain —, e
 * inventar duas a mais mudaria a questão. Schema, gates e geradores perguntam
 * por aqui; o resto continua exigindo 5.
 */
export const OPCOES_POR_SUBTIPO: Partial<Record<AnySubtipo, number>> = {
  verdadeiro_falso: 3,
}

/** Quantas alternativas uma questão gerada deste subtipo tem. */
export function opcoesDoSubtipo(subtipo: string): number {
  return OPCOES_POR_SUBTIPO[subtipo as AnySubtipo] ?? OPCOES_POR_QUESTAO
}

/**
 * Subtipos em que a resposta aparece no enunciado por natureza: em "verdadeiro,
 * falso ou incerto" o próprio enunciado pergunta se a frase é "true", e na
 * ordenação as alternativas são nomes das pessoas listadas. O gate não pode
 * tratar isso como enunciado que entrega a resposta.
 */
export const RESPOSTA_CITADA_NO_ENUNCIADO: readonly AnySubtipo[] = ['verdadeiro_falso', 'ordenacao']
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
 * A Criteria não publica o mix exato da prova. Este segue as contagens por tipo
 * da JobTestPrep, a fonte mais detalhada que existe: matemática e lógica são o
 * maior bloco (~22), verbal vem em seguida (~16) e espacial é o menor (~12).
 * Dentro do verbal, completar frase é o formato mais comum, por isso
 * vocabulário pesa mais que analogia; na matemática, problemas de texto
 * (com cálculo básico e tabela) dominam e série é só 1–2 por prova real.
 * É config, não verdade — ajustar aqui muda a simulação inteira.
 */
export const EXAM_BLUEPRINT = {
  verbal_analogy: 5,
  verbal_vocab: 8,
  verbal_logic: 5,
  verbal_detail: 3,
  math_series: 3,
  math_word: 14,
  spatial: 12,
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
  verbal_detail: { pt: 'Atenção a detalhes', en: 'Attention to detail' },
  math_series: { pt: 'Séries', en: 'Series' },
  math_word: { pt: 'Problemas matemáticos', en: 'Word problems' },
  spatial: { pt: 'Raciocínio espacial', en: 'Spatial reasoning' },
}

export const SUBTIPO_LABEL: Record<AnySubtipo, LocalizedText> = {
  analogia_simples: { pt: 'Analogia simples', en: 'Simple analogy' },
  analogia_dupla: { pt: 'Analogia dupla', en: 'Double analogy' },
  antonimo: { pt: 'Antônimo', en: 'Antonym' },
  sinonimo: { pt: 'Sinônimo', en: 'Synonym' },
  analogia_lacuna: { pt: 'Analogia com lacuna', en: 'Missing-word analogy' },
  completar_frase: { pt: 'Completar frase', en: 'Sentence completion' },
  completar_frase_dupla: { pt: 'Completar frase (duas lacunas)', en: 'Two-blank sentence completion' },
  deducao: { pt: 'Dedução', en: 'Deduction' },
  verdadeiro_falso: { pt: 'Verdadeiro, falso ou incerto', en: 'True, false or uncertain' },
  ordenacao: { pt: 'Ordenação', en: 'Ordering puzzle' },
  comparacao: { pt: 'Comparação de colunas', en: 'Column comparison' },
  serie_simples: { pt: 'Série simples', en: 'Simple series' },
  serie_alternada: { pt: 'Série alternada', en: 'Interleaved series' },
  serie_dois_passos: { pt: 'Série de dois passos', en: 'Two-step series' },
  serie_letras: { pt: 'Série de letras', en: 'Letter series' },
  aritmetica: { pt: 'Aritmética', en: 'Arithmetic' },
  razao_proporcao: { pt: 'Razão e proporção', en: 'Ratio and proportion' },
  porcentagem: { pt: 'Porcentagem', en: 'Percentage' },
  taxa: { pt: 'Taxa e velocidade', en: 'Rate and speed' },
  calculo_basico: { pt: 'Cálculo e comparação', en: 'Calculation and comparison' },
  tabela: { pt: 'Leitura de tabela', en: 'Table reading' },
  rotacao: { pt: 'Rotação', en: 'Rotation' },
  reflexao: { pt: 'Reflexão', en: 'Reflection' },
  odd_one_out: { pt: 'Qual não pertence', en: 'Odd one out' },
  serie_formas: { pt: 'Série de formas', en: 'Figure series' },
  matriz: { pt: 'Matriz', en: 'Matrix' },
  identical_pair: { pt: 'Comparação visual', en: 'Visual comparison' },
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
