import type { LocalizedText } from '../../i18n'
import type { Rng } from '../../rng'
import type { QmGerador } from '../questao'
import type { Nivel } from '../taxonomia'
import { errosDeEscala, fmt, fmtResposta, gerar, mantissa, type Problema } from './comum'

/**
 * Média ponderada: margem média de um mix, mudança de mix, crescimento de
 * segmentos de tamanhos diferentes.
 *
 * O distrator principal é a média simples, então o sorteio descarta os casos
 * em que ela fica colada na ponderada (pesos quase iguais, margens quase
 * iguais) — ali a questão não distinguiria quem pondera de quem não pondera.
 *
 *  - 1: 2 produtos, pesos 20/80 a 40/60; exata
 *  - 2: 3 produtos, pesos em % que somam 100; exata
 *  - 3: 3 produtos, pesos dados em receita; estimativa
 *  - 4: o mix muda; nova margem média; estimativa
 *  - 5: crescimento total de 2 segmentos, um deles pode encolher; estimativa
 */

const MEDIA_SIMPLES: LocalizedText = {
  pt: 'Usou a média simples, sem os pesos.',
  en: 'Used the simple average, ignoring the weights.',
}

const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const ponderada = (valores: number[], pesos: number[]) =>
  valores.reduce((a, v, i) => a + v * pesos[i]!, 0) / pesos.reduce((a, b) => a + b, 0)
const longe = (a: number, b: number, folga = 0.18) => Math.abs(a - b) / Math.abs(b) >= folga

function margensDistintas(rng: Rng, n: number): number[] {
  const todas = rng.shuffle([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60])
  return todas.slice(0, n)
}

function doisProdutos(rng: Rng): Problema | null {
  const w = rng.pick([20, 25, 30, 40])
  const [a, b] = margensDistintas(rng, 2) as [number, number]
  const correta = (w * a + (100 - w) * b) / 100
  if (Math.abs(correta * 10 - Math.round(correta * 10)) > 1e-9) return null // exata: no máximo 1 casa
  if (!longe(media([a, b]), correta)) return null
  const r = fmt(correta, 'percent')
  return {
    enunciado: {
      pt: `O produto A tem margem de ${a}% e é ${w}% das vendas; o B tem margem de ${b}% e é o resto. Qual a margem média?`,
      en: `Product A has a ${a}% margin and is ${w}% of sales; B has a ${b}% margin and is the rest. What is the average margin?`,
    },
    correta,
    candidatos: [
      { valor: media([a, b]), erro: MEDIA_SIMPLES },
      { valor: ((100 - w) * a + w * b) / 100, erro: { pt: 'Trocou os pesos.', en: 'Swapped the weights.' } },
      ...errosDeEscala(correta).slice(1, 2),
    ],
    unidade: 'percent',
    estimativa: false,
    // a média fica entre os valores que ela pondera
    restricoes: { faixa: [Math.min(a, b), Math.max(a, b)] },
    expression: `(${w}*${a}+${100 - w}*${b})/100`,
    atalho: {
      pt: `${w}% × ${a}% + ${100 - w}% × ${b}% = ${r.pt}.`,
      en: `${w}% × ${a}% + ${100 - w}% × ${b}% = ${r.en}.`,
    },
  }
}

