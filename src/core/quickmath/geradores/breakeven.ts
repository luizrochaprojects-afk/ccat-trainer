import type { Rng } from '../../rng'
import { ordemDeGrandeza } from '../formato'
import type { QmGerador } from '../questao'
import type { Nivel } from '../taxonomia'
import { errosDeEscala, fmt, fmtResposta, gerar, mantissa, type Problema } from './comum'

/**
 * Break-even e payback.
 *
 * A conta é uma divisão; o erro está no que vai no denominador — o preço no
 * lugar da margem, a margem % multiplicando em vez de dividir, o ganho mensal
 * sem anualizar.
 *
 *  - 1: break-even em unidades: fixo ÷ (preço − custo variável); exata
 *  - 2: payback: investimento ÷ ganho anual; exata
 *  - 3: break-even em receita: fixo ÷ margem de contribuição %; estimativa
 *  - 4: payback com ganho mensal; estimativa
 *  - 5: quantos clientes a R$ t/mês cobrem o fixo anual com margem m%; estimativa
 */

function emUnidades(rng: Rng): Problema | null {
  const F = mantissa(rng, 1) * 10 ** rng.int(5, 7)
  const margem = rng.pick([2, 4, 5, 8, 10, 20, 25, 40, 50])
  const custo = margem * rng.int(1, 3)
  const preco = custo + margem
  const correta = F / margem
  // "Usou o preço" é o erro que esta questão existe para pegar: ele precisa
  // cair na mesma ordem de grandeza da resposta, senão se elimina contando zeros.
  if (ordemDeGrandeza(F / preco) !== ordemDeGrandeza(correta)) return null
  const f = fmt(F, 'moeda')
  const p = fmt(preco, 'moeda')
  const cv = fmt(custo, 'moeda')
  const m = fmt(margem, 'moeda')
  const r = fmt(correta, 'numero')
  return {
    enunciado: {
      pt: `Custo fixo de ${f.pt} por ano. Cada unidade é vendida a ${p.pt} e custa ${cv.pt} para produzir. Quantas unidades por ano para empatar?`,
      en: `Fixed cost is ${f.en} a year. Each unit sells for ${p.en} and costs ${cv.en} to make. How many units a year to break even?`,
    },
    correta,
    candidatos: [
      { valor: F / preco, erro: { pt: 'Usou o preço, não a margem por unidade.', en: 'Used the price, not the margin per unit.' } },
      { valor: F / custo, erro: { pt: 'Usou o custo variável, não a margem.', en: 'Used the variable cost, not the margin.' } },
      ...errosDeEscala(correta).slice(0, 2),
    ],
    unidade: 'numero',
    estimativa: false,
    expression: `${F}/(${preco}-${custo})`,
    atalho: {
      pt: `Margem por unidade: ${p.pt} − ${cv.pt} = ${m.pt}; ${f.pt} ÷ ${m.pt} = ${r.pt} unidades.`,
      en: `Margin per unit: ${p.en} − ${cv.en} = ${m.en}; ${f.en} ÷ ${m.en} = ${r.en} units.`,
    },
  }
}

function payback(rng: Rng): Problema {
  // não só inteiros: com a resposta sempre inteira, ela sairia por ser a única redonda
  const anos = rng.pick([2, 2.5, 4, 5, 8, 10])
  const I = mantissa(rng, 1) * 10 ** rng.int(6, 8)
  const G = I / anos
  const i = fmt(I, 'moeda')
  const g = fmt(G, 'moeda')
  return {
    enunciado: {
      pt: `Um investimento de ${i.pt} gera ${g.pt} por ano. Em quantos anos ele se paga?`,
      en: `An investment of ${i.en} returns ${g.en} a year. In how many years does it pay back?`,
    },
    correta: anos,
    candidatos: [
      { valor: anos * 12, erro: { pt: 'Deu a resposta em meses.', en: 'Gave the answer in months.' } },
      { valor: G / I, erro: { pt: 'Inverteu a conta: ganho ÷ investimento.', en: 'Flipped it: return ÷ investment.' } },
      ...errosDeEscala(anos).slice(0, 2),
    ],
    unidade: 'numero',
    estimativa: false,
    expression: `${I}/${G}`,
    atalho: { pt: `${i.pt} ÷ ${g.pt} = ${anos} anos.`, en: `${i.en} ÷ ${g.en} = ${anos} years.` },
  }
}

