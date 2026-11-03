import type { LocalizedText } from '../../i18n'
import type { Rng } from '../../rng'
import type { Candidato } from '../alternativas'
import type { Unidade } from '../formato'
import type { QmGerador } from '../questao'
import type { Nivel } from '../taxonomia'
import { errosDeEscala, fmt, fmtResposta, gerar, mantissa, type Problema } from './comum'
import { MESES, mesesRodando } from './fracoes'

/**
 * Cadeia de 3–4 fatores: a ponte entre executar e formular.
 *
 * A estrutura já vem dada no enunciado; o que se treina é segurar as camadas e
 * multiplicar sem perder nenhuma. Os distratores principais são exatamente a
 * camada esquecida — o erro de quem formula com pressa.
 *
 * Dois cenários:
 *  - impacto no ano 1 (o case do modelo de crédito): impacto anual × fração do
 *    ano × adoção × parcela da carteira;
 *  - market sizing: população × penetração × frequência × ticket.
 *
 *  - 1: 2 camadas, números redondos; exata
 *  - 2: 3 camadas, redondos; exata
 *  - 3: 4 camadas, redondos; estimativa
 *  - 4: 4 camadas, mantissas de 2–3 dígitos; estimativa
 *  - 5: 4 camadas + conversão mensal → anual; estimativa
 */

interface Camada {
  /** multiplicador (a primeira camada é o valor-base) */
  valor: number
  /** como a camada aparece na conta: "9/12", "40%", "R$ 800 mi" */
  texto: LocalizedText
  /** para o erro da camada esquecida: "a adoção de 40%" */
  nome: LocalizedText
  /** pedaço da expressão: "9/12", "40/100" */
  expr: string
  /**
   * O que o produto parcial é depois desta camada. No market sizing, população
   * × penetração são pessoas, × frequência são compras; só o ticket vira
   * dinheiro.
   */
  unidade: Unidade
}

const pct = (p: number, nome: LocalizedText, unidade: Unidade): Camada => ({
  valor: p / 100,
  texto: { pt: `${p}%`, en: `${p}%` },
  nome,
  expr: `${p}/100`,
  unidade,
})

const conversaoAnual = (unidade: Unidade): Camada => ({
  valor: 12,
  texto: { pt: '12', en: '12' },
  nome: { pt: 'a conversão de mês para ano (× 12)', en: 'the monthly-to-annual conversion (× 12)' },
  expr: '12',
  unidade,
})

const REDONDOS = [20, 25, 40, 50, 60, 75, 80]
const QUEBRADOS = [15, 35, 45, 55, 65, 70, 85]

interface Cenario {
  camadas: Camada[]
  enunciado: LocalizedText
  /** erros além das camadas esquecidas */
  extras: Candidato[]
}

function impactoAno1(rng: Rng, nivel: Nivel): Cenario {
  const redondo = nivel <= 3
  const mensal = nivel === 5
  const base = (redondo ? mantissa(rng, 1) : mantissa(rng, rng.pick([2, 3] as const))) * 10 ** rng.int(6, 8)
  // Nos níveis exatos o mês cai num trimestre, para a fração do ano fechar.
  const m = nivel <= 2 ? rng.pick([4, 7, 10]) : rng.int(2, 12)
  const k = mesesRodando(m)
  const mes = MESES[m - 1]!
  const adocao = rng.pick(redondo ? REDONDOS : QUEBRADOS)
  const carteira = rng.pick(redondo ? REDONDOS : QUEBRADOS)

  const valorBase = fmt(base, 'moeda')
  const camadas: Camada[] = [
    {
      valor: base,
      texto: valorBase,
      nome: { pt: 'o valor-base', en: 'the base value' },
      expr: String(base),
      unidade: 'moeda',
    },
  ]
  if (mensal) camadas.push(conversaoAnual('moeda'))
  camadas.push({
    valor: k / 12,
    texto: { pt: `${k}/12`, en: `${k}/12` },
    nome: { pt: `a fração do ano (${k}/12)`, en: `the fraction of the year (${k}/12)` },
    expr: `${k}/12`,
    unidade: 'moeda',
  })
  if (nivel >= 2) camadas.push(pct(adocao, { pt: `a adoção de ${adocao}%`, en: `the ${adocao}% adoption` }, 'moeda'))
  if (nivel >= 3) camadas.push(pct(carteira, { pt: `a parcela de ${carteira}% da carteira`, en: `the ${carteira}% share of the portfolio` }, 'moeda'))

  const periodo = mensal ? { pt: 'por mês', en: 'per month' } : { pt: 'por ano', en: 'per year' }
  const frases: LocalizedText[] = [
    {
      pt: `Um modelo de crédito reduz perdas em ${valorBase.pt} ${periodo.pt} quando roda em toda a carteira. Ele entra no ar em 1º de ${mes.pt}.`,
      en: `A credit model cuts losses by ${valorBase.en} ${periodo.en} when it runs across the whole portfolio. It goes live on ${mes.en} 1.`,
    },
  ]
  if (nivel >= 2) frases.push({ pt: `No primeiro ano, a adoção média é de ${adocao}%.`, en: `In year one, average adoption is ${adocao}%.` })
  if (nivel >= 3) frases.push({ pt: `Ele só se aplica a ${carteira}% da carteira.`, en: `It only applies to ${carteira}% of the portfolio.` })
  frases.push({ pt: 'Quanto ele economiza no primeiro ano (até dezembro)?', en: 'How much does it save in year one (through December)?' })

  const semFracao = camadas.filter((c) => !c.expr.endsWith('/12')).reduce((a, c) => a * c.valor, 1)
  return {
    camadas,
    enunciado: { pt: frases.map((f) => f.pt).join(' '), en: frases.map((f) => f.en).join(' ') },
    extras: [
      { valor: (semFracao * (k - 1)) / 12, erro: { pt: 'Contou um mês a menos.', en: 'Counted one month too few.' } },
      { valor: (semFracao * (k + 1)) / 12, erro: { pt: 'Contou um mês a mais.', en: 'Counted one month too many.' } },
    ].filter((c) => c.valor > 0),
  }
}

