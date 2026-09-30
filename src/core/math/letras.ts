import { mulberry32, type Rng } from '../rng'
import { OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import { optionIdAt } from '../optionIds'
import type { LocalizedText } from '../i18n'
import { normalizeText } from '../schema'
import { componentesDe, lerSerieDeLetras, letra, letraValida, type TipoComponente } from './alfabeto'

/**
 * Séries de letras geradas por regra (subtipo serie_letras de math_series).
 *
 * A CCAT mistura séries de letras com as numéricas: "CEG, DFH, EGI, FHJ, ?",
 * "GHG, HHH, IHI, JHJ, ?", "A, C, F, J, ?", "A2, C4, E8, ?". A conta é a mesma
 * de uma série numérica — a letra vale a posição no alfabeto —, mas vem com
 * duas camadas a mais: converter letra em número de cabeça e, nos trios, ler
 * cada POSIÇÃO do termo como uma série própria.
 *
 * Não há `expression`: a resposta é texto, não número. A prova do gabarito é a
 * re-execução do gerador mais o leitor de core/math/alfabeto.ts, que o gate roda
 * sobre o enunciado. O gerador usa o mesmo leitor como filtro — série em que ele
 * não fecha, ou fecha com mais de uma resposta, é sorteada de novo.
 *
 * Nenhuma série passa do Z: dar a volta no alfabeto é convenção que a prova
 * nem sempre segue, e a questão ficaria com duas respostas defensáveis.
 */

export interface LetrasGenerated {
  subtipo: string
  stem: string
  options: { id: string; text: string }[]
  answerId: string
  explanation: LocalizedText
  /** família da regra que montou a série; rótulo para teste e análise, fora do contrato do gate */
  familia?: string
}

export type LetrasGenerator = (seed: number, difficulty: Difficulty) => LetrasGenerated

interface Regra {
  familia: string
  /** termos exibidos, já como texto */
  termos: string[]
  resposta: string
  explanation: LocalizedText
  /**
   * Continuações erradas de quem entendeu a regra pela metade: aplicou o passo
   * na posição errada, repetiu o último salto, continuou a outra trilha.
   * Viram os distratores prioritários. null = o erro cairia fora do alfabeto.
   */
  erros: (string | null)[]
}

/** Devolve null quando o sorteio caiu num caso degenerado; aí se sorteia de novo. */
type Familia = (rng: Rng) => Regra | null

/** Um componente do termo: letra (pela posição) ou número, em função do índice do termo. */
interface Faixa {
  tipo: TipoComponente
  em: (i: number) => number
}

const L = (em: (i: number) => number): Faixa => ({ tipo: 'letra', em })
const N = (em: (i: number) => number): Faixa => ({ tipo: 'numero', em })

/** p0 + i·passo + acel·i(i-1)/2 — o salto começa em `passo` e cresce `acel` por termo. */
const trilha =
  (p0: number, passo: number, acel = 0) =>
  (i: number): number =>
    p0 + i * passo + (acel * i * (i - 1)) / 2

/** Termo i como texto; null se algum componente sai do alfabeto ou fica ≤ 0. */
function termo(faixas: Faixa[], i: number): string | null {
  const partes: string[] = []
  for (const f of faixas) {
    const v = f.em(i)
    if (f.tipo === 'letra') {
      if (!letraValida(v)) return null
      partes.push(letra(v))
    } else {
      if (!Number.isInteger(v) || v <= 0) return null
      partes.push(String(v))
    }
  }
  return partes.join('')
}

/** n termos exibidos e o termo n como resposta; null se algum sai da faixa. */
function porFaixas(faixas: Faixa[], n: number): { termos: string[]; resposta: string } | null {
  const todos = Array.from({ length: n + 1 }, (_, i) => termo(faixas, i))
  if (todos.some((t) => t === null)) return null
  return { termos: todos.slice(0, n) as string[], resposta: todos[n] as string }
}

/** Monta um termo com a forma de `faixas` a partir de valores soltos; null se algum sai da faixa. */
function comValores(faixas: readonly { tipo: TipoComponente }[], valores: number[]): string | null {
  return termo(
    faixas.map((f, k) => ({ tipo: f.tipo, em: () => valores[k] as number })),
    0,
  )
}

// --- Nível 1 -----------------------------------------------------------------

/** B, E, H, K, N → Q (ou de trás para frente): salto fixo. O trabalho é contar o alfabeto sem errar. */
const saltoFixo: Familia = (rng) => {
  const k = rng.int(2, 5)
  const n = 5
  const frente = rng.next() < 0.6
  const p = frente ? trilha(rng.int(1, 26 - n * k), k) : trilha(rng.int(1 + n * k, 26), -k)
  const serie = porFaixas([L(p)], n)
  if (!serie) return null
  const [ultimo, prox] = [p(n - 1), p(n)]
  const sentido = frente ? 1 : -1
  const conta = `${rot(ultimo)} ${frente ? '+' : '−'} ${k} = ${rot(prox)}`
  return {
    familia: 'salto_fixo',
    ...serie,
    erros: [
      letraOu(prox - sentido), // contou a letra de partida como um passo
      letraOu(prox + sentido),
      letraOu(prox + sentido * k), // pulou um termo
    ],
    explanation: {
      pt:
        `Cada letra ${frente ? 'avança' : 'recua'} ${k} posições no alfabeto: ${cadeia(p, n)}. ` +
        `A próxima é ${conta}. ${ANCORAS.pt}`,
      en:
        `Each letter moves ${k} places ${frente ? 'forward' : 'back'} along the alphabet: ` +
        `${cadeia(p, n)}. The next one is ${conta}. ${ANCORAS.en}`,
    },
  }
}

/** CEG, DFH, EGI, FHJ → GIK: o trio inteiro anda uma casa por termo. */
const trioDeslocado: Familia = (rng) => {
  const s = rng.pick([1, 2])
  const n = 4
  const p0 = rng.int(1, 26 - 2 * s - n)
  const faixas = [L(trilha(p0, 1)), L(trilha(p0 + s, 1)), L(trilha(p0 + 2 * s, 1))]
  const serie = porFaixas(faixas, n)
  if (!serie) return null
  const [a, b, c] = [p0 + n, p0 + s + n, p0 + 2 * s + n]
  const dentro = s === 1 ? { pt: 'consecutivas', en: 'consecutive' } : { pt: 'pulando uma', en: 'skipping one' }
  return {
    familia: 'trio_deslocado',
    ...serie,
    erros: [
      comValores(faixas, [a, b - 1, c - 1]), // andou só a primeira letra
      comValores(faixas, [a + 1, b + 1, c + 1]), // pulou um termo
      comValores(faixas, [a, a + s + 1, a + 2 * s + 2]), // errou o espaçamento dentro do trio
    ],
    explanation: {
      pt:
        `Cada termo tem três letras ${dentro.pt} (${serie.termos[0]}), e o trio inteiro anda uma ` +
        `posição por vez: ${serie.termos.join(' → ')}. O próximo começa em ${rot(a)}: ` +
        `${serie.resposta}. Leia por COLUNA — a 1ª letra de cada termo é ` +
        `${coluna(faixas[0] as Faixa, n)}; a 2ª e a 3ª seguem a mesma regra.`,
      en:
        `Each term has three ${dentro.en} letters (${serie.termos[0]}), and the whole trio moves ` +
        `one place at a time: ${serie.termos.join(' → ')}. The next one starts at ${rot(a)}: ` +
        `${serie.resposta}. Read by COLUMN — the 1st letter of each term runs ` +
        `${coluna(faixas[0] as Faixa, n)}; the 2nd and 3rd follow the same rule.`,
    },
  }
}

// --- Nível 2 -----------------------------------------------------------------

/** A, C, F, J → O: o salto cresce de 1 em 1. */
const saltoCrescente: Familia = (rng) => {
  const k0 = rng.int(1, 3)
  const n = rng.pick([4, 5])
  const p = trilha(rng.int(1, 6), k0, 1)
  const serie = porFaixas([L(p)], n)
  if (!serie) return null
  const ultimoSalto = k0 + n - 2
  const prox = p(n)
  return {
    familia: 'salto_crescente',
    ...serie,
    erros: [
      letraOu(p(n - 1) + ultimoSalto), // repetiu o último salto
      letraOu(prox + 1), // o salto cresceu 2
      letraOu(p(n - 1) + 2 * ultimoSalto), // dobrou o salto
    ],
    explanation: {
      pt:
        `${cadeia(p, n)}: os saltos são ${saltos(p, n)} — crescem 1 a cada passo. O próximo ` +
        `salto é +${ultimoSalto + 1}: ${rot(p(n - 1))} + ${ultimoSalto + 1} = ${rot(prox)}. ` +
        `Transforme as letras em números antes de procurar a regra: é uma série numérica ` +
        `disfarçada.`,
      en:
        `${cadeia(p, n)}: the jumps are ${saltos(p, n)} — they grow by 1 each step. The next ` +
        `jump is +${ultimoSalto + 1}: ${rot(p(n - 1))} + ${ultimoSalto + 1} = ${rot(prox)}. ` +
        `Turn the letters into numbers before hunting for the rule: it is a number series in ` +
        `disguise.`,
    },
  }
}

/** GHG, HHH, IHI, JHJ → KHK: as pontas andam juntas, o meio tem regra própria. */
const trioEspelhado: Familia = (rng) => {
  const h = rng.pick([1, 2])
  const meioParado = rng.next() < 0.5
  const n = 4
  const ponta = trilha(rng.int(1, 26 - n * h), h)
  const meio = meioParado ? trilha(rng.int(1, 26), 0) : trilha(rng.int(n + 1, 26), -1)
  const faixas = [L(ponta), L(meio), L(ponta)]
  const serie = porFaixas(faixas, n)
  if (!serie) return null
  const [o, m] = [ponta(n), meio(n)]
  const regraMeio = meioParado
    ? { pt: `fica parada no ${letra(m)}`, en: `stays put on ${letra(m)}` }
    : { pt: `recua uma posição por vez (${coluna(L(meio), n)})`, en: `steps back one place at a time (${coluna(L(meio), n)})` }
  return {
    familia: 'trio_espelhado',
    ...serie,
    erros: [
      comValores(faixas, [o, m + h, o]), // andou o meio junto com as pontas
      comValores(faixas, [o, m, o - h]), // esqueceu de andar a última ponta
      comValores(faixas, [o + h, m, o + h]), // pulou um termo nas pontas
      comValores(faixas, [o, m + 1, o]), // leu o meio com a regra trocada (parado × recuando)
    ],
    explanation: {
      pt:
        `A 1ª e a 3ª letras são sempre iguais e andam ${h} posição(ões) por termo: ` +
        `${coluna(L(ponta), n)} → ${letra(o)}. A letra do meio ${regraMeio.pt}. Resposta: ` +
        `${serie.resposta}. Num trio, cada posição é uma série própria — leia por coluna, ` +
        `não o termo inteiro de uma vez.`,
      en:
        `The 1st and 3rd letters are always the same and move ${h} place(s) per term: ` +
        `${coluna(L(ponta), n)} → ${letra(o)}. The middle letter ${regraMeio.en}. Answer: ` +
        `${serie.resposta}. In a trio each position is its own series — read by column, not ` +
        `the whole term at once.`,
    },
  }
}

// --- Nível 3 -----------------------------------------------------------------

/**
 * Duas trilhas trançadas: uma avança, a outra recua do fim do alfabeto. Como na
 * série numérica alternada, o número de termos é sorteado para a vaga cair ora
 * numa trilha, ora na outra.
 */
function trancar(
  familia: string,
  A: (i: number) => number,
  B: (i: number) => number,
  n: number,
  descricaoA: LocalizedText,
  descricaoB: LocalizedText,
): Regra | null {
  const em = (j: number) => (j % 2 === 0 ? A(j / 2) : B((j - 1) / 2))
  const serie = porFaixas([L(em)], n)
  if (!serie) return null
  const daA = n % 2 === 0
  const certa = daA ? A : B
  const outra = daA ? B : A
  const k = Math.floor(n / 2)
  const prox = certa(k)
  const ultimo = certa(k - 1)
  const passo = ultimo - certa(k - 2)
  return {
    familia,
    ...serie,
    erros: [
      letraOu(outra(daA ? k : k + 1)), // continuou a outra trilha
      letraOu(ultimo + passo), // repetiu o último passo da trilha certa
      letraOu(prox + (prox > ultimo ? 1 : -1)),
    ],
    explanation: {
      pt:
        `São duas séries trançadas. Nas posições ímpares (1ª, 3ª, 5ª…) as letras ` +
        `${descricaoA.pt}; nas pares, ${descricaoB.pt}. A vaga é a ${n + 1}ª posição, ` +
        `${daA ? 'ímpar' : 'par'}, então continua a ${daA ? 'primeira' : 'segunda'}: ` +
        `${rot(ultimo)} → ${rot(prox)}. Quando as letras pulam para frente e para trás, leia ` +
        `uma sim, uma não — e conte a posição da lacuna antes de responder.`,
      en:
        `Two series are interleaved. In the odd positions (1st, 3rd, 5th…) the letters ` +
        `${descricaoA.en}; in the even ones, they ${descricaoB.en}. The blank is the ` +
        `${ordinal(n + 1)} position, ${daA ? 'odd' : 'even'}, so it continues the ` +
        `${daA ? 'first' : 'second'} one: ${rot(ultimo)} → ${rot(prox)}. When the letters jump ` +
        `back and forth, read every other one — and count the blank's position before answering.`,
    },
  }
}

const avanca = (a: number): LocalizedText => ({
  pt: `avançam ${a} por vez`,
  en: `move forward ${a} at a time`,
})
const recua = (b: number): LocalizedText => ({
  pt: `recuam ${b} por vez`,
  en: `move back ${b} at a time`,
})

/** A, Z, C, X, E, V → G. */
const duasTrilhas: Familia = (rng) => {
  const a = rng.int(1, 3)
  const b = rng.int(1, 3)
  const A = trilha(rng.int(1, 6), a)
  const B = trilha(rng.int(21, 26), -b)
  const n = rng.pick([6, 7])
  return rng.next() < 0.5
    ? trancar('duas_trilhas', A, B, n, avanca(a), recua(b))
    : trancar('duas_trilhas', B, A, n, recua(b), avanca(a))
}

const PASSOS = [-2, -1, 1, 2, 3]

/** AZC, BYE, CXG, DWI → EVK: cada posição do trio com o próprio passo. */
const trioPassosDiferentes: Familia = (rng) => {
  const passos = [rng.pick(PASSOS), rng.pick(PASSOS), rng.pick(PASSOS)] as [number, number, number]
  if (new Set(passos).size < 2) return null
  const n = 4
  const inicio = passos.map((s) => (s > 0 ? rng.int(1, 26 - n * s) : rng.int(1 - n * s, 26)))
  const faixas = passos.map((s, k) => L(trilha(inicio[k] as number, s)))
  const serie = porFaixas(faixas, n)
  if (!serie) return null
  const prox = faixas.map((f) => f.em(n))
  const ultimo = faixas.map((f) => f.em(n - 1))
  const [s1, s2, s3] = passos
  const colunas = faixas
    .map((f, k) => `${k + 1}ª ${sinal(passos[k] as number)} (${coluna(f, n)})`)
    .join('; ')
  const columns = faixas
    .map((f, k) => `${ordinal(k + 1)} ${sinal(passos[k] as number)} (${coluna(f, n)})`)
    .join('; ')
  return {
    familia: 'trio_passos_diferentes',
    ...serie,
    erros: [
      comValores(faixas, ultimo.map((v) => v + s1)), // aplicou o passo da 1ª posição em todas
      comValores(faixas, [prox[0] as number, (ultimo[1] as number) + s3, (ultimo[2] as number) + s2]), // trocou os passos da 2ª e 3ª
      comValores(faixas, [prox[0] as number, prox[1] as number, ultimo[2] as number]), // esqueceu a última posição
      comValores(faixas, [(ultimo[0] as number) + s2, prox[1] as number, prox[2] as number]),
    ],
    explanation: {
      pt:
        `Cada posição do trio tem o próprio passo: ${colunas}. Aplicando cada um no último ` +
        `termo, ${serie.termos.at(-1)} → ${serie.resposta}. Não procure uma regra para o termo ` +
        `inteiro: separe as colunas e resolva três séries curtas.`,
      en:
        `Each position of the trio has its own step: ${columns}. Applying each one to the last ` +
        `term, ${serie.termos.at(-1)} → ${serie.resposta}. Do not look for one rule for the ` +
        `whole term: split the columns and solve three short series.`,
    },
  }
}

/** A3, C6, E9, G12 → I15: letra e número, cada um com o próprio passo. */
const letraNumeroLinear: Familia = (rng) => {
  const k = rng.int(1, 3)
  const c = rng.int(2, 9)
  const n = rng.pick([4, 5])
  const p = trilha(rng.int(1, 26 - n * k), k)
  const x = trilha(rng.int(1, 12), c)
  const faixas = [L(p), N(x)]
  const serie = porFaixas(faixas, n)
  if (!serie) return null
  return {
    familia: 'letra_numero_linear',
    ...serie,
    erros: [
      comValores(faixas, [p(n), x(n) + 1]),
      comValores(faixas, [p(n), x(n) - 1]),
      comValores(faixas, [p(n) + 1, x(n)]), // letra errada por um
      comValores(faixas, [p(n) - 1, x(n)]),
      comValores(faixas, [p(n), x(n - 1) + k]), // aplicou o passo da letra no número
    ],
    explanation: {
      pt:
        `Letra e número andam separados. As letras ${coluna(L(p), n)} avançam ${k}; os números ` +
        `${coluna(N(x), n)} sobem ${c}. O próximo é ${letra(p(n))} com ${x(n)}: ` +
        `${serie.resposta}. Em termo com letra e número, resolva cada parte como uma série à parte.`,
      en:
        `Letter and number move separately. The letters ${coluna(L(p), n)} move forward ${k}; the ` +
        `numbers ${coluna(N(x), n)} go up by ${c}. The next one is ${letra(p(n))} with ${x(n)}: ` +
        `${serie.resposta}. When a term mixes a letter and a number, solve each part as its own ` +
        `series.`,
    },
  }
}

// --- Nível 4 -----------------------------------------------------------------

/** A2, C4, E8, G16 → I32: o número é geométrico. */
const letraNumeroGeometrico: Familia = (rng) => {
  const k = rng.int(1, 3)
  const r = rng.pick([2, 3])
  const n = 4
  const p = trilha(rng.int(1, 26 - n * k), k)
  const x0 = rng.int(1, r === 2 ? 6 : 3)
  const x = (i: number) => x0 * r ** i
  const faixas = [L(p), N(x)]
  const serie = porFaixas(faixas, n)
  if (!serie) return null
  const ultimaDif = x(n - 1) - x(n - 2)
  return {
    familia: 'letra_numero_geometrico',
    ...serie,
    erros: [
      comValores(faixas, [p(n), x(n - 1) + ultimaDif]), // repetiu a última diferença
      comValores(faixas, [p(n), x(n - 1) + r]), // somou a razão em vez de multiplicar
      comValores(faixas, [p(n), x(n - 1) * (r + 1)]),
      comValores(faixas, [p(n) + 1, x(n)]),
      comValores(faixas, [p(n) - 1, x(n)]),
    ],
    explanation: {
      pt:
        `As letras ${coluna(L(p), n)} avançam ${k}; os números ${coluna(N(x), n)} são ` +
        `multiplicados por ${r}. Próximo: ${letra(p(n))} e ${x(n - 1)} × ${r} = ${x(n)}, ou seja ` +
        `${serie.resposta}. Se a diferença entre os números cresce rápido, divida um pelo ` +
        `anterior antes de somar.`,
      en:
        `The letters ${coluna(L(p), n)} move forward ${k}; the numbers ${coluna(N(x), n)} are ` +
        `multiplied by ${r}. Next: ${letra(p(n))} and ${x(n - 1)} × ${r} = ${x(n)}, i.e. ` +
        `${serie.resposta}. If the gap between the numbers grows fast, divide one by the ` +
        `previous before adding.`,
    },
  }
}

/** ABC, BCD, DEF, GHI → KLM: o trio anda +1, +2, +3… */
const trioSaltoCrescente: Familia = (rng) => {
  const s = rng.pick([1, 2])
  const k0 = rng.pick([1, 2])
  const n = 4
  const p0 = rng.int(1, 5)
  const faixas = [0, 1, 2].map((j) => L(trilha(p0 + j * s, k0, 1)))
  const serie = porFaixas(faixas, n)
  if (!serie) return null
  const prox = faixas.map((f) => f.em(n))
  const ultimo = faixas.map((f) => f.em(n - 1))
  const ultimoSalto = k0 + n - 2
  return {
    familia: 'trio_salto_crescente',
    ...serie,
    erros: [
      comValores(faixas, ultimo.map((v) => v + ultimoSalto)), // repetiu o último salto
      comValores(faixas, prox.map((v) => v + 1)), // o salto cresceu 2
      comValores(faixas, [prox[0] as number, (ultimo[1] as number) + ultimoSalto, (ultimo[2] as number) + ultimoSalto]), // salto novo só na 1ª letra
    ],
    explanation: {
      pt:
        `O trio anda junto, mas o salto cresce: a 1ª letra faz ${coluna(faixas[0] as Faixa, n)}, ` +
        `saltos ${saltos((faixas[0] as Faixa).em, n)}. O próximo salto é +${ultimoSalto + 1}, ` +
        `nas três letras: ${serie.termos.at(-1)} → ${serie.resposta}. Ache a regra numa coluna ` +
        `só e depois aplique nas outras.`,
      en:
        `The trio moves together, but the jump grows: the 1st letter runs ` +
        `${coluna(faixas[0] as Faixa, n)}, jumps ${saltos((faixas[0] as Faixa).em, n)}. The next ` +
        `jump is +${ultimoSalto + 1}, on all three letters: ${serie.termos.at(-1)} → ` +
        `${serie.resposta}. Find the rule in one column, then apply it to the others.`,
    },
  }
}

/** Z, Y, W, T, P → K: recuando, com o salto crescendo. */
const saltoCrescenteReverso: Familia = (rng) => {
  const k0 = rng.int(1, 3)
  const n = rng.pick([4, 5])
  const p = trilha(rng.int(15, 26), -k0, -1)
  const serie = porFaixas([L(p)], n)
  if (!serie) return null
  const ultimoSalto = k0 + n - 2
  const prox = p(n)
  return {
    familia: 'salto_crescente_reverso',
    ...serie,
    erros: [
      letraOu(p(n - 1) - ultimoSalto), // repetiu o último salto
      letraOu(prox - 1), // o salto cresceu 2
      letraOu(p(n - 1) + ultimoSalto + 1), // andou para frente
    ],
    explanation: {
      pt:
        `A série anda para TRÁS, e cada salto é 1 maior que o anterior: ${cadeia(p, n)}, ` +
        `saltos ${saltos(p, n)}. O próximo é −${ultimoSalto + 1}: ${rot(p(n - 1))} − ` +
        `${ultimoSalto + 1} = ${rot(prox)}. De trás para frente é onde a contagem escorrega: ` +
        `use as âncoras E = 5, J = 10, O = 15, T = 20.`,
      en:
        `The series runs BACKWARDS, and each jump is 1 bigger than the last: ${cadeia(p, n)}, ` +
        `jumps ${saltos(p, n)}. The next one is −${ultimoSalto + 1}: ${rot(p(n - 1))} − ` +
        `${ultimoSalto + 1} = ${rot(prox)}. Counting backwards is where people slip: use the ` +
        `anchors E = 5, J = 10, O = 15, T = 20.`,
    },
  }
}

// --- Nível 5 -----------------------------------------------------------------

/** B4, D16, F36, H64 → J100: o número é o quadrado da posição da letra. */
const letraNumeroQuadrado: Familia = (rng) => {
  const k = rng.int(1, 3)
  const n = 4
  const p = trilha(rng.int(1, 26 - n * k), k)
  const x = (i: number) => p(i) ** 2
  const faixas = [L(p), N(x)]
  const serie = porFaixas(faixas, n)
  if (!serie) return null
  const ultimaDif = x(n - 1) - x(n - 2)
  const pares = [0, 1, 2].map((i) => `${letra(p(i))} = ${p(i)} → ${p(i)}² = ${x(i)}`).join('; ')
  return {
    familia: 'letra_numero_quadrado',
    ...serie,
    erros: [
      comValores(faixas, [p(n) - 1, (p(n) - 1) ** 2]), // letra errada, com o quadrado dela
      comValores(faixas, [p(n) + 1, (p(n) + 1) ** 2]),
      comValores(faixas, [p(n), x(n - 1) + ultimaDif]), // repetiu a última diferença do número
      comValores(faixas, [p(n), p(n) * 10]),
    ],
    explanation: {
      pt:
        `O número é o quadrado da posição da letra: ${pares}. As letras avançam ${k}, então a ` +
        `próxima é ${rot(p(n))}, e o número é ${p(n)}² = ${x(n)}: ${serie.resposta}. Quando ` +
        `letra e número parecem soltos, teste se um sai do outro.`,
      en:
        `The number is the square of the letter's position: ${pares}. The letters move forward ` +
        `${k}, so the next one is ${rot(p(n))}, and the number is ${p(n)}² = ${x(n)}: ` +
        `${serie.resposta}. When letter and number look unrelated, test whether one comes from ` +
        `the other.`,
    },
  }
}

/** Trança em que uma trilha tem salto crescente: precisa de 7-8 termos para as duas fecharem. */
const duasTrilhasCrescente: Familia = (rng) => {
  const k0 = rng.pick([1, 2])
  const b = rng.int(1, 3)
  const A = trilha(rng.int(1, 4), k0, 1)
  const B = trilha(rng.int(22, 26), -b)
  const n = rng.pick([7, 8])
  const descA = {
    pt: `avançam com salto crescente (+${k0}, +${k0 + 1}, +${k0 + 2}…)`,
    en: `move forward with a growing jump (+${k0}, +${k0 + 1}, +${k0 + 2}…)`,
  }
  return rng.next() < 0.5
    ? trancar('duas_trilhas_crescente', A, B, n, descA, recua(b))
    : trancar('duas_trilhas_crescente', B, A, n, recua(b), descA)
}

/** AZM, BXM, DVM, GTM → KRM: salto crescente, recuo fixo e letra parada no mesmo trio. */
const trioMisto: Familia = (rng) => {
  const k0 = rng.pick([1, 2])
  const b = rng.int(1, 3)
  const n = 4
  const cresce = trilha(rng.int(1, 6), k0, 1)
  const desce = trilha(rng.int(1 + (n + 1) * b, 26), -b)
  const fixa = trilha(rng.int(1, 26), 0)
  const ordem = rng.shuffle([cresce, desce, fixa])
  const faixas = ordem.map((f) => L(f))
  const serie = porFaixas(faixas, n)
  if (!serie) return null
  const prox = faixas.map((f) => f.em(n))
  const ultimo = faixas.map((f) => f.em(n - 1))
  const iCresce = ordem.indexOf(cresce)
  const iDesce = ordem.indexOf(desce)
  const iFixa = ordem.indexOf(fixa)
  const ultimoSalto = k0 + n - 2
  const trocando = (k: number, v: number) => prox.map((p, j) => (j === k ? v : p))

  const papel = (i: number): LocalizedText =>
    i === iCresce
      ? { pt: `salto crescente (${coluna(faixas[i] as Faixa, n)})`, en: `a growing jump (${coluna(faixas[i] as Faixa, n)})` }
      : i === iDesce
        ? { pt: `recua ${b} (${coluna(faixas[i] as Faixa, n)})`, en: `steps back ${b} (${coluna(faixas[i] as Faixa, n)})` }
        : { pt: `fica parada (${letra(prox[i] as number)})`, en: `stays put (${letra(prox[i] as number)})` }

  return {
    familia: 'trio_misto',
    ...serie,
    erros: [
      comValores(faixas, trocando(iCresce, (ultimo[iCresce] as number) + ultimoSalto)), // repetiu o último salto
      comValores(faixas, trocando(iDesce, (ultimo[iDesce] as number) - b - 1)), // errou o recuo por um
      comValores(faixas, trocando(iFixa, (ultimo[iFixa] as number) + 1)), // andou a letra parada
      comValores(faixas, trocando(iCresce, (prox[iCresce] as number) + 1)),
    ],
    explanation: {
      pt:
        `Cada posição tem uma regra diferente — 1ª: ${papel(0).pt}; 2ª: ${papel(1).pt}; 3ª: ` +
        `${papel(2).pt}. Aplicando cada uma: ${serie.termos.at(-1)} → ${serie.resposta}. ` +
        `Termo de três letras quase nunca tem regra única; resolva coluna por coluna.`,
      en:
        `Each position has a different rule — 1st: ${papel(0).en}; 2nd: ${papel(1).en}; 3rd: ` +
        `${papel(2).en}. Applying each one: ${serie.termos.at(-1)} → ${serie.resposta}. A ` +
        `three-letter term almost never has a single rule; solve it column by column.`,
    },
  }
}

/**
 * Famílias por nível.
 *
 * 1: uma regra linear numa letra só, ou o trio que anda inteiro.
 * 2: salto que cresce; trio com posições de regras diferentes.
 * 3: trança de duas trilhas; cada posição do trio com passo próprio; letra + número.
 * 4: número geométrico junto da letra; salto crescente no trio e de trás para frente.
 * 5: número que sai da letra; trança com salto crescente; três regras num trio.
 */
const FAMILIAS: Record<Difficulty, Familia[]> = {
  1: [saltoFixo, trioDeslocado],
  2: [saltoCrescente, trioEspelhado],
  3: [duasTrilhas, trioPassosDiferentes, letraNumeroLinear],
  4: [letraNumeroGeometrico, trioSaltoCrescente, saltoCrescenteReverso],
  5: [letraNumeroQuadrado, duasTrilhasCrescente, trioMisto],
}

export const gerarSerieLetras: LetrasGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const regra = sortear(() => rng.pick(FAMILIAS[difficulty])(rng))
  return montar(rng, regra)
}

