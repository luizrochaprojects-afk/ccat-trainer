import { mulberry32, type Rng } from '../rng'
import type { Difficulty } from '../taxonomy'
import { optionIdAt } from '../optionIds'
import { formatNumber } from './solver'

/**
 * Séries numéricas geradas por regra (PRD §4.10 estendido a math_series).
 *
 * Mesmo contrato dos espaciais: a resposta sai da regra que construiu a série,
 * não de um julgamento posterior. Além disso cada questão carrega a
 * `expression` — a forma fechada do próximo termo — que o gate avalia por um
 * caminho independente do gerador.
 */

export interface MathGenerated {
  subtipo: string
  stem: string
  options: { id: string; text: string }[]
  answerId: string
  explanation: string
  /** forma fechada do valor correto, avaliada pelo gate (gate G2, método 'solver') */
  expression: string
  answerValue: number
}

export type MathGenerator = (seed: number, difficulty: Difficulty) => MathGenerated

interface Regra {
  /** termos exibidos */
  terms: number[]
  next: number
  expression: string
  explanation: string
  /** passo típico, usado para gerar distratores plausíveis */
  passo: number
}

const optionCountFor = (d: Difficulty): number => (d <= 2 ? 4 : 5)

// --- Série simples -----------------------------------------------------------

export const gerarSerieSimples: MathGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const regra = semColisao(() => regraSimples(rng, difficulty))
  return montar(rng, 'serie_simples', regra, difficulty)
}

/**
 * Famílias de regra por nível.
 *
 * Cada nível sorteia entre 2-3 famílias com faixas generosas. Isso não é
 * enfeite: com uma única família de faixa estreita, o espaço de questões
 * distintas fica menor que a meta de 150 por tipo e o pipeline passa a gerar
 * duplicata atrás de duplicata.
 */
function regraSimples(rng: Rng, d: Difficulty): Regra {
  const familias = FAMILIAS_POR_NIVEL[d]
  return rng.pick(familias)(rng)
}

type Familia = (rng: Rng) => Regra

const aritmetica =
  (passoRange: number[], a0Max: number): Familia =>
  (rng) => {
    const passo = rng.pick(passoRange)
    const a0 = rng.int(3, a0Max)
    const terms = seq(5, (i) => a0 + i * passo)
    return {
      terms,
      next: a0 + 5 * passo,
      expression: `${a0}+5*(${passo})`,
      passo: Math.abs(passo),
      explanation:
        `A série ${passo > 0 ? 'soma' : 'subtrai'} ${Math.abs(passo)} a cada passo ` +
        `(${terms[0]} → ${terms[1]} → ${terms[2]}…). Confira sempre a diferença entre ` +
        `termos vizinhos antes de procurar regra mais complicada: a maioria das séries ` +
        `da CCAT é aritmética simples.`,
    }
  }

const geometrica =
  (a0Max: number, razoes: number[]): Familia =>
  (rng) => {
    const razao = rng.pick(razoes)
    const a0 = rng.int(2, a0Max)
    const terms = seq(5, (i) => a0 * razao ** i)
    return {
      terms,
      next: a0 * razao ** 5,
      expression: `${a0}*${razao}*${razao}*${razao}*${razao}*${razao}`,
      passo: a0 * razao ** 4,
      explanation:
        `Cada termo é o anterior multiplicado por ${razao}. Sinal de série ` +
        `geométrica: a diferença entre termos cresce rápido demais para ser soma ` +
        `constante. Divida um termo pelo anterior — se der sempre o mesmo número, é essa.`,
    }
  }

const geometricaComConstante: Familia = (rng) => {
  const razao = rng.pick([2, 3])
  const a0 = rng.int(2, 10)
  const c = rng.int(1, 9)
  const terms = seq(5, (i) => a0 * razao ** i + c)
  return {
    terms,
    next: a0 * razao ** 5 + c,
    expression: `${a0}*${razao}*${razao}*${razao}*${razao}*${razao}+${c}`,
    passo: a0 * razao ** 4,
    explanation:
      `A série é "multiplique por ${razao}" com um deslocamento fixo de ${c}. ` +
      `Subtraia ${c} de cada termo e a progressão geométrica pura aparece. ` +
      `Quando a razão entre termos é quase constante mas não fecha, procure uma ` +
      `constante somada.`,
  }
}

