import type { LocalizedText } from '../../i18n'
import type { Rng } from '../../rng'
import type { QmGerador } from '../questao'
import type { Nivel } from '../taxonomia'
import type { Candidato } from '../alternativas'
import { errosDeEscala, fmt, fmtResposta, gerar, mantissa, type Problema } from './comum'

/**
 * Frações ↔ porcentagem, com foco na fração do ano — a conta que travou o
 * case do modelo de crédito ("entra em abril: roda 9/12 do ano").
 *
 *  - 1: 1/2, 1/4, 1/5, 1/8, 3/4 → %; exata
 *  - 2: 1/3, 2/3, 1/6, 1/12, 3/8, 5/8 → %; exata
 *  - 3: fração do ano a partir do mês de entrada; exata
 *  - 4: sétimos, nonos, onze avos, dezesseis avos → %; estimativa
 *  - 5: k/12 de um valor; estimativa
 */

export const MESES: readonly LocalizedText[] = [
  { pt: 'janeiro', en: 'January' },
  { pt: 'fevereiro', en: 'February' },
  { pt: 'março', en: 'March' },
  { pt: 'abril', en: 'April' },
  { pt: 'maio', en: 'May' },
  { pt: 'junho', en: 'June' },
  { pt: 'julho', en: 'July' },
  { pt: 'agosto', en: 'August' },
  { pt: 'setembro', en: 'September' },
  { pt: 'outubro', en: 'October' },
  { pt: 'novembro', en: 'November' },
  { pt: 'dezembro', en: 'December' },
]

/** Meses que rodam no ano, entrando no dia 1 do mês `m` (1 = janeiro). */
export const mesesRodando = (m: number) => 13 - m

const FRACOES: Record<1 | 2 | 4, readonly [number, number][]> = {
  1: [[1, 2], [1, 4], [1, 5], [1, 8], [3, 4]],
  2: [[1, 3], [2, 3], [1, 6], [1, 12], [3, 8], [5, 8]],
  4: [[1, 7], [2, 7], [3, 7], [1, 9], [2, 9], [4, 9], [1, 11], [1, 16], [3, 16], [5, 16]],
}

function vizinhas(n: number, d: number): Candidato[] {
  return [d - 1, d + 1]
    .filter((v) => v > n)
    .map((v) => ({
      valor: (n / v) * 100,
      erro: { pt: `Confundiu com ${n}/${v}.`, en: `Mixed it up with ${n}/${v}.` },
    }))
}

function fracaoEmPercentual(rng: Rng, nivel: 1 | 2 | 4): Problema {
  const [n, d] = rng.pick(FRACOES[nivel])
  const correta = (n / d) * 100
  const estimativa = nivel === 4
  const r = fmtResposta(correta, 'percent', estimativa)
  const unidade = (100 / d)
  const base = fmtResposta(unidade, 'percent', estimativa)
  return {
    enunciado: { pt: `Quanto é ${n}/${d} em porcentagem?`, en: `What is ${n}/${d} as a percentage?` },
    correta,
    candidatos: [...vizinhas(n, d), ...errosDeEscala(correta).slice(0, 2)],
    unidade: 'percent',
    estimativa,
    expression: `${n}/${d}*100`,
    atalho:
      n === 1
        ? { pt: `1/${d} = 100 ÷ ${d} ${estimativa ? '≈' : '='} ${r.pt}.`, en: `1/${d} = 100 ÷ ${d} ${estimativa ? '≈' : '='} ${r.en}.` }
        : {
            pt: `1/${d} ${estimativa ? '≈' : '='} ${base.pt}; × ${n} ${estimativa ? '≈' : '='} ${r.pt}.`,
            en: `1/${d} ${estimativa ? '≈' : '='} ${base.en}; × ${n} ${estimativa ? '≈' : '='} ${r.en}.`,
          },
  }
}

function fracaoDoAno(rng: Rng): Problema {
  const m = rng.int(2, 12)
  const k = mesesRodando(m)
  const correta = (k / 12) * 100
  const mes = MESES[m - 1]!
  const r = fmt(correta, 'percent')
  const candidatos: Candidato[] = [
    { valor: ((k - 1) / 12) * 100, erro: { pt: 'Contou um mês a menos.', en: 'Counted one month too few.' } },
    { valor: ((k + 1) / 12) * 100, erro: { pt: 'Contou um mês a mais.', en: 'Counted one month too many.' } },
    { valor: ((m - 1) / 12) * 100, erro: { pt: 'Contou os meses antes da entrada.', en: 'Counted the months before go-live.' } },
    { valor: (k / 10) * 100, erro: { pt: 'Dividiu por 10 em vez de 12.', en: 'Divided by 10 instead of 12.' } },
  ]
  return {
    enunciado: {
      pt: `Um modelo entra no ar em 1º de ${mes.pt}. Que porcentagem do ano ele roda?`,
      en: `A model goes live on ${mes.en} 1. What percentage of the year does it run?`,
    },
    correta,
    candidatos: candidatos.filter((c) => c.valor > 0),
    unidade: 'percent',
    estimativa: false,
    expression: `${k}/12*100`,
    atalho: {
      pt: `De ${mes.pt} a dezembro são ${k} meses: ${k}/12 = ${r.pt}.`,
      en: `${mes.en} through December is ${k} months: ${k}/12 = ${r.en}.`,
    },
  }
}

function dozeAvosDeValor(rng: Rng): Problema | null {
  const k = rng.pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 11])
  const N = mantissa(rng, 2) * 10 ** rng.int(5, 8)
  const correta = (N * k) / 12
  const n = fmt(N, 'moeda')
  const r = fmtResposta(correta, 'moeda', true)
  const mensal = fmtResposta(N / 12, 'moeda', true)
  return {
    enunciado: { pt: `Quanto é ${k}/12 de ${n.pt}?`, en: `What is ${k}/12 of ${n.en}?` },
    correta,
    candidatos: [
      { valor: (N * (k - 1)) / 12, erro: { pt: 'Contou um mês a menos.', en: 'Counted one month too few.' } },
      { valor: (N * (k + 1)) / 12, erro: { pt: 'Contou um mês a mais.', en: 'Counted one month too many.' } },
      { valor: (N * k) / 10, erro: { pt: 'Dividiu por 10 em vez de 12.', en: 'Divided by 10 instead of 12.' } },
      ...errosDeEscala(correta).slice(0, 2),
    ].filter((c) => c.valor > 0),
    unidade: 'moeda',
    estimativa: true,
    expression: `${N}*${k}/12`,
    atalho: {
      pt: `Um mês é ${n.pt} ÷ 12 ≈ ${mensal.pt}; × ${k} ≈ ${r.pt}.`,
      en: `One month is ${n.en} ÷ 12 ≈ ${mensal.en}; × ${k} ≈ ${r.en}.`,
    },
  }
}

function construir(rng: Rng, nivel: Nivel): Problema | null {
  switch (nivel) {
    case 1:
    case 2:
    case 4:
      return fracaoEmPercentual(rng, nivel)
    case 3:
      return fracaoDoAno(rng)
    case 5:
      return dozeAvosDeValor(rng)
  }
}

export const gerarFracoes: QmGerador = (seed, nivel) => gerar('fracoes', construir, seed, nivel)