export const LETRAS_GENERATORS = {
  serie_letras: gerarSerieLetras,
} as const satisfies Record<string, LetrasGenerator>

// --- Sorteio -----------------------------------------------------------------

/**
 * Sorteia até sair uma série utilizável. Rejeita:
 *  - termo repetido no enunciado;
 *  - resposta que já aparece no enunciado (numa trança isso acontece de verdade,
 *    e o candidato acerta de vista);
 *  - série que o leitor do gate não fecha, ou fecha com mais de uma resposta.
 *    É a mesma checagem que o gate faz — o gerador nunca produz o que ele reprova.
 */
function sortear(build: () => Regra | null): Regra {
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const regra = build()
    if (regra && regraValida(regra)) return regra
  }
  throw new Error('não consegui montar uma série de letras válida')
}

function regraValida(r: Regra): boolean {
  if (new Set(r.termos).size !== r.termos.length) return false
  const stem = stemDe(r.termos)
  if (r.termos.includes(r.resposta) || enunciadoContem(stem, r.resposta)) return false
  // Letra solta repetida entre as trilhas também abre segunda leitura.
  if (r.termos.every((t) => t.length === 1) && new Set(r.termos.join('')).size !== r.termos.length) {
    return false
  }
  const leituras = lerSerieDeLetras(stem)
  return leituras.length === 1 && leituras[0] === r.resposta
}

