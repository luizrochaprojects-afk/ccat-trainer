import type { LocalizedText } from '../../i18n'
import type { Rng } from '../../rng'
import type { Candidato } from '../alternativas'
import type { QmGerador } from '../questao'
import type { Nivel } from '../taxonomia'
import { decimalCurto, errosDeEscala, fmt, fmtResposta, gerar, mantissa, type Problema } from './comum'

/**
 * Crescimento composto, regra do 72 e CAGR.
 *
 * O erro que importa é compor como se fosse soma: 50% ao ano por 2 anos não é
 * +100%, é +125%. Com taxa e prazo pequenos (10% por 2 anos) a diferença some
 * dentro da folga — e de fato não importa numa entrevista —, então os níveis
 * que cobram composição sorteiam taxa e prazo em que ela aparece.
 *
 *  - 1: 2 anos a 50%, 60% ou 100%; exata
 *  - 2: regra do 72 — dobra em quantos anos; exata (o gabarito é a regra)
 *  - 3: 3–5 anos a 10–40%, só onde composto e simples se separam; estimativa
 *  - 4: CAGR de A para B em 2–5 anos; estimativa
 *  - 5: prazo longo que cabe em dobras (g·n ≈ 72 × k); estimativa
 */

const SIMPLES: LocalizedText = {
  pt: 'Usou crescimento simples: somou as taxas em vez de compor.',
  en: 'Used simple growth: added the rates instead of compounding.',
}

const potencia = (f: number, n: number) => Array.from({ length: n }, () => f).reduce((a, b) => a * b, 1)
const produtoExpr = (base: number, f: string, n: number) => [String(base), ...Array.from({ length: n }, () => f)].join('*')

function composto(rng: Rng, nivel: 1 | 3): Problema | null {
  const g = rng.pick(nivel === 1 ? [50, 60, 100] : [10, 15, 20, 25, 30, 35, 40])
  const n = nivel === 1 ? 2 : rng.int(3, 5)
  const f = 1 + g / 100
  const fator = potencia(f, n)
  // Onde composto e simples ficam colados, a pergunta não ensina nada.
  if (fator / (1 + (n * g) / 100) < (nivel === 1 ? 1.11 : 1.18)) return null
  const N = mantissa(rng, nivel === 1 ? 1 : 2) * 10 ** rng.int(5, 8)
  const correta = N * fator
  const estimativa = nivel === 3
  const base = fmt(N, 'moeda')
  const r = fmtResposta(correta, 'moeda', estimativa)
  const fTxt = decimalCurto(f)
  const fatorTxt = { pt: String(Number(fator.toFixed(2))).replace('.', ','), en: String(Number(fator.toFixed(2))) }
  const candidatos: Candidato[] = [
    { valor: N * (1 + (n * g) / 100), erro: SIMPLES },
    // um ano a mais e um a menos: erros dos dois lados da resposta, para que o
    // composto não fique sempre acima de todos os distratores
    ...rng.shuffle([
      { valor: N * potencia(f, n + 1), erro: { pt: 'Contou um ano a mais.', en: 'Counted one year too many.' } },
      { valor: N * potencia(f, n - 1), erro: { pt: 'Contou um ano a menos.', en: 'Counted one year too few.' } },
    ]),
    ...errosDeEscala(correta).slice(0, 2),
  ]
  return {
    enunciado: {
      pt: `Uma receita de ${base.pt} cresce ${g}% ao ano. Quanto ela vale depois de ${n} anos?`,
      en: `Revenue of ${base.en} grows ${g}% a year. What is it after ${n} years?`,
    },
    correta,
    candidatos,
    unidade: 'moeda',
    estimativa,
    expression: produtoExpr(N, `(1+${g}/100)`, n),
    atalho: {
      pt: `Componha: ${fTxt.pt} elevado a ${n} ${estimativa ? '≈' : '='} ${fatorTxt.pt}; ${base.pt} × ${fatorTxt.pt} ${estimativa ? '≈' : '='} ${r.pt}.`,
      en: `Compound: ${fTxt.en} to the ${n} ${estimativa ? '≈' : '='} ${fatorTxt.en}; ${base.en} × ${fatorTxt.en} ${estimativa ? '≈' : '='} ${r.en}.`,
    },
  }
}

/**
 * Nos dois sentidos, como aparece em case: "a 8%, dobra em quantos anos?" e
 * "para dobrar em 6 anos, qual a taxa?". A conta é a mesma — 72 ÷ o que foi
 * dado —, e os erros também.
 */