function tresProdutos(rng: Rng): Problema | null {
  const p1 = rng.int(2, 10) * 5
  const p2 = rng.int(2, (90 - p1) / 5) * 5
  const pesos = [p1, p2, 100 - p1 - p2]
  if (pesos[2]! < 10) return null
  const ms = margensDistintas(rng, 3)
  const correta = ponderada(ms, pesos)
  if (Math.abs(correta * 10 - Math.round(correta * 10)) > 1e-9) return null // exata: no máximo 1 casa
  if (!longe(media(ms), correta)) return null
  // Pesos dos dois maiores trocados.
  const ordem = [0, 1, 2].sort((i, j) => pesos[j]! - pesos[i]!)
  const trocados = [...pesos]
  ;[trocados[ordem[0]!], trocados[ordem[1]!]] = [pesos[ordem[1]!]!, pesos[ordem[0]!]!]
  const r = fmt(correta, 'percent')
  const linhas = ms.map((m, i) => `${'ABC'[i]}: ${m}% (${pesos[i]}%)`)
  return {
    enunciado: {
      pt: `Margem (e peso nas vendas) de três produtos — ${linhas.join('; ')}. Qual a margem média?`,
      en: `Margin (and share of sales) for three products — ${linhas.join('; ')}. What is the average margin?`,
    },
    correta,
    candidatos: [
      { valor: media(ms), erro: MEDIA_SIMPLES },
      { valor: ponderada(ms, trocados), erro: { pt: 'Trocou os pesos dos dois maiores.', en: 'Swapped the weights of the two largest.' } },
      ...errosDeEscala(correta).slice(1, 2),
    ],
    unidade: 'percent',
    estimativa: false,
    // a média fica entre os valores que ela pondera
    restricoes: { faixa: [Math.min(...ms), Math.max(...ms)] },
    expression: `(${ms.map((m, i) => `${m}*${pesos[i]}`).join('+')})/100`,
    atalho: {
      pt: `Some margem × peso: ${ms.map((m, i) => `${m} × ${pesos[i]}%`).join(' + ')} = ${r.pt}.`,
      en: `Add margin × weight: ${ms.map((m, i) => `${m} × ${pesos[i]}%`).join(' + ')} = ${r.en}.`,
    },
  }
}

function pesosEmReceita(rng: Rng): Problema | null {
  const z = rng.int(6, 8)
  const receitas = [0, 1, 2].map(() => mantissa(rng, rng.pick([1, 2] as const)) * 10 ** z)
  const ms = margensDistintas(rng, 3)
  const correta = ponderada(ms, receitas)
  if (!longe(media(ms), correta, 0.2)) return null
  const maior = receitas.indexOf(Math.max(...receitas))
  const total = receitas.reduce((a, b) => a + b, 0)
  const tot = fmt(total, 'moeda')
  const r = fmtResposta(correta, 'percent', true)
  const linhas = receitas.map((v, i) => ({ pt: `${'ABC'[i]}: ${fmt(v, 'moeda').pt} a ${ms[i]}%`, en: `${'ABC'[i]}: ${fmt(v, 'moeda').en} at ${ms[i]}%` }))
  return {
    enunciado: {
      pt: `Receita e margem de três linhas — ${linhas.map((l) => l.pt).join('; ')}. Qual a margem média da empresa?`,
      en: `Revenue and margin of three lines — ${linhas.map((l) => l.en).join('; ')}. What is the company's average margin?`,
    },
    correta,
    candidatos: [
      { valor: media(ms), erro: MEDIA_SIMPLES },
      { valor: ms[maior]!, erro: { pt: 'Usou só a margem da linha maior.', en: 'Used only the largest line’s margin.' } },
      ...errosDeEscala(correta).slice(1, 2),
    ],
    unidade: 'percent',
    estimativa: true,
    // a média fica entre os valores que ela pondera
    restricoes: { faixa: [Math.min(...ms), Math.max(...ms)] },
    expression: `(${receitas.map((v, i) => `${v}*${ms[i]}`).join('+')})/(${receitas.join('+')})`,
    atalho: {
      pt: `Pese pela receita: total ${tot.pt}; some receita × margem e divida pelo total ≈ ${r.pt}.`,
      en: `Weight by revenue: total ${tot.en}; add revenue × margin and divide by the total ≈ ${r.en}.`,
    },
  }
}

