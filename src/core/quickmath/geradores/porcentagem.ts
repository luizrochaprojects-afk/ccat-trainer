import type { Rng } from '../../rng'
import { arredondarSig, type Unidade } from '../formato'
import type { QmGerador } from '../questao'
import type { Nivel } from '../taxonomia'
import { errosDeEscala, fmt, fmtResposta, gerar, mantissa, type Problema } from './comum'

/**
 * Porcentagem, do jeito que aparece em case.
 *
 *  - 1: p% de N, p ∈ {5, 10, 20, 25, 50}; exata
 *  - 2: p% de N, p ∈ {8, 12, 15, 35, 45}; exata
 *  - 3: variação % de A para B, subida e queda; estimativa
 *  - 4: p% de q% de N; estimativa
 *  - 5: sobe p% e depois cai q%, ou a taxa que vai de r1% para r2%; estimativa
 *
 * Os distratores são os erros de porcentagem que custam caro numa entrevista:
 * base errada na variação, percentuais somados em vez de multiplicados e ponto
 * percentual tratado como porcentagem.
 */


function percentualDe(rng: Rng, nivel: 1 | 2): Problema {
  const p = rng.pick(nivel === 1 ? [5, 10, 20, 25, 50] : [8, 12, 15, 35, 45])
  const N = mantissa(rng, 1) * 10 ** rng.int(2, 7)
  const correta = (p * N) / 100
  const unidade: Unidade = rng.next() < 0.5 ? 'moeda' : 'numero'
  const n = fmt(N, unidade)
  const r = fmt(correta, unidade)
  const decimal = p / 100
  return {
    enunciado: { pt: `Quanto é ${p}% de ${n.pt}?`, en: `What is ${p}% of ${n.en}?` },
    correta,
    candidatos: [
      ...errosDeEscala(correta).slice(0, 2),
      { valor: N / p, erro: { pt: 'Dividiu pelo percentual em vez de multiplicar.', en: 'Divided by the percentage instead of multiplying.' } },
      ...errosDeEscala(correta).slice(2),
    ],
    unidade,
    estimativa: false,
    expression: `${N}*${p}/100`,
    atalho: {
      pt: `${p}% = ${String(decimal).replace('.', ',')}; ${n.pt} × ${String(decimal).replace('.', ',')} = ${r.pt}.`,
      en: `${p}% = ${decimal}; ${n.en} × ${decimal} = ${r.en}.`,
    },
  }
}

function variacao(rng: Rng): Problema | null {
  const A = mantissa(rng, 2) * 10 ** rng.int(4, 8)
  const g = rng.int(5, 60) * (rng.next() < 0.5 ? -1 : 1)
  const B = arredondarSig(A * (1 + g / 100), 2)
  if (B === A) return null
  const correta = ((B - A) / A) * 100
  if (Math.abs(correta) < 2) return null
  const a = fmt(A, 'moeda')
  const b = fmt(B, 'moeda')
  const r = fmtResposta(correta, 'percent', true)
  return {
    enunciado: {
      pt: `A receita foi de ${a.pt} para ${b.pt}. Qual foi a variação percentual?`,
      en: `Revenue went from ${a.en} to ${b.en}. What was the percentage change?`,
    },
    correta,
    candidatos: [
      { valor: ((B - A) / B) * 100, erro: { pt: 'Usou o valor final como base.', en: 'Used the final value as the base.' } },
      { valor: -correta, erro: { pt: 'Trocou o sinal da variação.', en: 'Flipped the sign of the change.' } },
      { valor: (B / A) * 100, erro: { pt: 'Calculou a razão B/A, não a variação.', en: 'Computed the ratio B/A, not the change.' } },
      ...errosDeEscala(correta).slice(0, 2),
    ],
    unidade: 'percent',
    estimativa: true,
    expression: `(${B}-${A})/${A}*100`,
    atalho: {
      pt: `Variação = (final − inicial) ÷ inicial: (${b.pt} − ${a.pt}) ÷ ${a.pt} ≈ ${r.pt}.`,
      en: `Change = (final − initial) ÷ initial: (${b.en} − ${a.en}) ÷ ${a.en} ≈ ${r.en}.`,
    },
  }
}

