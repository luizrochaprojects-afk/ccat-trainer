/**
 * Silogismos categóricos com validade **provada**, não julgada.
 *
 * Cada conclusão candidata é verificada por model checking: enumeramos todos os
 * modelos dos três predicados e perguntamos se existe algum em que as premissas
 * valem e a conclusão falha. Se não existe, a conclusão se segue; se existe, é
 * distrator — e o contramodelo é a prova de que é distrator.
 *
 * Isso tira o verbal_logic da dependência de julgamento de modelo: o gabarito é
 * teorema.
 *
 * Duas semânticas, e a questão precisa sobreviver às duas:
 *
 * - **Booleana** (lógica moderna, padrão): classes podem ser vazias. "All A are
 *   B" não implica que exista algum A.
 * - **Com importação existencial** (lógica tradicional): todo termo nomeado tem
 *   ao menos um membro. É como a CCAT e quase todo candidato leem "All
 *   engineers are analysts" — ninguém imagina que não existam engenheiros.
 *
 * O gabarito tem de valer na booleana (vale para todo leitor, porque os modelos
 * com importação são um subconjunto). O distrator tem de falhar na com
 * importação: se "Some A are B" só não se segue porque A poderia ser vazio, ele
 * é uma segunda resposta defensável, não um distrator.
 */

export type Quantifier = 'all' | 'no' | 'some' | 'some-not'

export interface Statement {
  quantifier: Quantifier
  /** índice do predicado sujeito (0=A, 1=B, 2=C) */
  subject: number
  /** índice do predicado predicado */
  predicate: number
}

export interface Semantics {
  /**
   * Restringe os modelos aos que têm os três predicados não vazios. Omitido,
   * vale a semântica booleana (classes vazias permitidas).
   */
  existentialImport?: boolean
}

export const PREDICATE_COUNT = 3

/** Regiões do diagrama de Venn de 3 predicados: cada bit de `r` diz se está em A, B, C. */
const REGION_COUNT = 1 << PREDICATE_COUNT

/**
 * A conclusão se segue necessariamente das premissas?
 *
 * Em lógica monádica, a verdade de qualquer afirmação categórica depende só de
 * QUAIS regiões do diagrama de Venn estão ocupadas, não de quantos elementos há
 * em cada uma. Então varrer os 2^8 = 256 padrões de ocupação é exaustivo — não
 * é amostragem, não há contramodelo que escape.
 */
export function entails(
  premises: Statement[],
  conclusion: Statement,
  semantics: Semantics = {},
): boolean {
  return findCountermodel(premises, conclusion, semantics) === null
}

/**
 * Devolve um modelo onde as premissas valem e a conclusão falha, ou null.
 *
 * O modelo vem como `modelo[predicado][elemento]`, com um elemento por região
 * ocupada.
 */
export function findCountermodel(
  premises: Statement[],
  conclusion: Statement,
  semantics: Semantics = {},
): boolean[][] | null {
  for (const modelo of modelsFor(semantics)) {
    if (!premises.every((p) => holds(p, modelo))) continue
    if (!holds(conclusion, modelo)) return modelo
  }
  return null
}

/**
 * As premissas admitem algum modelo? Com importação existencial, premissas
 * incompatíveis com termos não vazios implicariam qualquer coisa — questão
 * degenerada.
 */
export function isSatisfiable(premises: Statement[], semantics: Semantics = {}): boolean {
  return modelsFor(semantics).some((m) => premises.every((p) => holds(p, m)))
}

const MODELOS_BOOLEANOS: boolean[][][] = Array.from({ length: 1 << REGION_COUNT }, (_, mask) =>
  decodeModel(mask),
)
const MODELOS_COM_IMPORTACAO = MODELOS_BOOLEANOS.filter((m) =>
  m.every((extensao) => extensao.some(Boolean)),
)

function modelsFor(semantics: Semantics): boolean[][][] {
  return semantics.existentialImport ? MODELOS_COM_IMPORTACAO : MODELOS_BOOLEANOS
}

