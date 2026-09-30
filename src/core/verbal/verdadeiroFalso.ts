import { mulberry32, type Rng } from '../rng'
import { optionIdAt } from '../optionIds'
import type { Difficulty } from '../taxonomy'
import type { LocalizedText } from '../i18n'
import type { VerbalGenerated, VerbalGenerator } from './generators'
import { LOGIC_TERMS } from './lexicon'
import {
  allStatements,
  entails,
  isSatisfiable,
  renderStatement,
  VALID_FORMS,
  type Quantifier,
  type Statement,
} from './syllogism'

/**
 * "Verdadeiro, falso ou incerto" — o formato da CCAT em que vêm duas ou três
 * premissas e uma afirmação, e a pergunta é se ela é True, False ou Uncertain.
 *
 * O veredito é provado por enumeração, nunca julgado: listamos TODOS os
 * cenários compatíveis com as premissas (ordens possíveis, modelos do
 * silogismo, combinações de fatos sobre a pessoa) e perguntamos em quantos a
 * afirmação vale. Em todos → True; em nenhum → False; em alguns → Uncertain.
 *
 * Três famílias de premissa, por nível:
 *  - comparação ("Bob is taller than Rob"), com ordens estritas;
 *  - silogismo categórico, com importação existencial — a CCAT assume que os
 *    grupos citados existem;
 *  - regras com "everyone who", "nobody who", "or" e "and", nos níveis altos.
 *
 * As alternativas são sempre as mesmas três, na ordem fixa da prova.
 */

export const VEREDITOS = ['True', 'False', 'Uncertain'] as const
export type Veredito = (typeof VEREDITOS)[number]

/**
 * O veredito de uma afirmação sobre um conjunto finito de cenários. Devolve
 * null quando nenhum cenário satisfaz as premissas — questão degenerada.
 */
export function vereditoPorEnumeracao<M>(
  cenarios: readonly M[],
  premissas: readonly ((m: M) => boolean)[],
  afirmacao: (m: M) => boolean,
): Veredito | null {
  let vale = 0
  let falha = 0
  for (const m of cenarios) {
    if (!premissas.every((p) => p(m))) continue
    if (afirmacao(m)) vale++
    else falha++
  }
  if (vale + falha === 0) return null
  if (falha === 0) return 'True'
  if (vale === 0) return 'False'
  return 'Uncertain'
}

/** Todas as permutações de 0..n-1. n ≤ 5 aqui: no máximo 120. */
export function permutacoes(n: number): number[][] {
  if (n === 0) return [[]]
  const out: number[][] = []
  for (const resto of permutacoes(n - 1)) {
    for (let i = 0; i <= resto.length; i++) {
      out.push([...resto.slice(0, i), n - 1, ...resto.slice(i)])
    }
  }
  return out
}

// --- Comparação --------------------------------------------------------------

/** Nomes curtos e de iniciais distintas: cabem numa linha e não se confundem. */
export const NOMES = [
  'Ana', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jon',
  'Kim', 'Lou', 'Max', 'Ned', 'Pat', 'Raj', 'Sam', 'Tia', 'Uma', 'Zoe',
] as const

interface Dimensao {
  mais: string
  menos: string
  maximo: string
  minimo: string
  /** como ler a ordem na explicação */
  sentido: LocalizedText
}

const DIMENSOES: Dimensao[] = [
  { mais: 'taller', menos: 'shorter', maximo: 'tallest', minimo: 'shortest', sentido: { pt: 'do mais alto ao mais baixo', en: 'tallest to shortest' } },
  { mais: 'older', menos: 'younger', maximo: 'oldest', minimo: 'youngest', sentido: { pt: 'do mais velho ao mais novo', en: 'oldest to youngest' } },
  { mais: 'faster', menos: 'slower', maximo: 'fastest', minimo: 'slowest', sentido: { pt: 'do mais rápido ao mais lento', en: 'fastest to slowest' } },
  { mais: 'heavier', menos: 'lighter', maximo: 'heaviest', minimo: 'lightest', sentido: { pt: 'do mais pesado ao mais leve', en: 'heaviest to lightest' } },
  { mais: 'richer', menos: 'poorer', maximo: 'richest', minimo: 'poorest', sentido: { pt: 'do mais rico ao mais pobre', en: 'richest to poorest' } },
]

/** Afirmação sobre uma ordem. `a` e `b` são índices de pessoa. */
type Comparacao =
  | { tipo: 'maior'; a: number; b: number }
  | { tipo: 'topo'; a: number }
  | { tipo: 'base'; a: number }

