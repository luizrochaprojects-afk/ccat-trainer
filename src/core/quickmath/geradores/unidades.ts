import type { Rng } from '../../rng'
import type { QmGerador } from '../questao'
import type { Nivel } from '../taxonomia'
import { errosDeEscala, fmt, fmtResposta, gerar, mantissa, type Problema } from './comum'

/**
 * Unidades e escala: mês ↔ ano, dia ↔ ano, por cliente ↔ total.
 *
 * Em case a conta quase nunca erra no produto; erra no fator de conversão — o
 * × 10 no lugar do × 12, o mês tomado pelo ano, os clientes esquecidos.
 *
 *  - 1: por mês → por ano; exata
 *  - 2: por dia → por ano (× 365) ou por semana → por ano (× 52); exata
 *  - 3: por cliente por mês × clientes → por ano; estimativa
 *  - 4: por ano → por dia; estimativa
 *  - 5: receita anual ÷ clientes → ticket mensal; estimativa
 */

// Mantissas cujo × 12 cabe em 3 algarismos: a resposta exata é a que aparece.
const MENSAIS = [2, 3, 4, 5, 6, 7, 8, 9, 15, 25, 35, 45]

function mesParaAno(rng: Rng): Problema {
  const X = rng.pick(MENSAIS) * 10 ** rng.int(3, 6)
  const correta = X * 12
  const x = fmt(X, 'moeda')
  const r = fmt(correta, 'moeda')
  return {
    enunciado: {
      pt: `Um cliente paga ${x.pt} por mês. Quanto isso dá por ano?`,
      en: `A customer pays ${x.en} a month. How much is that per year?`,
    },
    correta,
    candidatos: [
      { valor: X * 10, erro: { pt: 'Multiplicou por 10 em vez de 12.', en: 'Multiplied by 10 instead of 12.' } },
      { valor: X * 30, erro: { pt: 'Multiplicou por 30, como se fossem dias.', en: 'Multiplied by 30, as if they were days.' } },
      ...errosDeEscala(correta).slice(0, 2),
    ],
    unidade: 'moeda',
    estimativa: false,
    expression: `${X}*12`,
    atalho: { pt: `${x.pt} × 12 = ${r.pt}.`, en: `${x.en} × 12 = ${r.en}.` },
  }
}

function diaOuSemanaParaAno(rng: Rng): Problema {
  const porDia = rng.next() < 0.5
  // Pares para o × 365 caber em 3 algarismos; o × 52 cabe com qualquer dígito.
  const X = (porDia ? rng.pick([2, 4, 6, 8]) : mantissa(rng, 1)) * 10 ** rng.int(2, 5)
  const fator = porDia ? 365 : 52
  const correta = X * fator
  const x = fmt(X, 'moeda')
  const r = fmt(correta, 'moeda')
  const periodo = porDia ? { pt: 'por dia', en: 'a day' } : { pt: 'por semana', en: 'a week' }
  return {
    enunciado: {
      pt: `Uma loja fatura ${x.pt} ${periodo.pt}. Quanto fatura por ano?`,
      en: `A store takes in ${x.en} ${periodo.en}. How much per year?`,
    },
    correta,
    candidatos: porDia
      ? [
          { valor: X * 30, erro: { pt: 'Deu o valor do mês (× 30), não do ano.', en: 'Gave the monthly figure (× 30), not the annual one.' } },
          { valor: X * 12, erro: { pt: 'Multiplicou por 12, como se fosse mensal.', en: 'Multiplied by 12, as if it were monthly.' } },
          ...errosDeEscala(correta).slice(0, 2),
        ]
      : [
          { valor: X * 12, erro: { pt: 'Tratou a semana como mês (× 12).', en: 'Treated the week as a month (× 12).' } },
          { valor: X * 4, erro: { pt: 'Deu o valor do mês (× 4), não do ano.', en: 'Gave the monthly figure (× 4), not the annual one.' } },
          ...errosDeEscala(correta).slice(0, 2),
        ],
    unidade: 'moeda',
    estimativa: false,
    expression: `${X}*${fator}`,
    atalho: { pt: `${x.pt} × ${fator} = ${r.pt}.`, en: `${x.en} × ${fator} = ${r.en}.` },
  }
}