/** Cada bit de `mask` liga uma região; cada região ocupada vira um elemento. */
function decodeModel(mask: number): boolean[][] {
  const regioes: number[] = []
  for (let r = 0; r < REGION_COUNT; r++) if ((mask >> r) & 1) regioes.push(r)

  const modelo: boolean[][] = []
  for (let p = 0; p < PREDICATE_COUNT; p++) {
    modelo.push(regioes.map((r) => ((r >> p) & 1) === 1))
  }
  return modelo
}

function holds(s: Statement, modelo: boolean[][]): boolean {
  const S = modelo[s.subject] as boolean[]
  const P = modelo[s.predicate] as boolean[]

  switch (s.quantifier) {
    case 'all': // ∀x. S(x) → P(x)
      return S.every((temS, x) => !temS || (P[x] as boolean))
    case 'no': // ∀x. S(x) → ¬P(x)
      return S.every((temS, x) => !temS || !(P[x] as boolean))
    case 'some': // ∃x. S(x) ∧ P(x)
      return S.some((temS, x) => temS && (P[x] as boolean))
    case 'some-not': // ∃x. S(x) ∧ ¬P(x)
      return S.some((temS, x) => temS && !(P[x] as boolean))
  }
}

// --- Superfície em inglês ----------------------------------------------------

/** Renderiza a afirmação em inglês, com os nomes dos três termos. */
export function renderStatement(s: Statement, termos: string[]): string {
  const S = termos[s.subject] as string
  const P = termos[s.predicate] as string

  switch (s.quantifier) {
    case 'all':
      return `All ${S} are ${P}.`
    case 'no':
      return `No ${S} are ${P}.`
    case 'some':
      return `Some ${S} are ${P}.`
    case 'some-not':
      return `Some ${S} are not ${P}.`
  }
}

/** Todas as afirmações possíveis sobre dois predicados distintos. */
export function allStatements(): Statement[] {
  const quantificadores: Quantifier[] = ['all', 'no', 'some', 'some-not']
  const out: Statement[] = []
  for (let subject = 0; subject < PREDICATE_COUNT; subject++) {
    for (let predicate = 0; predicate < PREDICATE_COUNT; predicate++) {
      if (subject === predicate) continue
      for (const quantifier of quantificadores) {
        out.push({ quantifier, subject, predicate })
      }
    }
  }
  return out
}

export function sameStatement(a: Statement, b: Statement): boolean {
  return a.quantifier === b.quantifier && a.subject === b.subject && a.predicate === b.predicate
}

/**
 * Formas silogísticas válidas usadas como espinha dorsal das questões.
 * A validade de cada uma é reconferida pelo model checker nos testes — a lista
 * é conveniência, não fonte de verdade.
 */