/** `ordem[0]` é quem tem mais da dimensão; posição de cada pessoa = índice. */
function valeNaOrdem(c: Comparacao, ordem: number[]): boolean {
  const pos = (p: number) => ordem.indexOf(p)
  switch (c.tipo) {
    case 'maior':
      return pos(c.a) < pos(c.b)
    case 'topo':
      return pos(c.a) === 0
    case 'base':
      return pos(c.a) === ordem.length - 1
  }
}

const EXTENSO = ['zero', 'one', 'two', 'three', 'four', 'five'] as const

function renderComparacao(
  c: Comparacao,
  nomes: string[],
  dim: Dimensao,
  invertida: boolean,
): string {
  const n = EXTENSO[nomes.length]
  switch (c.tipo) {
    case 'maior':
      return invertida
        ? `${nomes[c.b]} is ${dim.menos} than ${nomes[c.a]}.`
        : `${nomes[c.a]} is ${dim.mais} than ${nomes[c.b]}.`
    case 'topo':
      return `${nomes[c.a]} is the ${dim.maximo} of the ${n}.`
    case 'base':
      return `${nomes[c.a]} is the ${dim.minimo} of the ${n}.`
  }
}

interface Montada {
  premissas: string[]
  afirmacao: string
  veredito: Veredito
  explicacao: LocalizedText
}

function montarComparacao(
  rng: Rng,
  alvo: Veredito,
  pessoas: number,
  nPremissas: number,
): Montada | null {
  const nomes = rng.shuffle(NOMES).slice(0, pessoas)
  const dim = rng.pick(DIMENSOES)
  const ordens = permutacoes(pessoas)

  // Premissas tiradas de uma ordem escondida: são sempre compatíveis entre si.
  const escondida = rng.shuffle([...Array(pessoas).keys()])
  const pares: [number, number][] = []
  for (let i = 0; i < pessoas; i++) {
    for (let j = i + 1; j < pessoas; j++) pares.push([escondida[i]!, escondida[j]!])
  }
  const usados = rng.shuffle(pares).slice(0, nPremissas)
  const premissas: Comparacao[] = usados.map(([a, b]) => ({ tipo: 'maior', a, b }))
  const testes = premissas.map((p) => (o: number[]) => valeNaOrdem(p, o))
  // Ninguém fica de fora das premissas: uma pessoa só citada na afirmação é
  // incerteza de graça, e uma que nem aparece é um nome fantasma na explicação.
  if (new Set(usados.flat()).size !== pessoas) return null

  // Candidatas: pares NÃO citados nas premissas (em nenhum sentido — senão é
  // só reler a premissa) e os superlativos.
  const citado = (a: number, b: number) =>
    usados.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  const candidatas: Comparacao[] = []
  for (let a = 0; a < pessoas; a++) {
    candidatas.push({ tipo: 'topo', a }, { tipo: 'base', a })
    for (let b = 0; b < pessoas; b++) {
      if (a !== b && !citado(a, b)) candidatas.push({ tipo: 'maior', a, b })
    }
  }

  const comVeredito = rng
    .shuffle(candidatas)
    .find((c) => vereditoPorEnumeracao(ordens, testes, (o) => valeNaOrdem(c, o)) === alvo)
  if (!comVeredito) return null

  const compativeis = ordens.filter((o) => testes.every((t) => t(o)))
  const vale = compativeis.filter((o) => valeNaOrdem(comVeredito, o))
  const falha = compativeis.filter((o) => !valeNaOrdem(comVeredito, o))
  const fila = (o: number[]) => o.map((p) => nomes[p]).join(' > ')
  const afirmacao = renderComparacao(comVeredito, nomes, dim, rng.next() < 0.5)

  const total = compativeis.length
  const ordensPt = total === 1 ? 'uma única ordem possível' : `${total} ordens possíveis`
  const ordensEn = total === 1 ? 'a single possible order' : `${total} possible orders`
  const cenario: LocalizedText =
    alvo === 'True'
      ? {
          pt: `As premissas deixam ${ordensPt} (${dim.sentido.pt}), e a afirmação vale em todas — por exemplo ${fila(vale[0]!)}.`,
          en: `The premises leave ${ordensEn} (${dim.sentido.en}), and the statement holds in every one — for example ${fila(vale[0]!)}.`,
        }
      : alvo === 'False'
        ? {
            pt: `As premissas deixam ${ordensPt} (${dim.sentido.pt}), e a afirmação falha em todas — por exemplo ${fila(falha[0]!)}.`,
            en: `The premises leave ${ordensEn} (${dim.sentido.en}), and the statement fails in every one — for example ${fila(falha[0]!)}.`,
          }
        : {
            pt: `As premissas deixam mais de uma ordem (${dim.sentido.pt}): em ${fila(vale[0]!)} a afirmação vale, em ${fila(falha[0]!)} não vale. Nada nas premissas escolhe entre as duas.`,
            en: `The premises allow more than one order (${dim.sentido.en}): in ${fila(vale[0]!)} the statement holds, in ${fila(falha[0]!)} it does not. Nothing in the premises decides between them.`,
          }

  return {
    premissas: premissas.map((p) => renderComparacao(p, nomes, dim, rng.next() < 0.5)),
    afirmacao,
    veredito: alvo,
    explicacao: cenario,
  }
}