function mudancaDeMix(rng: Rng): Problema | null {
  // Margens a 20+ pontos e mix que anda 30+ pontos: senão a margem nova fica
  // colada na antiga e o distrator principal some.
  const a = rng.int(1, 6) * 5
  const b = a + rng.int(4, 8) * 5
  const w1 = rng.int(2, 8) * 10
  const opcoesW2 = [20, 30, 40, 50, 60, 70, 80].filter((w) => Math.abs(w - w1) >= 30)
  const w2 = rng.pick(opcoesW2)
  const antiga = (w1 * a + (100 - w1) * b) / 100
  const correta = (w2 * a + (100 - w2) * b) / 100
  if (!longe(antiga, correta) || !longe(media([a, b]), correta)) return null
  const r = fmtResposta(correta, 'percent', true)
  return {
    enunciado: {
      pt: `A margem do produto A é ${a}% e a do B, ${b}%. O mix vai de ${w1}% A / ${100 - w1}% B para ${w2}% A / ${100 - w2}% B. Qual a nova margem média?`,
      en: `Product A has a ${a}% margin and B ${b}%. The mix moves from ${w1}% A / ${100 - w1}% B to ${w2}% A / ${100 - w2}% B. What is the new average margin?`,
    },
    correta,
    candidatos: [
      { valor: antiga, erro: { pt: 'Deu a margem do mix antigo.', en: 'Gave the old mix’s margin.' } },
      { valor: media([a, b]), erro: MEDIA_SIMPLES },
      ...errosDeEscala(correta).slice(1, 2),
    ],
    unidade: 'percent',
    estimativa: true,
    // a média fica entre os valores que ela pondera
    restricoes: { faixa: [a, b] },
    expression: `(${w2}*${a}+${100 - w2}*${b})/100`,
    atalho: {
      pt: `Só o mix novo importa: ${w2}% × ${a}% + ${100 - w2}% × ${b}% ≈ ${r.pt}.`,
      en: `Only the new mix matters: ${w2}% × ${a}% + ${100 - w2}% × ${b}% ≈ ${r.en}.`,
    },
  }
}

function crescimentoDeSegmentos(rng: Rng): Problema | null {
  const s1 = mantissa(rng, 1) * 10 ** rng.int(7, 8)
  const s2 = mantissa(rng, 1) * 10 ** rng.int(7, 8)
  const g1 = rng.int(2, 30)
  const g2 = rng.int(2, 25) * (rng.next() < 0.4 ? -1 : 1)
  const correta = (s1 * g1 + s2 * g2) / (s1 + s2)
  if (Math.abs(correta) < 2 || !longe(media([g1, g2]), correta, 0.2)) return null
  const a = fmt(s1, 'moeda')
  const b = fmt(s2, 'moeda')
  const r = fmtResposta(correta, 'percent', true)
  const g2Txt = g2 >= 0 ? { pt: `cresce ${g2}%`, en: `grows ${g2}%` } : { pt: `cai ${-g2}%`, en: `shrinks ${-g2}%` }
  return {
    enunciado: {
      pt: `O segmento A fatura ${a.pt} e cresce ${g1}%; o B fatura ${b.pt} e ${g2Txt.pt}. Quanto cresce a empresa?`,
      en: `Segment A brings in ${a.en} and grows ${g1}%; B brings in ${b.en} and ${g2Txt.en}. How much does the company grow?`,
    },
    correta,
    candidatos: [
      { valor: media([g1, g2]), erro: MEDIA_SIMPLES },
      { valor: g1 + g2, erro: { pt: 'Somou as taxas dos segmentos.', en: 'Added the segment rates.' } },
      { valor: -correta, fator: -1, erro: { pt: 'Trocou o sinal da variação.', en: 'Flipped the sign of the change.' } },
      ...errosDeEscala(correta).slice(1, 2),
    ],
    unidade: 'percent',
    estimativa: true,
    // a média fica entre os valores que ela pondera
    restricoes: { faixa: [Math.min(g1, g2), Math.max(g1, g2)] },
    expression: `(${s1}*${g1}+${s2}*(${g2}))/(${s1}+${s2})`,
    atalho: {
      pt: `Pese pelo tamanho: (${a.pt} × ${g1}% + ${b.pt} × ${g2}%) ÷ (${a.pt} + ${b.pt}) ≈ ${r.pt}.`,
      en: `Weight by size: (${a.en} × ${g1}% + ${b.en} × ${g2}%) ÷ (${a.en} + ${b.en}) ≈ ${r.en}.`,
    },
  }
}

function construir(rng: Rng, nivel: Nivel): Problema | null {
  switch (nivel) {
    case 1:
      return doisProdutos(rng)
    case 2:
      return tresProdutos(rng)
    case 3:
      return pesosEmReceita(rng)
    case 4:
      return mudancaDeMix(rng)
    case 5:
      return crescimentoDeSegmentos(rng)
  }
}

export const gerarMediaPonderada: QmGerador = (seed, nivel) => gerar('media_ponderada', construir, seed, nivel)