const fibonacci: Familia = (rng) => {
  const a0 = rng.int(1, 15)
  const a1 = rng.int(2, 20)
  const terms = [a0, a1]
  for (let i = 2; i < 5; i++) {
    terms.push((terms[i - 1] as number) + (terms[i - 2] as number))
  }
  const next = (terms[4] as number) + (terms[3] as number)
  return {
    terms,
    next,
    expression: `${terms[4]}+${terms[3]}`,
    passo: terms[3] as number,
    explanation:
      `Cada termo é a soma dos dois anteriores (${terms[2]} = ${terms[0]} + ${terms[1]}, ` +
      `e assim por diante). Quando nem diferença nem razão são constantes, o próximo ` +
      `teste é somar os dois termos anteriores — é o padrão de Fibonacci.`,
  }
}

const quadrados: Familia = (rng) => {
  const k = rng.int(1, 12)
  const terms = seq(5, (i) => (i + k) ** 2)
  return {
    terms,
    next: (5 + k) ** 2,
    expression: `(5+${k})*(5+${k})`,
    passo: 2 * (4 + k) + 1,
    explanation:
      `São quadrados perfeitos consecutivos: ${k}², ${k + 1}², ${k + 2}²… ` +
      `Quando as diferenças entre os termos crescem de 2 em 2, você está ` +
      `olhando para uma sequência de quadrados.`,
  }
}

const quadratica =
  (a0Max: number, incMax: number): Familia =>
  (rng) => {
    const a0 = rng.int(2, a0Max)
    const d0 = rng.int(2, 9)
    const inc = rng.int(2, incMax)
    const terms = seq(5, (i) => a0 + i * d0 + (inc * i * (i - 1)) / 2)
    return {
      terms,
      next: a0 + 5 * d0 + inc * 10,
      expression: `${a0}+5*${d0}+${inc}*10`,
      passo: d0 + 4 * inc,
      explanation:
        `A diferença entre termos vizinhos não é constante — ela mesma cresce de ` +
        `${inc} em ${inc} (começando em ${d0}). Quando a primeira diferença não ` +
        `resolve, calcule a diferença das diferenças: se ela for constante, a série ` +
        `é quadrática e você já tem a regra.`,
    }
  }

const FAMILIAS_POR_NIVEL: Record<Difficulty, Familia[]> = {
  1: [aritmetica(range(2, 9), 40)],
  2: [aritmetica([...range(11, 25), ...range(-25, -11)], 60), aritmetica(range(2, 9), 90)],
  3: [geometrica(15, [2, 3, 4]), fibonacci],
  4: [quadrados, geometricaComConstante, quadratica(12, 5)],
  5: [quadratica(20, 9), geometricaComConstante, fibonacci],
}

/**
 * Rejeita a regra se o valor da resposta já aparece entre os termos exibidos.
 * Numa série trançada isso acontece de verdade, e a questão fica ambígua: o
 * candidato vê o número no enunciado e não sabe se acertou pela regra ou de
 * vista.
 */
function semColisao(build: () => Regra): Regra {
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const regra = build()
    if (!regra.terms.includes(regra.next)) return regra
  }
  throw new Error('não consegui montar série sem repetir a resposta no enunciado')
}

// --- Série alternada ---------------------------------------------------------

export const gerarSerieAlternada: MathGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const regra = semColisao(() => regraAlternada(rng))
  return montar(rng, 'serie_alternada', regra, difficulty)
}

function regraAlternada(rng: Rng): Regra {
  const passoA = rng.int(3, 12)
  const passoB = rng.pick([...range(2, 11), ...range(-11, -2)].filter((v) => v !== passoA))
  const a0 = rng.int(4, 30)
  const b0 = rng.int(40, 90)

  // posições pares vêm da série A, ímpares da série B
  const terms = seq(6, (i) => (i % 2 === 0 ? a0 + (i / 2) * passoA : b0 + ((i - 1) / 2) * passoB))
  const next = a0 + 3 * passoA // posição 6 é par → série A

  return {
    terms,
    next,
    expression: `${a0}+3*(${passoA})`,
    passo: Math.abs(passoA),
    explanation:
      `São duas séries trançadas. Nas posições 1ª, 3ª, 5ª… os termos sobem de ` +
      `${passoA} em ${passoA}; nas posições 2ª, 4ª, 6ª… variam de ${passoB} em ` +
      `${passoB}. A vaga que falta é de posição ímpar, então ela continua a ` +
      `primeira série. O sinal de série alternada é a sequência subir e descer ` +
      `sem padrão — olhe um termo sim, um termo não.`,
  }
}