function regraDo72(rng: Rng): Problema {
  const dado = rng.pick([3, 4, 6, 8, 9, 12, 18, 24])
  const correta = 72 / dado
  const pedeAnos = rng.next() < 0.5
  const erros = rng.shuffle([
    { valor: 100 / dado, erro: { pt: 'Usou 100 em vez de 72.', en: 'Used 100 instead of 72.' } },
    {
      valor: 144 / dado,
      erro: pedeAnos
        ? { pt: 'Esse é o tempo para quadruplicar.', en: 'That is the time to quadruple.' }
        : { pt: 'Essa é a taxa para quadruplicar.', en: 'That is the rate to quadruple.' },
    },
    { valor: 36 / dado, erro: { pt: 'Usou 36 em vez de 72.', en: 'Used 36 instead of 72.' } },
  ])
  return {
    enunciado: pedeAnos
      ? {
          pt: `A ${dado}% ao ano, em quantos anos um valor dobra? (regra do 72)`,
          en: `At ${dado}% a year, in how many years does a value double? (rule of 72)`,
        }
      : {
          pt: `Para dobrar em ${dado} anos, qual a taxa anual? (regra do 72)`,
          en: `To double in ${dado} years, what annual rate is needed? (rule of 72)`,
        },
    correta,
    // taxa ×10 (90% ao ano) é absurda; só o ÷10 é um erro de vírgula plausível
    candidatos: [...erros, ...errosDeEscala(correta).slice(pedeAnos ? 0 : 1, 2)],
    unidade: pedeAnos ? 'numero' : 'percent',
    estimativa: false,
    expression: `72/${dado}`,
    atalho: pedeAnos
      ? { pt: `Regra do 72: 72 ÷ ${dado} = ${correta} anos.`, en: `Rule of 72: 72 ÷ ${dado} = ${correta} years.` }
      : { pt: `Regra do 72: 72 ÷ ${dado} = ${correta}% ao ano.`, en: `Rule of 72: 72 ÷ ${dado} = ${correta}% a year.` },
  }
}

function cagr(rng: Rng): Problema | null {
  const g = rng.int(6, 30)
  const n = rng.int(2, 5)
  const A = mantissa(rng, 2) * 10 ** rng.int(6, 8)
  const B = A * potencia(1 + g / 100, n)
  const razao = B / A
  const a = fmt(A, 'moeda')
  const b = fmt(B, 'moeda')
  const r = fmtResposta(g, 'percent', true)
  const razaoTxt = decimalCurto(razao)
  return {
    enunciado: {
      pt: `A receita foi de ${a.pt} para ${b.pt} em ${n} anos. Qual o crescimento anual composto (CAGR)?`,
      en: `Revenue went from ${a.en} to ${b.en} in ${n} years. What is the compound annual growth rate (CAGR)?`,
    },
    correta: g,
    candidatos: [
      {
        valor: ((razao - 1) / n) * 100,
        erro: { pt: 'Dividiu o crescimento total pelos anos, sem compor.', en: 'Divided total growth by the years, without compounding.' },
      },
      { valor: (razao - 1) * 100, erro: { pt: 'Deu o crescimento total, não o anual.', en: 'Gave total growth, not annual.' } },
      ...errosDeEscala(g).slice(1, 2),
    ],
    unidade: 'percent',
    estimativa: true,
    // O solver não tem potência nem raiz: o gabarito é a taxa que construiu B.
    expression: String(g),
    atalho: {
      pt: `${b.pt} ÷ ${a.pt} ≈ ${razaoTxt.pt}. Procure a taxa que, composta ${n} vezes, dá ${razaoTxt.pt}: ≈ ${r.pt} ao ano.`,
      en: `${b.en} ÷ ${a.en} ≈ ${razaoTxt.en}. Find the rate that compounds to ${razaoTxt.en} over ${n} years: ≈ ${r.en} a year.`,
    },
  }
}

function dobras(rng: Rng): Problema {
  const g = rng.pick([6, 8, 9, 12])
  const k = rng.pick([2, 3])
  const n = (72 * k) / g
  const N = mantissa(rng, 2) * 10 ** rng.int(5, 7)
  const correta = N * potencia(1 + g / 100, n)
  const base = fmt(N, 'moeda')
  const r = fmtResposta(correta, 'moeda', true)
  return {
    enunciado: {
      pt: `Um fundo de ${base.pt} rende ${g}% ao ano. Quanto ele vale depois de ${n} anos?`,
      en: `A fund of ${base.en} earns ${g}% a year. What is it worth after ${n} years?`,
    },
    correta,
    candidatos: [
      { valor: N * (1 + (n * g) / 100), erro: SIMPLES },
      { valor: N * 2 ** (k + 1), erro: { pt: 'Contou uma dobra a mais.', en: 'Counted one doubling too many.' } },
      { valor: N * 2 ** (k - 1), erro: { pt: 'Contou uma dobra a menos.', en: 'Counted one doubling too few.' } },
      ...errosDeEscala(correta).slice(0, 2),
    ],
    unidade: 'moeda',
    estimativa: true,
    expression: produtoExpr(N, `(1+${g}/100)`, n),
    atalho: {
      pt: `Regra do 72: a ${g}% dobra a cada ${72 / g} anos; ${n} anos são ${k} dobras → × ${2 ** k} ≈ ${r.pt}.`,
      en: `Rule of 72: at ${g}% it doubles every ${72 / g} years; ${n} years is ${k} doublings → × ${2 ** k} ≈ ${r.en}.`,
    },
  }
}

function construir(rng: Rng, nivel: Nivel): Problema | null {
  switch (nivel) {
    case 1:
    case 3:
      return composto(rng, nivel)
    case 2:
      return regraDo72(rng)
    case 4:
      return cagr(rng)
    case 5:
      return dobras(rng)
  }
}

export const gerarCrescimento: QmGerador = (seed, nivel) => gerar('crescimento', construir, seed, nivel)