function porClienteParaTotal(rng: Rng): Problema {
  const t = mantissa(rng, 2)
  const C = mantissa(rng, 2) * 10 ** rng.int(4, 6)
  const correta = t * C * 12
  const tk = fmt(t, 'moeda')
  const c = fmt(C, 'numero')
  const mensal = fmtResposta(t * C, 'moeda', true)
  const r = fmtResposta(correta, 'moeda', true)
  return {
    enunciado: {
      pt: `${c.pt} clientes pagam ${tk.pt} por mês cada. Qual a receita anual?`,
      en: `${c.en} customers pay ${tk.en} a month each. What is the annual revenue?`,
    },
    correta,
    candidatos: [
      { valor: t * C, erro: { pt: 'Esqueceu o × 12: deu a receita do mês.', en: 'Forgot the × 12: gave the monthly revenue.' } },
      { valor: t * C * 10, erro: { pt: 'Multiplicou por 10 em vez de 12.', en: 'Multiplied by 10 instead of 12.' } },
      { valor: t * 12, erro: { pt: 'Esqueceu os clientes.', en: 'Forgot the customers.' } },
      ...errosDeEscala(correta),
    ],
    unidade: 'moeda',
    estimativa: true,
    expression: `${t}*${C}*12`,
    atalho: {
      pt: `Por mês: ${tk.pt} × ${c.pt} ≈ ${mensal.pt}; × 12 ≈ ${r.pt}.`,
      en: `Per month: ${tk.en} × ${c.en} ≈ ${mensal.en}; × 12 ≈ ${r.en}.`,
    },
  }
}

function anoParaDia(rng: Rng): Problema {
  const X = mantissa(rng, 2) * 10 ** rng.int(8, 10)
  const correta = X / 365
  const x = fmt(X, 'moeda')
  const mes = fmtResposta(X / 12, 'moeda', true)
  const r = fmtResposta(correta, 'moeda', true)
  return {
    enunciado: {
      pt: `Uma rede fatura ${x.pt} por ano. Quanto fatura por dia?`,
      en: `A chain takes in ${x.en} a year. How much per day?`,
    },
    correta,
    candidatos: [
      { valor: X / 30, erro: { pt: 'Dividiu por 30: tratou o ano como mês.', en: 'Divided by 30: treated the year as a month.' } },
      { valor: X / 12, erro: { pt: 'Deu o valor do mês, não do dia.', en: 'Gave the monthly figure, not the daily one.' } },
      ...errosDeEscala(correta).slice(0, 2),
    ],
    unidade: 'moeda',
    estimativa: true,
    expression: `${X}/365`,
    atalho: {
      pt: `÷ 365 ≈ ÷ 12 ÷ 30: ${x.pt} ÷ 12 ≈ ${mes.pt}; ÷ 30 ≈ ${r.pt}.`,
      en: `÷ 365 ≈ ÷ 12 ÷ 30: ${x.en} ÷ 12 ≈ ${mes.en}; ÷ 30 ≈ ${r.en}.`,
    },
  }
}

function ticketMensal(rng: Rng): Problema | null {
  const R = mantissa(rng, 2) * 10 ** rng.int(8, 10)
  const C = mantissa(rng, 2) * 10 ** rng.int(5, 7)
  const correta = R / C / 12
  if (correta < 1) return null
  const rec = fmt(R, 'moeda')
  const c = fmt(C, 'numero')
  const anual = fmtResposta(R / C, 'moeda', true)
  const r = fmtResposta(correta, 'moeda', true)
  return {
    enunciado: {
      pt: `Uma operadora tem receita anual de ${rec.pt} e ${c.pt} clientes. Qual o ticket médio mensal?`,
      en: `A carrier has annual revenue of ${rec.en} and ${c.en} customers. What is the average monthly ticket?`,
    },
    correta,
    candidatos: [
      { valor: R / C, erro: { pt: 'Esqueceu o ÷ 12: deu o ticket anual.', en: 'Forgot the ÷ 12: gave the annual ticket.' } },
      { valor: R / C / 10, erro: { pt: 'Dividiu por 10 em vez de 12.', en: 'Divided by 10 instead of 12.' } },
      ...errosDeEscala(correta),
    ],
    unidade: 'moeda',
    estimativa: true,
    expression: `${R}/${C}/12`,
    atalho: {
      pt: `Por cliente por ano: ${rec.pt} ÷ ${c.pt} ≈ ${anual.pt}; ÷ 12 ≈ ${r.pt}.`,
      en: `Per customer per year: ${rec.en} ÷ ${c.en} ≈ ${anual.en}; ÷ 12 ≈ ${r.en}.`,
    },
  }
}

function construir(rng: Rng, nivel: Nivel): Problema | null {
  switch (nivel) {
    case 1:
      return mesParaAno(rng)
    case 2:
      return diaOuSemanaParaAno(rng)
    case 3:
      return porClienteParaTotal(rng)
    case 4:
      return anoParaDia(rng)
    case 5:
      return ticketMensal(rng)
  }
}

export const gerarUnidades: QmGerador = (seed, nivel) => gerar('unidades', construir, seed, nivel)