// --- Série de dois passos ----------------------------------------------------

export const gerarSerieDoisPassos: MathGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const regra = semColisao(() => regraDoisPassos(rng))
  return montar(rng, 'serie_dois_passos', regra, difficulty)
}

function regraDoisPassos(rng: Rng): Regra {
  const soma = rng.int(3, 20)
  const fator = rng.pick([2, 3, 4])
  const a0 = rng.int(2, 20)

  // aplica alternadamente: +soma, ×fator, +soma, ×fator, ...
  const terms: number[] = [a0]
  for (let i = 1; i < 5; i++) {
    const anterior = terms[i - 1] as number
    terms.push(i % 2 === 1 ? anterior + soma : anterior * fator)
  }
  const quarto = terms[4] as number
  const next = quarto + soma // posição 5 (índice 5) é ímpar → soma

  return {
    terms,
    next,
    expression: `${quarto}+${soma}`,
    passo: soma,
    explanation:
      `A regra alterna duas operações: soma ${soma}, depois multiplica por ` +
      `${fator}, e repete. O termo que falta vem logo após uma multiplicação, ` +
      `então é uma soma: ${quarto} + ${soma}. Quando nem a diferença nem a razão ` +
      `são constantes, teste se elas se alternam.`,
  }
}

export const SERIES_GENERATORS = {
  serie_simples: gerarSerieSimples,
  serie_alternada: gerarSerieAlternada,
  serie_dois_passos: gerarSerieDoisPassos,
} as const satisfies Record<string, MathGenerator>

export type SeriesGeneratorId = keyof typeof SERIES_GENERATORS
export const SERIES_GENERATOR_IDS = Object.keys(SERIES_GENERATORS) as SeriesGeneratorId[]

// --- Montagem ----------------------------------------------------------------

function montar(
  rng: Rng,
  subtipo: string,
  regra: Regra,
  difficulty: Difficulty,
): MathGenerated {
  const valores = comDistratores(rng, regra, optionCountFor(difficulty))
  const embaralhados = rng.shuffle(valores.map((v, i) => ({ v, isCorrect: i === 0 })))

  const options = embaralhados.map((o, i) => ({
    id: optionIdAt(i) as string,
    text: formatNumber(o.v),
  }))
  const answerIndex = embaralhados.findIndex((o) => o.isCorrect)

  return {
    subtipo,
    stem: `${regra.terms.join(', ')}, ?`,
    options,
    answerId: optionIdAt(answerIndex) as string,
    explanation: `A resposta é ${formatNumber(regra.next)}. ${regra.explanation}`,
    expression: regra.expression,
    answerValue: regra.next,
  }
}

/**
 * Distratores = os erros que a pessoa de fato comete: parar um termo antes,
 * errar o passo por pouco, aplicar a operação errada. Um distrator aleatório
 * não treina nada — a pessoa elimina de olho e acerta sem saber a regra.
 */
function comDistratores(rng: Rng, regra: Regra, quantidade: number): number[] {
  const { next, passo, terms } = regra
  const ultimo = terms[terms.length - 1] as number
  const penultimo = terms[terms.length - 2] as number

  const candidatos = [
    next + passo,
    next - passo,
    next + 1,
    next - 1,
    ultimo + (ultimo - penultimo), // continua pela diferença anterior
    next + Math.max(2, Math.round(passo / 2)),
    next - Math.max(2, Math.round(passo / 2)),
    next * 2,
    ultimo,
  ]

  const escolhidos: number[] = [next]
  const vistos = new Set<number>([next])

  for (const c of rng.shuffle(candidatos)) {
    if (escolhidos.length >= quantidade) break
    if (!Number.isFinite(c) || vistos.has(c)) continue
    if (!Number.isInteger(c)) continue
    vistos.add(c)
    escolhidos.push(c)
  }

  // Rede de segurança: se os candidatos colidiram, completa afastando-se do alvo.
  let offset = 2
  while (escolhidos.length < quantidade) {
    const c = next + offset * (offset % 2 === 0 ? 1 : -1) * Math.max(1, passo)
    if (!vistos.has(c)) {
      vistos.add(c)
      escolhidos.push(c)
    }
    offset++
    if (offset > 100) throw new Error('não consegui montar distratores para a série')
  }

  return escolhidos
}

// --- Utilitários -------------------------------------------------------------

function seq(n: number, f: (i: number) => number): number[] {
  return Array.from({ length: n }, (_, i) => f(i))
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}