export const VALID_FORMS: {
  id: string
  premises: Statement[]
  conclusion: Statement
  level: 1 | 2 | 3 | 4 | 5
}[] = [
  {
    id: 'barbara',
    // All A are B. All B are C. ⟹ All A are C.
    premises: [
      { quantifier: 'all', subject: 0, predicate: 1 },
      { quantifier: 'all', subject: 1, predicate: 2 },
    ],
    conclusion: { quantifier: 'all', subject: 0, predicate: 2 },
    level: 1,
  },
  {
    id: 'celarent',
    // All A are B. No B are C. ⟹ No A are C.
    premises: [
      { quantifier: 'all', subject: 0, predicate: 1 },
      { quantifier: 'no', subject: 1, predicate: 2 },
    ],
    conclusion: { quantifier: 'no', subject: 0, predicate: 2 },
    level: 2,
  },
  {
    id: 'cesare',
    // No C are B. All A are B. ⟹ No A are C.
    premises: [
      { quantifier: 'no', subject: 2, predicate: 1 },
      { quantifier: 'all', subject: 0, predicate: 1 },
    ],
    conclusion: { quantifier: 'no', subject: 0, predicate: 2 },
    level: 1,
  },
  {
    id: 'darii',
    // All B are C. Some A are B. ⟹ Some A are C.
    premises: [
      { quantifier: 'all', subject: 1, predicate: 2 },
      { quantifier: 'some', subject: 0, predicate: 1 },
    ],
    conclusion: { quantifier: 'some', subject: 0, predicate: 2 },
    level: 2,
  },
  {
    id: 'datisi',
    // All B are C. Some B are A. ⟹ Some A are C.
    premises: [
      { quantifier: 'all', subject: 1, predicate: 2 },
      { quantifier: 'some', subject: 1, predicate: 0 },
    ],
    conclusion: { quantifier: 'some', subject: 0, predicate: 2 },
    level: 2,
  },
  {
    id: 'ferio',
    // No B are C. Some A are B. ⟹ Some A are not C.
    premises: [
      { quantifier: 'no', subject: 1, predicate: 2 },
      { quantifier: 'some', subject: 0, predicate: 1 },
    ],
    conclusion: { quantifier: 'some-not', subject: 0, predicate: 2 },
    level: 3,
  },
  {
    id: 'disamis',
    // Some B are A. All B are C. ⟹ Some A are C.
    premises: [
      { quantifier: 'some', subject: 1, predicate: 0 },
      { quantifier: 'all', subject: 1, predicate: 2 },
    ],
    conclusion: { quantifier: 'some', subject: 0, predicate: 2 },
    level: 3,
  },
  {
    id: 'dimaris',
    // Some C are B. All B are A. ⟹ Some A are C.
    premises: [
      { quantifier: 'some', subject: 2, predicate: 1 },
      { quantifier: 'all', subject: 1, predicate: 0 },
    ],
    conclusion: { quantifier: 'some', subject: 0, predicate: 2 },
    level: 3,
  },
  {
    id: 'festino',
    // No C are B. Some A are B. ⟹ Some A are not C.
    premises: [
      { quantifier: 'no', subject: 2, predicate: 1 },
      { quantifier: 'some', subject: 0, predicate: 1 },
    ],
    conclusion: { quantifier: 'some-not', subject: 0, predicate: 2 },
    level: 4,
  },
  {
    id: 'ferison',
    // No B are C. Some B are A. ⟹ Some A are not C.
    premises: [
      { quantifier: 'no', subject: 1, predicate: 2 },
      { quantifier: 'some', subject: 1, predicate: 0 },
    ],
    conclusion: { quantifier: 'some-not', subject: 0, predicate: 2 },
    level: 4,
  },
  {
    id: 'camenes',
    // All C are B. No B are A. ⟹ No A are C.
    premises: [
      { quantifier: 'all', subject: 2, predicate: 1 },
      { quantifier: 'no', subject: 1, predicate: 0 },
    ],
    conclusion: { quantifier: 'no', subject: 0, predicate: 2 },
    level: 4,
  },
  {
    id: 'camestres',
    // All C are B. No A are B. ⟹ No A are C.
    premises: [
      { quantifier: 'all', subject: 2, predicate: 1 },
      { quantifier: 'no', subject: 0, predicate: 1 },
    ],
    conclusion: { quantifier: 'no', subject: 0, predicate: 2 },
    level: 5,
  },
  {
    id: 'baroco',
    // All C are B. Some A are not B. ⟹ Some A are not C.
    premises: [
      { quantifier: 'all', subject: 2, predicate: 1 },
      { quantifier: 'some-not', subject: 0, predicate: 1 },
    ],
    conclusion: { quantifier: 'some-not', subject: 0, predicate: 2 },
    level: 5,
  },
  {
    id: 'bocardo',
    // Some B are not C. All B are A. ⟹ Some A are not C.
    premises: [
      { quantifier: 'some-not', subject: 1, predicate: 2 },
      { quantifier: 'all', subject: 1, predicate: 0 },
    ],
    conclusion: { quantifier: 'some-not', subject: 0, predicate: 2 },
    level: 5,
  },
  {
    id: 'fresison',
    // No C are B. Some B are A. ⟹ Some A are not C.
    premises: [
      { quantifier: 'no', subject: 2, predicate: 1 },
      { quantifier: 'some', subject: 1, predicate: 0 },
    ],
    conclusion: { quantifier: 'some-not', subject: 0, predicate: 2 },
    level: 5,
  },
]
