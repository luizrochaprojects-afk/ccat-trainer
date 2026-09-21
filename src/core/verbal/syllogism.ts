/**
 * Silogismos categóricos com validade **provada**, não julgada.
 *
 * Cada conclusão candidata é verificada por model checking: enumeramos todos os
 * modelos finitos pequenos dos três predicados e perguntamos se existe algum em
 * que as premissas valem e a conclusão falha. Se não existe, a conclusão se
 * segue; se existe, é distrator — e o contramodelo é a prova de que é distrator.
 *
 * Isso tira o verbal_logic da dependência de julgamento de modelo: o gabarito é
 * teorema.
 *
 * Convenção: lógica moderna, **sem importação existencial**. "All A are B" não
 * implica que exista algum A. É por isso que "All A are C" não entrega
 * "Some A are C" — e essa é justamente uma das armadilhas clássicas.
 */

export type Quantifier = 'all' | 'no' | 'some' | 'some-not'

export interface Statement {
  quantifier: Quantifier
  /** índice do predicado sujeito (0=A, 1=B, 2=C) */
  subject: number
  /** índice do predicado predicado */
  predicate: number
}

export const PREDICATE_COUNT = 3

/** Tamanho do domínio varrido. 3 basta para refutar as formas silogísticas. */
const DOMAIN_SIZE = 3

/**
 * A conclusão se segue necessariamente das premissas?
 *
 * Varre 2^(3×3) = 512 modelos. Para silogismos categóricos com 3 predicados,
 * um domínio de 3 elementos é suficiente: qualquer inferência inválida tem
 * contramodelo desse tamanho.
 */
export function entails(premises: Statement[], conclusion: Statement): boolean {
  return findCountermodel(premises, conclusion) === null
}

/** Devolve um modelo onde as premissas valem e a conclusão falha, ou null. */
export function findCountermodel(
  premises: Statement[],
  conclusion: Statement,
): boolean[][] | null {
  const totalBits = PREDICATE_COUNT * DOMAIN_SIZE

  for (let mask = 0; mask < 1 << totalBits; mask++) {
    const modelo = decodeModel(mask)
    if (!premises.every((p) => holds(p, modelo))) continue
    if (!holds(conclusion, modelo)) return modelo
  }
  return null
}

function decodeModel(mask: number): boolean[][] {
  const modelo: boolean[][] = []
  let bit = 0
  for (let p = 0; p < PREDICATE_COUNT; p++) {
    const extensao: boolean[] = []
    for (let x = 0; x < DOMAIN_SIZE; x++) {
      extensao.push(((mask >> bit) & 1) === 1)
      bit++
    }
    modelo.push(extensao)
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