// --- Silogismo ---------------------------------------------------------------

const COM_IMPORTACAO = { existentialImport: true } as const

const NEGACAO: Record<Quantifier, Quantifier> = {
  all: 'some-not',
  'some-not': 'all',
  no: 'some',
  some: 'no',
}

/**
 * Veredito de uma afirmação categórica com importação existencial: True se se
 * segue, False se a NEGAÇÃO dela se segue, Uncertain se nenhuma das duas.
 * Os modelos do silogismo são exaustivos (ver syllogism.ts), então isto é a
 * mesma enumeração de cenários das outras famílias.
 */
export function vereditoSilogismo(premissas: Statement[], s: Statement): Veredito | null {
  if (!isSatisfiable(premissas, COM_IMPORTACAO)) return null
  if (entails(premissas, s, COM_IMPORTACAO)) return 'True'
  if (entails(premissas, { ...s, quantifier: NEGACAO[s.quantifier] }, COM_IMPORTACAO)) return 'False'
  return 'Uncertain'
}

function montarSilogismo(rng: Rng, alvo: Veredito, difficulty: Difficulty): Montada | null {
  const formas = VALID_FORMS.filter((f) => Math.abs(f.level - difficulty) <= 1)
  const forma = rng.pick(formas.length > 0 ? formas : VALID_FORMS)
  const pool = difficulty >= 3 ? LOGIC_TERMS.inventados : LOGIC_TERMS.concretos
  const termos = [...rng.pick(pool as unknown as string[][])]

  const mesma = (a: Statement, b: Statement) =>
    a.quantifier === b.quantifier && a.subject === b.subject && a.predicate === b.predicate
  const candidatas = allStatements().filter((s) => !forma.premises.some((p) => mesma(p, s)))
  const escolhida = rng.shuffle(candidatas).find((s) => vereditoSilogismo(forma.premises, s) === alvo)
  if (!escolhida) return null

  const explicacao: LocalizedText =
    alvo === 'True'
      ? {
          pt: 'Com os grupos citados existindo (é o que a prova assume), não há cenário em que as premissas valham e a afirmação falhe: ela se segue.',
          en: 'With the groups mentioned actually existing (which the test assumes), there is no scenario where the premises hold and the statement fails: it follows.',
        }
      : alvo === 'False'
        ? {
            pt: 'As premissas obrigam o CONTRÁRIO da afirmação: em todo cenário compatível com elas, com os grupos existindo, a afirmação falha.',
            en: 'The premises force the OPPOSITE of the statement: in every scenario consistent with them, with the groups existing, the statement fails.',
          }
        : {
            pt: 'Dá para desenhar um cenário em que as premissas valem e a afirmação também, e outro em que as premissas valem e ela falha. As premissas não decidem — incerto.',
            en: 'You can draw one scenario where the premises hold and so does the statement, and another where the premises hold and it fails. The premises do not decide — uncertain.',
          }

  return {
    premissas: forma.premises.map((p) => renderStatement(p, termos)),
    afirmacao: renderStatement(escolhida, termos),
    veredito: alvo,
    explicacao,
  }
}

// --- Regras ------------------------------------------------------------------

/** Um fato sobre a pessoa, nas duas polaridades. */
export interface Atomo {
  sim: string
  nao: string
}

/**
 * Cenários de regras. Os fatos são independentes entre si por construção —
 * nada de "is 17 or older" ao lado de "is 16", que o candidato ligaria por
 * conhecimento de mundo. E são FACTUAIS, não permissões: "may enter if you
 * have a ticket" costuma ser lido como "só se", e o gabarito viraria disputa.
 */