function marketSizing(rng: Rng, nivel: Nivel): Cenario {
  const redondo = nivel <= 3
  const mensal = nivel === 5
  const populacao = (redondo ? mantissa(rng, 1) : mantissa(rng, 2)) * 10 ** rng.int(6, 7)
  const penetracao = rng.pick(redondo ? [5, 10, 20, 25, 40, 50] : [6, 8, 12, 15, 35, 45])
  const frequencia = rng.pick(redondo ? [2, 4, 10, 12] : [3, 6, 8, 24])
  const ticket = redondo ? mantissa(rng, 1) * 10 : mantissa(rng, 2)

  const pop = fmt(populacao, 'numero')
  const tk = fmt(ticket, 'moeda')
  const camadas: Camada[] = [
    { valor: populacao, texto: pop, nome: { pt: 'a população', en: 'the population' }, expr: String(populacao), unidade: 'numero' },
  ]
  if (nivel >= 2) camadas.push(pct(penetracao, { pt: `a penetração de ${penetracao}%`, en: `the ${penetracao}% penetration` }, 'numero'))
  if (nivel >= 3) {
    const periodo = mensal ? { pt: 'por mês', en: 'a month' } : { pt: 'por ano', en: 'a year' }
    camadas.push({
      valor: frequencia,
      texto: { pt: `${frequencia}`, en: `${frequencia}` },
      nome: { pt: `a frequência (${frequencia}× ${periodo.pt})`, en: `the frequency (${frequencia}× ${periodo.en})` },
      expr: String(frequencia),
      unidade: 'numero',
    })
  }
  if (mensal) camadas.push(conversaoAnual('numero'))
  camadas.push({ valor: ticket, texto: tk, nome: { pt: `o ticket de ${tk.pt}`, en: `the ${tk.en} ticket` }, expr: String(ticket), unidade: 'moeda' })

  const frases: LocalizedText[] = [
    nivel >= 2
      ? { pt: `Uma cidade tem ${pop.pt} de adultos, e ${penetracao}% usam o serviço.`, en: `A city has ${pop.en} adults, and ${penetracao}% use the service.` }
      : { pt: `Um serviço tem ${pop.pt} de clientes.`, en: `A service has ${pop.en} customers.` },
  ]
  if (nivel >= 3) {
    frases.push(
      mensal
        ? { pt: `Cada usuário compra ${frequencia} vezes por mês, a ${tk.pt} por compra.`, en: `Each user buys ${frequencia} times a month, at ${tk.en} per purchase.` }
        : { pt: `Cada usuário compra ${frequencia} vezes por ano, a ${tk.pt} por compra.`, en: `Each user buys ${frequencia} times a year, at ${tk.en} per purchase.` },
    )
  } else {
    frases.push({ pt: `Cada um gasta ${tk.pt} por ano.`, en: `Each one spends ${tk.en} a year.` })
  }
  frases.push({ pt: 'Qual é o mercado anual?', en: 'What is the annual market?' })

  return {
    camadas,
    enunciado: { pt: frases.map((f) => f.pt).join(' '), en: frases.map((f) => f.en).join(' ') },
    extras: [],
  }
}

function construir(rng: Rng, nivel: Nivel): Problema | null {
  const cenario = rng.next() < 0.6 ? impactoAno1(rng, nivel) : marketSizing(rng, nivel)
  const { camadas } = cenario
  const correta = camadas.reduce((a, c) => a * c.valor, 1)
  const estimativa = nivel >= 3

  // Uma camada esquecida por candidato, na ordem em que aparecem (o valor-base
  // fica de fora: sem ele não sobra conta).
  const esquecidas: Candidato[] = camadas.slice(1).map((c) => ({
    valor: correta / c.valor,
    erro: { pt: `Esqueceu ${c.nome.pt}.`, en: `Forgot ${c.nome.en}.` },
  }))

  // Produto parcial camada a camada, como se faz de cabeça.
  const passos: LocalizedText[] = []
  let parcial = camadas[0]!.valor
  for (const c of camadas.slice(1)) {
    parcial *= c.valor
    const p = fmtResposta(parcial, c.unidade, estimativa)
    passos.push({ pt: `× ${c.texto.pt} = ${p.pt}`, en: `× ${c.texto.en} = ${p.en}` })
  }
  const aprox = estimativa ? ' (arredondando)' : ''
  const aproxEn = estimativa ? ' (rounding)' : ''

  return {
    enunciado: cenario.enunciado,
    correta,
    candidatos: [...esquecidas, ...cenario.extras, ...errosDeEscala(correta).slice(0, 2)],
    unidade: 'moeda',
    estimativa,
    expression: camadas.map((c) => c.expr).join('*'),
    atalho: {
      pt: `Camada a camada${aprox}: ${camadas[0]!.texto.pt} ${passos.map((p) => p.pt).join('; ')}.`,
      en: `Layer by layer${aproxEn}: ${camadas[0]!.texto.en} ${passos.map((p) => p.en).join('; ')}.`,
    },
  }
}

export const gerarCadeia: QmGerador = (seed, nivel) => gerar('cadeia', construir, seed, nivel)