function percentualDePercentual(rng: Rng): Problema {
  const p = rng.pick([12, 15, 20, 25, 30, 35, 40, 45, 60, 75])
  const q = rng.pick([12, 15, 20, 25, 30, 35, 40, 45, 60, 75])
  const N = mantissa(rng, 2) * 10 ** rng.int(5, 8)
  const correta = (N * p * q) / 10_000
  const n = fmt(N, 'moeda')
  const r = fmtResposta(correta, 'moeda', true)
  const esquecida = { pt: 'Esqueceu uma das porcentagens.', en: 'Dropped one of the percentages.' }
  return {
    enunciado: {
      pt: `Quanto é ${p}% de ${q}% de ${n.pt}?`,
      en: `What is ${p}% of ${q}% of ${n.en}?`,
    },
    correta,
    candidatos: [
      { valor: (N * (p + q)) / 100, erro: { pt: 'Somou os percentuais em vez de multiplicar.', en: 'Added the percentages instead of multiplying.' } },
      { valor: (N * p) / 100, erro: esquecida },
      { valor: (N * q) / 100, erro: esquecida },
      ...errosDeEscala(correta).slice(0, 2),
    ],
    unidade: 'moeda',
    estimativa: true,
    expression: `${N}*${p}/100*${q}/100`,
    atalho: {
      pt: `${p}% × ${q}% = ${String(Number(((p * q) / 100).toPrecision(4))).replace('.', ',')}%; aplicado a ${n.pt} ≈ ${r.pt}.`,
      en: `${p}% × ${q}% = ${Number(((p * q) / 100).toPrecision(4))}%; applied to ${n.en} ≈ ${r.en}.`,
    },
  }
}

function sobeECai(rng: Rng): Problema | null {
  const p = rng.int(2, 12) * 5
  const q = rng.int(2, 12) * 5
  const correta = ((1 + p / 100) * (1 - q / 100) - 1) * 100
  if (Math.abs(correta) < 2) return null
  const r = fmtResposta(correta, 'percent', true)
  return {
    enunciado: {
      pt: `Um preço sobe ${p}% e depois cai ${q}%. Qual a variação total?`,
      en: `A price rises ${p}% and then falls ${q}%. What is the total change?`,
    },
    correta,
    candidatos: [
      { valor: p - q, erro: { pt: 'Somou as variações; elas se multiplicam.', en: 'Added the changes; they compound.' } },
      { valor: -correta, erro: { pt: 'Trocou o sinal da variação.', en: 'Flipped the sign of the change.' } },
      ...errosDeEscala(correta).slice(0, 2),
    ],
    unidade: 'percent',
    estimativa: true,
    expression: `((1+${p}/100)*(1-${q}/100)-1)*100`,
    atalho: {
      pt: `Multiplique os fatores: ${String(1 + p / 100).replace('.', ',')} × ${String(1 - q / 100).replace('.', ',')} − 1 ≈ ${r.pt}.`,
      en: `Multiply the factors: ${1 + p / 100} × ${1 - q / 100} − 1 ≈ ${r.en}.`,
    },
  }
}

function pontoPercentual(rng: Rng): Problema | null {
  const r1 = rng.int(2, 20)
  const r2 = r1 + rng.int(1, 8) * (rng.next() < 0.3 ? -1 : 1)
  if (r2 <= 0 || r2 === r1) return null
  const correta = ((r2 - r1) / r1) * 100
  const r = fmtResposta(correta, 'percent', true)
  return {
    enunciado: {
      pt: `A taxa de conversão vai de ${r1}% para ${r2}%. Qual a variação percentual da taxa?`,
      en: `The conversion rate goes from ${r1}% to ${r2}%. What is the percentage change in the rate?`,
    },
    correta,
    candidatos: [
      { valor: r2 - r1, erro: { pt: 'Deu a diferença em pontos percentuais, não em %.', en: 'Gave the difference in percentage points, not percent.' } },
      { valor: ((r2 - r1) / r2) * 100, erro: { pt: 'Usou a taxa final como base.', en: 'Used the final rate as the base.' } },
      { valor: -correta, erro: { pt: 'Trocou o sinal da variação.', en: 'Flipped the sign of the change.' } },
      ...errosDeEscala(correta).slice(0, 2),
    ],
    unidade: 'percent',
    estimativa: true,
    expression: `(${r2}-${r1})/${r1}*100`,
    atalho: {
      pt: `São ${r2 - r1} pontos percentuais sobre uma base de ${r1}%: ${r2 - r1} ÷ ${r1} ≈ ${r.pt}.`,
      en: `That is ${r2 - r1} percentage points on a base of ${r1}%: ${r2 - r1} ÷ ${r1} ≈ ${r.en}.`,
    },
  }
}

function construir(rng: Rng, nivel: Nivel): Problema | null {
  switch (nivel) {
    case 1:
    case 2:
      return percentualDe(rng, nivel)
    case 3:
      return variacao(rng)
    case 4:
      return percentualDePercentual(rng)
    case 5:
      return rng.next() < 0.5 ? sobeECai(rng) : pontoPercentual(rng)
  }
}

export const gerarPorcentagem: QmGerador = (seed, nivel) => gerar('porcentagem', construir, seed, nivel)