export const CENARIOS: Atomo[][] = [
  [
    { sim: 'works in sales', nao: 'does not work in sales' },
    { sim: 'has a company car', nao: 'does not have a company car' },
    { sim: 'attends the Monday meeting', nao: 'does not attend the Monday meeting' },
    { sim: 'speaks Spanish', nao: 'does not speak Spanish' },
  ],
  [
    { sim: 'plays in the band', nao: 'does not play in the band' },
    { sim: 'stays late on Tuesdays', nao: 'does not stay late on Tuesdays' },
    { sim: 'takes the late bus', nao: 'does not take the late bus' },
    { sim: 'is in the chess club', nao: 'is not in the chess club' },
  ],
  [
    { sim: 'has a premium membership', nao: 'does not have a premium membership' },
    { sim: 'uses the pool', nao: 'does not use the pool' },
    { sim: 'books a trainer', nao: 'does not book a trainer' },
    { sim: 'trains before work', nao: 'does not train before work' },
  ],
  [
    { sim: 'grows tomatoes', nao: 'does not grow tomatoes' },
    { sim: 'enters the county fair', nao: 'does not enter the county fair' },
    { sim: 'sells at the market', nao: 'does not sell at the market' },
    { sim: 'keeps bees', nao: 'does not keep bees' },
  ],
  [
    { sim: 'has a library card', nao: 'does not have a library card' },
    { sim: 'borrows e-books', nao: 'does not borrow e-books' },
    { sim: 'visits on weekends', nao: 'does not visit on weekends' },
    { sim: 'joins the reading group', nao: 'does not join the reading group' },
  ],
  [
    { sim: 'works the night shift', nao: 'does not work the night shift' },
    { sim: 'carries a master key', nao: 'does not carry a master key' },
    { sim: 'wears a blue uniform', nao: 'does not wear a blue uniform' },
    { sim: 'speaks French', nao: 'does not speak French' },
  ],
]

interface Literal {
  atomo: number
  positivo: boolean
}

type Regra =
  | { forma: 'todo'; se: Literal; entao: Literal }
  | { forma: 'nenhum'; se: Literal; entao: Literal }
  | { forma: 'ou' | 'e'; se: [Literal, Literal]; entao: Literal }

/** Leitura do "or": inclusiva (a correta) e exclusiva (a de quem lê rápido). */
type LeituraDoOu = 'inclusiva' | 'exclusiva'

const lit = (l: Literal, m: boolean[]) => m[l.atomo] === l.positivo

function valeRegra(r: Regra, m: boolean[], ou: LeituraDoOu): boolean {
  switch (r.forma) {
    case 'todo':
      return !lit(r.se, m) || lit(r.entao, m)
    case 'nenhum':
      return !lit(r.se, m) || !lit(r.entao, m)
    case 'e':
      return !(lit(r.se[0], m) && lit(r.se[1], m)) || lit(r.entao, m)
    case 'ou': {
      const a = lit(r.se[0], m)
      const b = lit(r.se[1], m)
      const dispara = ou === 'inclusiva' ? a || b : a !== b
      return !dispara || lit(r.entao, m)
    }
  }
}

function renderLiteral(l: Literal, atomos: Atomo[]): string {
  const a = atomos[l.atomo] as Atomo
  return l.positivo ? a.sim : a.nao
}

function renderRegra(r: Regra, atomos: Atomo[]): string {
  const L = (l: Literal) => renderLiteral(l, atomos)
  switch (r.forma) {
    case 'todo':
      return `Everyone who ${L(r.se)} ${L(r.entao)}.`
    case 'nenhum':
      return `Nobody who ${L(r.se)} ${L(r.entao)}.`
    case 'ou':
      return `Everyone who ${L(r.se[0])} or ${L(r.se[1])} ${L(r.entao)}.`
    case 'e':
      return `Everyone who ${L(r.se[0])} and ${L(r.se[1])} ${L(r.entao)}.`
  }
}

/** As 16 combinações de fatos sobre a pessoa. */
const MUNDOS: boolean[][] = Array.from({ length: 16 }, (_, mask) =>
  [0, 1, 2, 3].map((i) => ((mask >> i) & 1) === 1),
)