function emReceita(rng: Rng): Problema {
  const F = mantissa(rng, 2) * 10 ** rng.int(5, 7)
  const m = rng.pick([15, 20, 25, 30, 35, 40, 45, 60])
  const correta = F / (m / 100)
  const f = fmt(F, 'moeda')
  const r = fmtResposta(correta, 'moeda', true)
  return {
    enunciado: {
      pt: `Custo fixo de ${f.pt} por ano e margem de contribuição de ${m}%. Qual a receita de break-even?`,
      en: `Fixed cost is ${f.en} a year and the contribution margin is ${m}%. What is the break-even revenue?`,
    },
    correta,
    candidatos: [
      { valor: F * (m / 100), erro: { pt: 'Multiplicou pela margem em vez de dividir.', en: 'Multiplied by the margin instead of dividing.' } },
      { valor: F / (1 - m / 100), erro: { pt: 'Usou o custo variável % no lugar da margem.', en: 'Used the variable cost % instead of the margin.' } },
      ...errosDeEscala(correta).slice(0, 2),
    ],
    unidade: 'moeda',
    estimativa: true,
    expression: `${F}/(${m}/100)`,
    atalho: {
      pt: `Cada R$ 1 de receita cobre ${m} centavos do fixo: ${f.pt} ÷ ${String(m / 100).replace('.', ',')} ≈ ${r.pt}.`,
      en: `Each $1 of revenue covers ${m} cents of fixed cost: ${f.en} ÷ ${m / 100} ≈ ${r.en}.`,
    },
  }
}

function paybackMensal(rng: Rng): Problema | null {
  const I = mantissa(rng, 2) * 10 ** rng.int(6, 8)
  const g = mantissa(rng, 2) * 10 ** rng.int(4, 6)
  const correta = I / (g * 12)
  if (correta < 0.5 || correta > 30) return null
  const i = fmt(I, 'moeda')
  const gm = fmt(g, 'moeda')
  const anual = fmtResposta(g * 12, 'moeda', true)
  const r = fmtResposta(correta, 'numero', true)
  return {
    enunciado: {
      pt: `Um projeto custa ${i.pt} e economiza ${gm.pt} por mês. Em quantos anos se paga?`,
      en: `A project costs ${i.en} and saves ${gm.en} a month. In how many years does it pay back?`,
    },
    correta,
    candidatos: [
      { valor: I / g, erro: { pt: 'Esqueceu de anualizar: deu em meses.', en: 'Forgot to annualise: gave months.' } },
      { valor: I / (g * 10), erro: { pt: 'Anualizou com × 10 em vez de × 12.', en: 'Annualised with × 10 instead of × 12.' } },
      ...errosDeEscala(correta).slice(0, 2),
    ],
    unidade: 'numero',
    estimativa: true,
    expression: `${I}/(${g}*12)`,
    atalho: {
      pt: `Por ano: ${gm.pt} × 12 ≈ ${anual.pt}; ${i.pt} ÷ ${anual.pt} ≈ ${r.pt} anos.`,
      en: `Per year: ${gm.en} × 12 ≈ ${anual.en}; ${i.en} ÷ ${anual.en} ≈ ${r.en} years.`,
    },
  }
}

function clientesParaCobrir(rng: Rng): Problema | null {
  const F = mantissa(rng, 2) * 10 ** rng.int(6, 8)
  const t = mantissa(rng, 2)
  const m = rng.pick([20, 25, 30, 40, 50, 60])
  const porCliente = t * 12 * (m / 100)
  const correta = F / porCliente
  if (correta < 10) return null
  const f = fmt(F, 'moeda')
  const tk = fmt(t, 'moeda')
  const pc = fmtResposta(porCliente, 'moeda', true)
  const r = fmtResposta(correta, 'numero', true)
  return {
    enunciado: {
      pt: `Um app tem custo fixo de ${f.pt} por ano. Cada assinante paga ${tk.pt} por mês, com margem de ${m}%. Quantos assinantes para cobrir o fixo?`,
      en: `An app has fixed costs of ${f.en} a year. Each subscriber pays ${tk.en} a month at a ${m}% margin. How many subscribers to cover fixed costs?`,
    },
    correta,
    candidatos: [
      { valor: F / (t * (m / 100)), erro: { pt: 'Esqueceu o × 12: usou a margem do mês.', en: 'Forgot the × 12: used the monthly margin.' } },
      { valor: F / (t * 12), erro: { pt: 'Esqueceu a margem: usou a receita inteira.', en: 'Forgot the margin: used the whole revenue.' } },
      ...errosDeEscala(correta).slice(0, 2),
    ],
    unidade: 'numero',
    estimativa: true,
    expression: `${F}/(${t}*12*${m}/100)`,
    atalho: {
      pt: `Margem por assinante por ano: ${tk.pt} × 12 × ${m}% ≈ ${pc.pt}; ${f.pt} ÷ ${pc.pt} ≈ ${r.pt}.`,
      en: `Margin per subscriber per year: ${tk.en} × 12 × ${m}% ≈ ${pc.en}; ${f.en} ÷ ${pc.en} ≈ ${r.en}.`,
    },
  }
}

function construir(rng: Rng, nivel: Nivel): Problema | null {
  switch (nivel) {
    case 1:
      return emUnidades(rng)
    case 2:
      return payback(rng)
    case 3:
      return emReceita(rng)
    case 4:
      return paybackMensal(rng)
    case 5:
      return clientesParaCobrir(rng)
  }
}

export const gerarBreakeven: QmGerador = (seed, nivel) => gerar('breakeven', construir, seed, nivel)