// --- Montagem ----------------------------------------------------------------

function montar(rng: Rng, regra: Regra): LetrasGenerated {
  const stem = stemDe(regra.termos)
  const textos = comDistratores(rng, regra, OPCOES_POR_QUESTAO, stem)
  const embaralhados = rng.shuffle(textos.map((t, i) => ({ t, isCorrect: i === 0 })))

  const options = embaralhados.map((o, i) => ({ id: optionIdAt(i) as string, text: o.t }))
  const answerIndex = embaralhados.findIndex((o) => o.isCorrect)

  return {
    subtipo: 'serie_letras',
    stem,
    options,
    answerId: optionIdAt(answerIndex) as string,
    explanation: {
      pt: `A resposta é ${regra.resposta}. ${regra.explanation.pt}`,
      en: `The answer is ${regra.resposta}. ${regra.explanation.en}`,
    },
    familia: regra.familia,
  }
}

/**
 * Distratores = os erros de regra da família primeiro, depois o deslize de
 * contagem (uma letra a mais ou a menos numa posição), que é o erro mais comum
 * de quem conta o alfabeto de cabeça. Nenhum repete termo do enunciado nem muda
 * a forma do termo (trio continua trio, letra + número continua letra + número).
 */
function comDistratores(rng: Rng, regra: Regra, quantidade: number, stem: string): string[] {
  const forma = componentesDe(regra.resposta) ?? []
  const valores = forma.map((c) => c.valor)
  /** A resposta com UMA posição deslocada de d. */
  const variar = (deltas: number[]): string[] =>
    forma
      .flatMap((_, k) => deltas.map((d) => comValores(forma, valores.map((x, j) => (j === k ? x + d : x)))))
      .filter(ehTexto)

  const deslizes = variar([1, -1])
  const longe = variar([2, -2, 3, -3])

  const textos = new Set([normalizeText(regra.resposta)])
  const doEnunciado = new Set(regra.termos.map(normalizeText))
  const aceita = (t: string): boolean => {
    const partes = componentesDe(t)
    if (!partes || partes.length !== forma.length) return false
    if (partes.some((p, k) => p.tipo !== forma[k]?.tipo)) return false
    const norm = normalizeText(t)
    if (textos.has(norm) || doEnunciado.has(norm) || enunciadoContem(stem, t)) return false
    textos.add(norm)
    return true
  }

  const escolhidos = [regra.resposta]
  const pegar = (lista: string[], ate: number) => {
    for (const t of lista) {
      if (escolhidos.length >= ate) return
      if (aceita(t)) escolhidos.push(t)
    }
  }

  const erros = regra.erros.filter(ehTexto)
  pegar(rng.shuffle(erros), quantidade - 1)
  pegar(rng.shuffle(deslizes), quantidade)
  pegar(erros, quantidade)
  pegar(rng.shuffle(longe), quantidade)

  // Rede de segurança: numa trança de 8 letras os vizinhos da resposta podem
  // estar todos no enunciado. Completa afastando-se dela.
  for (let d = 4; escolhidos.length < quantidade; d++) {
    if (d > 26) throw new Error('não consegui montar distratores para a série de letras')
    pegar(variar([d, -d]), quantidade)
  }
  return escolhidos
}