function sortearRegra(rng: Rng, difficulty: Difficulty, usados: number[]): Regra {
  const [p, q, r] = rng.shuffle(usados)
  const pos = (atomo: number): Literal => ({ atomo, positivo: true })
  // Antecedente negativo ("Everyone who does not…") só no nível 5.
  const talvezNeg = (atomo: number): Literal => ({
    atomo,
    positivo: difficulty < 5 || rng.next() < 0.6,
  })
  const formas: Regra['forma'][] =
    difficulty <= 3 ? ['todo'] : difficulty === 4 ? ['todo', 'todo', 'nenhum', 'ou'] : ['todo', 'nenhum', 'ou', 'e']
  switch (rng.pick(formas)) {
    case 'todo':
      return { forma: 'todo', se: talvezNeg(p!), entao: pos(q!) }
    case 'nenhum':
      return { forma: 'nenhum', se: talvezNeg(p!), entao: pos(q!) }
    case 'ou':
      return { forma: 'ou', se: [pos(p!), pos(q!)], entao: pos(r!) }
    case 'e':
      return { forma: 'e', se: [pos(p!), pos(q!)], entao: pos(r!) }
  }
}

function montarRegras(rng: Rng, alvo: Veredito, difficulty: Difficulty): Montada | null {
  const atomos = rng.shuffle(rng.pick(CENARIOS))
  const nome = rng.pick(NOMES)
  const nRegras = difficulty <= 3 ? 1 : 2
  const regras: Regra[] = []
  for (let i = 0; i < nRegras; i++) regras.push(sortearRegra(rng, difficulty, [0, 1, 2, 3]))
  const fato: Literal = { atomo: rng.int(0, 3), positivo: rng.next() < 0.5 }
  const textos = regras.map((r) => renderRegra(r, atomos))
  if (new Set(textos).size !== textos.length) return null

  const citados = new Set<number>()
  for (const r of regras) {
    for (const l of [...(Array.isArray(r.se) ? r.se : [r.se]), r.entao]) citados.add(l.atomo)
  }
  if (!citados.has(fato.atomo)) return null

  // Nenhuma regra pode ser letra morta: se as regras juntas impedem que alguém
  // cumpra a condição de uma delas ("everyone who has a car speaks Spanish" +
  // "nobody who has a car speaks Spanish"), a questão vira pegadinha de
  // grupo vazio, que não é o que a prova cobra.
  const antecedente = (r: Regra, m: boolean[]) =>
    Array.isArray(r.se) ? r.se.every((l) => lit(l, m)) : lit(r.se, m)
  const viva = (r: Regra) =>
    MUNDOS.some((m) => regras.every((x) => valeRegra(x, m, 'inclusiva')) && antecedente(r, m))
  if (!regras.every(viva)) return null
  // Nem redundante: uma regra que as outras já garantem só alonga a leitura.
  const redundante = (r: Regra) =>
    MUNDOS.every(
      (m) => !regras.every((x) => x === r || valeRegra(x, m, 'inclusiva')) || valeRegra(r, m, 'inclusiva'),
    )
  if (regras.length > 1 && regras.some(redundante)) return null

  const temOu = regras.some((r) => r.forma === 'ou')
  const veredito = (leitura: LeituraDoOu, s: Literal) =>
    vereditoPorEnumeracao(
      MUNDOS,
      [...regras.map((r) => (m: boolean[]) => valeRegra(r, m, leitura)), (m) => lit(fato, m)],
      (m) => lit(s, m),
    )

  // A afirmação fala de outro fato citado nas regras. Com "or", o veredito tem
  // de ser o mesmo nas duas leituras — senão o gabarito dependeria de o
  // candidato ler o "or" como inclusivo.
  const candidatas: Literal[] = [...citados]
    .filter((a) => a !== fato.atomo)
    .flatMap((atomo) => [{ atomo, positivo: true }, { atomo, positivo: false }])
  const escolhida = rng.shuffle(candidatas).find((s) => {
    const v = veredito('inclusiva', s)
    return v === alvo && (!temOu || veredito('exclusiva', s) === v)
  })
  if (!escolhida) return null

  const regraTexto = regras[0] as Regra
  const armadilha: LocalizedText = {
    pt: `"${renderRegra(regraTexto, atomos)}" vale num sentido só: diz o que acontece com quem cumpre a condição, e nada sobre quem não cumpre.`,
    en: `"${renderRegra(regraTexto, atomos)}" works in one direction only: it says what happens to whoever meets the condition, and nothing about whoever does not.`,
  }
  const explicacao: LocalizedText =
    alvo === 'True'
      ? {
          pt: `Partindo do fato sobre ${nome} e aplicando as regras, a afirmação é obrigatória: em todas as combinações de fatos compatíveis com as premissas, ela vale.`,
          en: `Starting from the fact about ${nome} and applying the rules, the statement is forced: it holds in every combination of facts consistent with the premises.`,
        }
      : alvo === 'False'
        ? {
            pt: `Partindo do fato sobre ${nome} e aplicando as regras (inclusive de trás para a frente: se a consequência não vale, a condição também não), o CONTRÁRIO da afirmação é obrigatório.`,
            en: `Starting from the fact about ${nome} and applying the rules (backwards too: if the consequence fails, so does the condition), the OPPOSITE of the statement is forced.`,
          }
        : {
            pt: `As premissas admitem uma combinação em que a afirmação vale e outra em que falha. ${armadilha.pt}`,
            en: `The premises allow one combination where the statement holds and another where it fails. ${armadilha.en}`,
          }

  return {
    premissas: [...textos, `${nome} ${renderLiteral(fato, atomos)}.`],
    afirmacao: `${nome} ${renderLiteral(escolhida, atomos)}.`,
    veredito: alvo,
    explicacao,
  }
}

// --- Gerador -----------------------------------------------------------------

type Familia = 'comparacao' | 'silogismo' | 'regras'

/** Famílias por nível: comparação no piso, regras com "or"/"and" no teto. */
const FAMILIAS_POR_NIVEL: Record<Difficulty, Familia[]> = {
  1: ['comparacao'],
  2: ['comparacao', 'silogismo'],
  3: ['comparacao', 'silogismo', 'regras'],
  4: ['comparacao', 'silogismo', 'regras'],
  5: ['comparacao', 'regras', 'regras'],
}

/** Tamanho da comparação por nível: [pessoas, premissas]. */
const COMPARACAO_POR_NIVEL: Record<Difficulty, [number, number][]> = {
  1: [[3, 2]],
  2: [[3, 2], [4, 3]],
  3: [[4, 3]],
  4: [[4, 3], [5, 4]],
  5: [[5, 3], [5, 4]],
}

const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth'] as const
const QUANTAS = ['', 'one', 'two', 'three', 'four'] as const

export const gerarVerdadeiroFalso: VerbalGenerator = (seed, difficulty) => {
  // O nível entra na seed: níveis vizinhos têm a mesma estrutura, e a mesma
  // seed daria a MESMA questão rotulada com duas dificuldades.
  const rng = mulberry32(seed + difficulty * 100_003)
  // O alvo sai da seed ANTES da questão: o banco fica equilibrado entre os
  // três vereditos, e "Uncertain" não vira o chute que mais acerta.
  const alvo = rng.pick(VEREDITOS)
  const familia = rng.pick(FAMILIAS_POR_NIVEL[difficulty])

  let montada: Montada | null = null
  for (let tentativa = 0; tentativa < 200 && !montada; tentativa++) {
    if (familia === 'comparacao') {
      const [pessoas, premissas] = rng.pick(COMPARACAO_POR_NIVEL[difficulty])
      montada = montarComparacao(rng, alvo, pessoas, premissas)
    } else if (familia === 'silogismo') {
      montada = montarSilogismo(rng, alvo, difficulty)
    } else {
      montada = montarRegras(rng, alvo, difficulty)
    }
  }
  if (!montada) throw new Error(`não consegui montar verdadeiro/falso "${alvo}" (${familia})`)

  const n = montada.premissas.length
  const pergunta = `If the first ${QUANTAS[n]} statements are true, the ${ORDINAL[n + 1]} statement is:`
  const stem = [...montada.premissas, montada.afirmacao, pergunta].join('\n')

  // Ordem fixa, como na prova: True, False, Uncertain.
  const options = VEREDITOS.map((text, i) => ({ id: optionIdAt(i) as string, text }))
  const answerId = optionIdAt(VEREDITOS.indexOf(alvo)) as string

  return {
    subtipo: 'verdadeiro_falso',
    stem,
    options,
    answerId,
    explanation: {
      pt:
        `A resposta é **${alvo}**. ${montada.explicacao.pt} Método: não pergunte se a ` +
        `afirmação é plausível — pergunte se as premissas a OBRIGAM (True), a PROÍBEM ` +
        `(False) ou deixam as duas coisas possíveis (Uncertain).`,
      en:
        `The answer is **${alvo}**. ${montada.explicacao.en} Method: do not ask whether ` +
        `the statement is plausible — ask whether the premises FORCE it (True), RULE IT ` +
        `OUT (False) or leave both possible (Uncertain).`,
    },
    satisfiesRule: (texto: string) => texto === alvo,
  } satisfies VerbalGenerated
}