// --- Utilitários -------------------------------------------------------------

const ANCORAS: LocalizedText = {
  pt: 'Numere o alfabeto de cabeça — E = 5, J = 10, O = 15, T = 20 são âncoras que poupam recitar desde o A.',
  en: 'Number the alphabet in your head — E = 5, J = 10, O = 15, T = 20 are anchors that save reciting from A.',
}

function letraOu(pos: number): string | null {
  return letraValida(pos) ? letra(pos) : null
}

function ehTexto(t: string | null): t is string {
  return t !== null
}

/** Letra com a posição: "G(7)". */
function rot(pos: number): string {
  return `${letra(pos)}(${pos})`
}

/** "B(2) → E(5) → H(8)" para os n termos exibidos. */
function cadeia(p: (i: number) => number, n: number): string {
  return Array.from({ length: n }, (_, i) => rot(p(i))).join(' → ')
}

/** Os valores de uma coluna nos n termos exibidos: "C, D, E, F". */
function coluna(f: Faixa, n: number): string {
  return Array.from({ length: n }, (_, i) => (f.tipo === 'letra' ? letra(f.em(i)) : String(f.em(i)))).join(', ')
}

/** "+2, +3, +4" — os saltos entre os termos exibidos. */
function saltos(p: (i: number) => number, n: number): string {
  return Array.from({ length: n - 1 }, (_, i) => sinal(p(i + 1) - p(i))).join(', ')
}

function sinal(v: number): string {
  return v < 0 ? `−${Math.abs(v)}` : `+${v}`
}

function stemDe(termos: string[]): string {
  return `${termos.join(', ')}, ?`
}

/** Mesmo critério do gate G2, com borda dos dois lados. */
function enunciadoContem(stem: string, texto: string): boolean {
  return ` ${normalizeText(stem)} `.includes(` ${normalizeText(texto)} `)
}

/** Ordinal em inglês; só aparece para posições de 1 a 9, então basta o caso simples. */
function ordinal(n: number): string {
  const sufixo = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  return `${n}${sufixo}`
}
