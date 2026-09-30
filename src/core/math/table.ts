import { mulberry32, type Rng } from '../rng'
import { OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import type { LocalizedText } from '../i18n'
import { optionIdAt } from '../optionIds'
import { normalizeText, type StemTable } from '../schema'
import { formatNumber, parseNumber, type NumberFormat } from './solver'
import { proximo } from './word'

/**
 * Leitura de tabela (subtipo `tabela` de math_word).
 *
 * Na CCAT real são ~2 por prova, quase sempre na segunda metade: uma tabela
 * pequena (4–6 linhas, 2–4 colunas numéricas) e uma pergunta que cruza 1–3
 * células. O que se mede não é a conta, é achar AS células certas depressa —
 * por isso os distratores são as contas certas feitas nas células erradas, ou
 * a conta errada nas células certas.
 *
 * Dois formatos de resposta:
 *
 *  - valor: um número. Provado pelo solver, como todo math_word.
 *  - linha: "qual loja / produto / departamento vence". As alternativas são as
 *           cinco linhas da tabela, e a tabela é montada para que cada métrica
 *           errada (total em vez de por funcionário, receita em vez de lucro)
 *           eleja uma linha DIFERENTE. A resposta é um rótulo, não um número:
 *           a prova é a regra, re-executada pelo gate.
 *
 * O nível escolhe a família:
 *
 *  - 2:   duas contas numa tabela de 4 linhas (soma filtrada, diferença de
 *         receita).
 *  - 3:   o mesmo com 5 linhas, variação percentual de uma linha e a primeira
 *         pergunta de "qual linha" (razão entre duas colunas).
 *  - 4-5: mais células combinadas — variação do TOTAL, participação no todo,
 *         média ponderada — e "qual linha" com três métricas erradas, cada uma
 *         elegendo uma linha diferente, e valores colados.
 */

export interface TableGenerated {
  subtipo: string
  stem: string
  stemTable: StemTable
  options: { id: string; text: string }[]
  answerId: string
  explanation: LocalizedText
  /** só nas perguntas de valor; na de "qual linha" o gabarito é provado pela regra */
  expression?: string
  answerValue?: number
}

export type TableGenerator = (seed: number, difficulty: Difficulty) => TableGenerated

interface ProblemaValor {
  kind: 'valor'
  stem: string
  tabela: StemTable
  valor: number
  expression: string
  format: NumberFormat
  /** erros reais, na ordem de plausibilidade */
  armadilhas: number[]
  explanation: LocalizedText
}

interface ProblemaLinha {
  kind: 'linha'
  stem: string
  tabela: StemTable
  /** rótulo da linha certa */
  correta: string
  /** linhas que vencem sob uma métrica errada, sem repetição */
  armadilhas: string[]
  explanation: LocalizedText
}

type Problema = ProblemaValor | ProblemaLinha

type Template = (rng: Rng, d: Difficulty) => Problema

interface Registro {
  id: string
  niveis: readonly Difficulty[]
  /** menor número de contas que o template exige */
  passos: number
  build: Template
}

export interface TableTemplateInfo {
  id: string
  niveis: readonly Difficulty[]
  passos: number
  /** 'linha' quando a resposta é um rótulo da tabela */
  resposta: 'valor' | 'linha'
}

/** A leitura de tabela começa no nível 2: no 1 a prova real não a usa. */
export const NIVEIS_TABELA: readonly Difficulty[] = [2, 3, 4, 5]

// --- Cenários ----------------------------------------------------------------

const LOJAS = [
  'Oakville', 'Riverside', 'Westgate', 'Lakeview', 'Hillcrest',
  'Northgate', 'Elm Park', 'Southport', 'Bayside', 'Fairview',
] as const

const PRODUTOS = [
  'Desk lamp', 'Monitor', 'Keyboard', 'Headset', 'Webcam',
  'Printer', 'Router', 'Speaker', 'Tablet', 'Charger',
] as const

const DEPARTAMENTOS = [
  'Marketing', 'Sales', 'Finance', 'Operations', 'Engineering',
  'Support', 'Legal', 'Design',
] as const

const REGIOES = ['North', 'South', 'East', 'West', 'Central', 'Coastal', 'Mountain'] as const

function rotulos(rng: Rng, pool: readonly string[], n: number): string[] {
  return rng.shuffle(pool).slice(0, n)
}

function dados(caption: string, columns: string[], rows: (string | number)[][]): StemTable {
  return {
    layout: 'dados',
    caption,
    columns,
    rows: rows.map((r) => r.map((c) => (typeof c === 'number' ? num(c) : c))),
  }
}

// --- Valor: soma filtrada ----------------------------------------------------

/**
 * "Vendas somadas das lojas com mais de N funcionários". Uma loja tem
 * EXATAMENTE N — o erro real é ler "mais de" como "pelo menos".
 */
const somaFiltrada: Template = (rng, d) => {
  const n = d === 2 ? 4 : 5
  const lojas = rotulos(rng, LOJAS, n)
  const maisDe = d === 2 || rng.next() < 0.5
  const { func, vendas, limite } = sortear(() => {
    const func = distintos(rng, n, 8, 60)
    const limite = rng.pick(func)
    const dentro = func.flatMap((f, i) => ((maisDe ? f > limite : f < limite) ? [i] : []))
    // Pelo menos duas linhas somadas (senão é leitura, não conta) e pelo
    // menos uma de fora além da do limite.
    if (dentro.length < 2 || dentro.length > n - 2) return undefined
    if (d === 2) {
      return { func, limite, vendas: func.map(() => rng.int(8, 60) * 500) }
    }
    // Do nível 3 em diante os erros reais precisam cair perto da resposta: uma
    // das lojas somadas é pequena (pular a linha dela quase não muda o total)
    // e a loja do limite também (incluí-la por engano idem).
    const pequena = rng.pick(dentro)
    const vendas = func.map((_, i) => (i === pequena ? rng.int(10, 40) : rng.int(60, 300)) * 100)
    const valor = dentro.reduce((acc, i) => acc + (vendas[i] as number), 0)
    const iLimite = func.indexOf(limite)
    vendas[iLimite] = Math.max(100, Math.round((valor * (0.05 + rng.next() * 0.14)) / 100) * 100)
    return { func, vendas, limite }
  })

  const passa = (f: number) => (maisDe ? f > limite : f < limite)
  const idx = lojas.map((_, i) => i)
  const dentro = idx.filter((i) => passa(func[i] as number))
  const iLimite = func.indexOf(limite)
  const soma = (is: number[]) => is.reduce((acc, i) => acc + (vendas[i] as number), 0)
  const valor = soma(dentro)
  const total = soma(idx)
  // A linha que se pula por pressa: a menor das somadas.
  const pulada = dentro.reduce((a, i) => ((vendas[i] as number) < (vendas[a] as number) ? i : a))

  const nomes = (is: number[]) => is.map((i) => lojas[i]).join(', ')
  const direcao = maisDe ? 'more than' : 'fewer than'
  return {
    kind: 'valor',
    stem:
      `What were the combined sales, in dollars, of the stores with ${direcao} ${limite} ` +
      `employees?`,
    tabela: dados(
      'Monthly sales by store',
      ['Store', 'Employees', 'Sales ($)'],
      lojas.map((l, i) => [l, func[i] as number, vendas[i] as number]),
    ),
    valor,
    expression: dentro.map((i) => vendas[i]).join('+'),
    format: 'plain',
    armadilhas: [
      valor + (vendas[iLimite] as number), // contou a loja do limite ("pelo menos")
      total - valor - (vendas[iLimite] as number), // somou o lado errado do filtro
      valor - (vendas[pulada] as number), // pulou uma linha
      total - valor, // o complemento, com a do limite
      total, // somou a coluna inteira
    ],
    explanation: {
      pt:
        `Filtre primeiro: ${direcao === 'more than' ? 'mais de' : 'menos de'} ${limite} ` +
        `funcionários são ${nomes(dentro)}. Some só essas vendas: ${num(valor)}. ` +
        `${lojas[iLimite]} tem exatamente ${limite} e fica de fora — "mais de" e "menos de" ` +
        `não incluem o próprio limite.`,
      en:
        `Filter first: ${direcao} ${limite} employees means ${nomes(dentro)}. Add only those ` +
        `sales: ${num(valor)}. ${lojas[iLimite]} has exactly ${limite} and is left out — ` +
        `"more than" and "fewer than" exclude the limit itself.`,
    },
  }
}

// --- Valor: diferença de receita ---------------------------------------------

/** Receita é unidades × preço: quem vende mais unidades não fatura mais, necessariamente. */
const diferencaReceita: Template = (rng, d) => {
  const n = d === 2 ? 4 : 5
  const produtos = rotulos(rng, PRODUTOS, n)
  const { un, preco, x, y } = sortear(() => {
    const un = distintos(rng, n, 4, 40).map((v) => v * 10)
    const preco = distintos(rng, n, d === 2 ? 4 : 6, d === 2 ? 30 : 75)
    const receita = un.map((u, i) => u * (preco[i] as number))
    const [x, y] = rng.shuffle(un.map((_, i) => i)).slice(0, 2) as [number, number]
    const rx = receita[x] as number
    const ry = receita[y] as number
    // X fatura mais com MENOS unidades: quem compara só a coluna de unidades
    // erra o sinal da pergunta.
    if (rx <= ry || (un[x] as number) >= (un[y] as number)) return undefined
    const dp = (preco[x] as number) - (preco[y] as number)
    const perto = pertos(rx - ry, [dp * (un[y] as number), dp * (un[x] as number)], 'currency')
    return d === 2 || perto >= 2 ? { un, preco, x, y } : undefined
  })

  const ux = un[x] as number
  const uy = un[y] as number
  const px = preco[x] as number
  const py = preco[y] as number
  const rx = ux * px
  const ry = uy * py
  const valor = rx - ry
  const nomeX = produtos[x] as string
  const nomeY = produtos[y] as string

  return {
    kind: 'valor',
    stem: `How much more revenue did the ${nomeX} bring in than the ${nomeY}?`,
    tabela: dados(
      'Product sales, March',
      ['Product', 'Units sold', 'Price ($)'],
      produtos.map((p, i) => [p, un[i] as number, preco[i] as number]),
    ),
    valor,
    expression: `${ux}*${px}-${uy}*${py}`,
    format: 'currency',
    armadilhas: [
      (px - py) * uy, // diferença de preço vezes as unidades do outro
      (px - py) * ux, // diferença de preço vezes as próprias unidades
      rx, // parou na receita do primeiro
      ry, // respondeu a receita do segundo
      rx + ry, // somou em vez de subtrair
    ],
    explanation: {
      pt:
        `Receita = unidades × preço. ${nomeX}: ${ux} × $${px} = ${usd(rx)}. ${nomeY}: ${uy} × ` +
        `$${py} = ${usd(ry)}. Diferença: ${usd(valor)}. O ${nomeX} vendeu MENOS unidades e ` +
        `faturou mais — comparar só uma coluna dá a resposta errada.`,
      en:
        `Revenue = units × price. ${nomeX}: ${ux} × $${px} = ${usd(rx)}. ${nomeY}: ${uy} × ` +
        `$${py} = ${usd(ry)}. Difference: ${usd(valor)}. The ${nomeX} sold FEWER units and ` +
        `still earned more — comparing a single column gets it wrong.`,
    },
  }
}

// --- Valor: variação percentual ----------------------------------------------

/** Percentuais com que um valor múltiplo de 20 continua inteiro. */
const PCT_LINHA = [-40, -25, -20, -15, -10, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75] as const

function linhasComVariacao(rng: Rng, n: number): { de: number[]; para: number[]; pct: number[] } {
  const de = distintos(rng, n, 10, 60).map((v) => v * 20)
  return comVariacao(rng, de)
}

function comVariacao(rng: Rng, de: number[]): { de: number[]; para: number[]; pct: number[] } {
  const pct = de.map(() => rng.pick(PCT_LINHA))
  const para = de.map((v, i) => (v * (100 + (pct[i] as number))) / 100)
  return { de, para, pct }
}

/**
 * Coluna de 2023 com soma fixa. Com total 2.000, 2.500, 3.000 ou 4.000, a
 * variação do total fecha com uma casa sempre que a diferença for múltipla de
 * 2, 5, 3 ou 4 — em vez de quase nunca, com uma soma qualquer.
 */
function colunaComTotal(rng: Rng, n: number): number[] | undefined {
  const total = rng.pick([2000, 2500, 3000, 4000])
  const teto = Math.min(60, Math.floor(total / 20 / (n - 1)))
  const de = distintos(rng, n - 1, 10, teto).map((v) => v * 20)
  const ultimo = total - de.reduce((acc, v) => acc + v, 0)
  if (ultimo < 200 || ultimo > 1200 || de.includes(ultimo)) return undefined
  return [...de, ultimo]
}

const variacaoLinha: Template = (rng, d) => {
  const n = d === 3 ? 4 : 5
  const regioes = rotulos(rng, REGIOES, n)
  const { de, para, pct, alvo } = sortear(() => {
    const l = linhasComVariacao(rng, n)
    const alvo = rng.int(0, n - 1)
    // Vizinhas com variação diferente: ler a linha de cima tem de dar outro número.
    const vizinhas = [alvo - 1, alvo + 1].filter((i) => i >= 0 && i < n)
    if (vizinhas.some((i) => l.pct[i] === l.pct[alvo])) return undefined
    const a = l.de[alvo] as number
    const b = l.para[alvo] as number
    const p = Math.abs(l.pct[alvo] as number)
    const erros = [(Math.abs(b - a) / b) * 100, ...vizinhas.map((i) => Math.abs(l.pct[i] as number))]
    return pertos(p, erros, 'percent') >= 2 ? { ...l, alvo } : undefined
  })

  const a = de[alvo] as number
  const b = para[alvo] as number
  const p = pct[alvo] as number
  const sobe = p > 0
  const dif = Math.abs(b - a)
  const regiao = regioes[alvo] as string
  const vizinha = (i: number) => (i >= 0 && i < n ? Math.abs(pct[i] as number) : Number.NaN)

  return {
    kind: 'valor',
    stem:
      `By what percent did sales in the ${regiao} region ${sobe ? 'increase' : 'decrease'} ` +
      `from 2023 to 2024?`,
    tabela: dados(
      'Units sold by region',
      ['Region', '2023', '2024'],
      regioes.map((r, i) => [r, de[i] as number, para[i] as number]),
    ),
    valor: Math.abs(p),
    expression: sobe ? `(${b}-${a})/${a}*100` : `(${a}-${b})/${a}*100`,
    format: 'percent',
    armadilhas: [
      (dif / b) * 100, // dividiu pelo valor novo
      vizinha(alvo - 1), // leu a linha de cima
      vizinha(alvo + 1), // leu a linha de baixo
      (b / a) * 100, // a razão novo/antigo
      ...pct.filter((_, i) => Math.abs(i - alvo) > 1).map((v) => Math.abs(v)), // outra linha
    ],
    explanation: {
      pt:
        `${regiao}: de ${num(a)} para ${num(b)}, uma variação de ${num(dif)}. Percentual é ` +
        `sobre o valor de PARTIDA: ${num(dif)} ÷ ${num(a)} = ${Math.abs(p)}%. Dividir por ` +
        `${num(b)} é o erro de base; ler a linha vizinha é o erro de pressa.`,
      en:
        `${regiao}: from ${num(a)} to ${num(b)}, a change of ${num(dif)}. A percent change is ` +
        `over the STARTING value: ${num(dif)} ÷ ${num(a)} = ${Math.abs(p)}%. Dividing by ` +
        `${num(b)} is the base error; reading the next row is the rushing error.`,
    },
  }
}

/**
 * Variação do TOTAL. A armadilha clássica é tirar a média das variações das
 * linhas — que ignora que as linhas têm tamanhos diferentes.
 */
const variacaoTotal: Template = (rng, d) => {
  const n = d === 4 ? 4 : 5
  const regioes = rotulos(rng, REGIOES, n)
  const { de, para, pct, somaDe, somaPara, valor, media } = sortear(() => {
    const coluna = colunaComTotal(rng, n)
    if (!coluna) return undefined
    const l = comVariacao(rng, coluna)
    const somaDe = l.de.reduce((acc, v) => acc + v, 0)
    const somaPara = l.para.reduce((acc, v) => acc + v, 0)
    const valor = ((somaPara - somaDe) / somaDe) * 100
    const media = l.pct.reduce((acc, v) => acc + v, 0) / n
    // Resposta exata com uma casa, positiva, e diferente da média das linhas
    // (senão o erro clássico acertaria por acaso).
    if (valor <= 0 || !umaCasa(valor)) return undefined
    if (Math.abs(media - valor) < 0.05) return undefined
    const erros = [media, ((somaPara - somaDe) / somaPara) * 100, Math.max(...l.pct)]
    return pertos(valor, erros, 'percent') >= 2 ? { ...l, somaDe, somaPara, valor, media } : undefined
  })

  return {
    kind: 'valor',
    stem: `By what percent did total sales across all regions increase from 2023 to 2024?`,
    tabela: dados(
      'Units sold by region',
      ['Region', '2023', '2024'],
      regioes.map((r, i) => [r, de[i] as number, para[i] as number]),
    ),
    valor,
    expression: `((${para.join('+')})-(${de.join('+')}))/(${de.join('+')})*100`,
    format: 'percent',
    armadilhas: [
      media, // média simples das variações das linhas
      ((somaPara - somaDe) / somaPara) * 100, // base errada: o total novo
      Math.max(...pct), // a maior variação de linha
      (somaPara / somaDe) * 100, // a razão novo/antigo
    ],
    explanation: {
      pt:
        `Some cada coluna: ${num(somaDe)} em 2023 e ${num(somaPara)} em 2024. Variação: ` +
        `${num(somaPara - somaDe)} ÷ ${num(somaDe)} = ${formatNumber(valor, 'percent')}. A média ` +
        `das variações das linhas (${formatNumber(media, 'percent')}) trata todas as regiões ` +
        `como se tivessem o mesmo tamanho — e não têm.`,
      en:
        `Add each column: ${num(somaDe)} in 2023 and ${num(somaPara)} in 2024. Change: ` +
        `${num(somaPara - somaDe)} ÷ ${num(somaDe)} = ${formatNumber(valor, 'percent')}. ` +
        `Averaging the row changes (${formatNumber(media, 'percent')}) treats every region as ` +
        `the same size — and they are not.`,
    },
  }
}

// --- Valor: participação no todo ---------------------------------------------

const TOTAIS_ORCAMENTO = [400, 500, 1000, 1250, 2000, 2500] as const

function armadilhasParticipacao(orc: number[], func: number[], escolhidos: number[]): number[] {
  const soma = (v: number[], is: number[]) => is.reduce((acc, i) => acc + (v[i] as number), 0)
  const todos = orc.map((_, i) => i)
  const total = soma(orc, todos)
  const parte = soma(orc, escolhidos)
  const fora = todos.filter((i) => !escolhidos.includes(i))
  // A linha que some da soma do total por pressa: a menor de fora.
  const menorFora = fora.reduce((a, i) => ((orc[i] as number) < (orc[a] as number) ? i : a))
  const primeiro = escolhidos[0] as number
  return [
    (soma(func, escolhidos) / soma(func, todos)) * 100, // usou a coluna de funcionários
    (parte / (total - (orc[menorFora] as number))) * 100, // esqueceu uma linha no total
    ((parte - (orc[primeiro] as number)) / total) * 100, // esqueceu um departamento da parte
    (parte / (total - parte)) * 100, // comparou com o resto, não com o total
  ]
}

const participacao: Template = (rng, d) => {
  const n = 5
  const deps = rotulos(rng, DEPARTAMENTOS, n)
  const quantos = d === 4 ? 2 : 3
  const { orc, func, escolhidos, valor } = sortear(() => {
    // Total escolhido para a divisão fechar com uma casa: com orçamentos
    // múltiplos de 10, qualquer parte de 400, 500, 1.000, 1.250, 2.000 ou
    // 2.500 dá percentual exato.
    const total = rng.pick(TOTAIS_ORCAMENTO)
    const teto = Math.floor(total / 10 / 3)
    const orc = distintos(rng, n - 1, 6, teto).map((v) => v * 10)
    const ultimo = total - orc.reduce((acc, v) => acc + v, 0)
    if (ultimo < 60 || orc.includes(ultimo)) return undefined
    orc.push(ultimo)
    // Funcionários mais ou menos proporcionais ao orçamento: ler a coluna
    // errada dá um percentual parecido, que é o que o torna um erro de verdade.
    const func = orc.map((o) => Math.max(3, Math.round((o / 10) * (0.75 + rng.next() * 0.5))))
    if (new Set(func).size !== n) return undefined
    const escolhidos = rng.shuffle(deps.map((_, i) => i)).slice(0, quantos).sort((a, b) => a - b)
    const parte = escolhidos.reduce((acc, i) => acc + (orc[i] as number), 0)
    const valor = (parte / total) * 100
    const erros = armadilhasParticipacao(orc, func, escolhidos)
    return pertos(valor, erros, 'percent') >= 2 ? { orc, func, escolhidos, valor } : undefined
  })

  const total = orc.reduce((acc, v) => acc + v, 0)
  const parte = escolhidos.reduce((acc, i) => acc + (orc[i] as number), 0)
  const nomes = escolhidos.map((i) => deps[i] as string)
  const lista = juntar(nomes, 'and')

  return {
    kind: 'valor',
    stem: `What percent of the total budget goes to ${lista} together?`,
    tabela: dados(
      'Annual budget by department',
      ['Department', 'Employees', 'Budget ($K)'],
      deps.map((dep, i) => [dep, func[i] as number, orc[i] as number]),
    ),
    valor,
    expression: `(${escolhidos.map((i) => orc[i]).join('+')})/(${orc.join('+')})*100`,
    format: 'percent',
    armadilhas: armadilhasParticipacao(orc, func, escolhidos),
    explanation: {
      pt:
        `Some a coluna de orçamento inteira: ${num(total)}. A parte pedida soma ${num(parte)}. ` +
        `${num(parte)} ÷ ${num(total)} = ${formatNumber(valor, 'percent')}. Dividir pelo ` +
        `RESTO (${num(total - parte)}) em vez do total, ou ler a coluna de funcionários, dá ` +
        `outro número entre as alternativas.`,
      en:
        `Add the whole budget column: ${num(total)}. The requested part adds up to ` +
        `${num(parte)}. ${num(parte)} ÷ ${num(total)} = ${formatNumber(valor, 'percent')}. ` +
        `Dividing by the REST (${num(total - parte)}) instead of the total, or reading the ` +
        `employee column, lands on another option.`,
    },
  }
}

// --- Valor: média ponderada --------------------------------------------------

function armadilhasMedia(func: number[], sal: number[]): number[] {
  const n = func.length
  const pessoas = func.reduce((acc, v) => acc + v, 0)
  const folha = func.reduce((acc, f, i) => acc + f * (sal[i] as number), 0)
  const somaSal = sal.reduce((acc, v) => acc + v, 0)
  const fu = func[n - 1] as number
  const su = sal[n - 1] as number
  return [
    somaSal / n, // média simples das médias
    (folha - fu * su) / (pessoas - fu), // esqueceu a última linha
    folha / (pessoas - fu), // esqueceu a última linha só no divisor
    (somaSal - su) / (n - 1), // média simples sem a última
  ]
}

const mediaPonderada: Template = (rng) => {
  const n = 4
  const deps = rotulos(rng, DEPARTAMENTOS, n)
  const { func, salK, valor } = sortear(() => {
    // Total de pessoas redondo (40, 50, 80, 100): a média em dólares fecha
    // inteira numa fração grande das tentativas, em vez de quase nunca.
    const pessoas = rng.pick([40, 50, 80, 100])
    const func = distintos(rng, n - 1, 4, Math.floor(pessoas / 2.5))
    const ultimo = pessoas - func.reduce((acc, v) => acc + v, 0)
    if (ultimo < 4 || func.includes(ultimo)) return undefined
    func.push(ultimo)
    const salK = distintos(rng, n, 42, 96)
    const folhaK = func.reduce((acc, f, i) => acc + f * (salK[i] as number), 0)
    // Em dólares inteiros, como as células: um "61,900" entre inteiros não
    // denuncia nada; um "61.90" entre "60" e "65" denunciava.
    const valor = (folhaK * 1000) / pessoas
    if (!ehInteiro(valor)) return undefined
    const sal = salK.map((v) => v * 1000)
    return pertos(valor, armadilhasMedia(func, sal), 'plain') >= 2 ? { func, salK, valor } : undefined
  })

  const sal = salK.map((v) => v * 1000)
  const pessoas = func.reduce((acc, v) => acc + v, 0)
  const folhaK = func.reduce((acc, f, i) => acc + f * (salK[i] as number), 0)
  const simples = sal.reduce((acc, v) => acc + v, 0) / n
  const contas = func.map((f, i) => `${f} × ${salK[i]}`).join(' + ')

  return {
    kind: 'valor',
    stem: `What is the average salary, in dollars, of all the employees in these four departments?`,
    tabela: dados(
      'Staff and average salary by department',
      ['Department', 'Employees', 'Avg. salary ($)'],
      deps.map((dep, i) => [dep, func[i] as number, sal[i] as number]),
    ),
    valor,
    expression: `(${func.map((f, i) => `${f}*${sal[i]}`).join('+')})/(${func.join('+')})`,
    format: 'plain',
    armadilhas: armadilhasMedia(func, sal),
    explanation: {
      pt:
        `Média de grupos de tamanhos diferentes pede o TOTAL. Em milhares: folha = ${contas} = ` +
        `${num(folhaK)}, para ${pessoas} pessoas: ${num(valor)} dólares. A média simples das ` +
        `quatro médias (${num(simples)}) dá a um departamento de ${Math.min(...func)} pessoas ` +
        `o mesmo peso de um de ${Math.max(...func)}.`,
      en:
        `Averaging groups of different sizes needs the TOTAL. In thousands: payroll = ` +
        `${contas} = ${num(folhaK)}, over ${pessoas} people: ${num(valor)} dollars. The plain ` +
        `average of the four averages (${num(simples)}) gives a department of ` +
        `${Math.min(...func)} people the same weight as one of ${Math.max(...func)}.`,
    },
  }
}

// --- Linha: razão entre colunas ----------------------------------------------

/**
 * "Qual loja vende mais POR FUNCIONÁRIO?" A loja que mais vende no total tem
 * de ser outra, e a que tem menos gente também — são os dois atalhos que a
 * pressa usa.
 */
const qualLinhaRazao: Template = (rng, d) => {
  const n = 5
  if (rng.next() < 0.5) {
    const lojas = rotulos(rng, LOJAS, n)
    const { func, porFunc, vendas } = sortear(() => {
      const porFunc = d === 3 ? distintos(rng, n, 80, 200).map((v) => v * 10) : colados(rng, n, 90, 160, 10)
      const func = distintos(rng, n, 6, 45)
      const vendas = func.map((f, i) => f * (porFunc[i] as number))
      const certa = argmax(porFunc)
      // Os dois atalhos da pressa (maior total, menos gente) sempre elegem
      // linhas diferentes da certa e entre si; do nível 4 em diante, ler
      // "maior" como "menor" também cai numa terceira.
      const atalhos = unicos([argmax(vendas), argmin(func)], certa)
      const todas = unicos([argmax(vendas), argmin(func), argmin(porFunc)], certa)
      return atalhos.length === 2 && todas.length >= (d === 3 ? 2 : 3)
        ? { func, porFunc, vendas }
        : undefined
    })
    const certa = argmax(porFunc)
    const lista = porFunc.map((v, i) => `${lojas[i]} ${num(v)}`).join('; ')
    const maiorTotal = lojas[argmax(vendas)] as string
    return {
      kind: 'linha',
      stem: 'Which store had the highest sales per employee?',
      tabela: dados(
        'Monthly sales by store',
        ['Store', 'Employees', 'Sales ($)'],
        lojas.map((l, i) => [l, func[i] as number, vendas[i] as number]),
      ),
      correta: lojas[certa] as string,
      armadilhas: unicos([argmax(vendas), argmin(func), argmin(porFunc)], certa).map(
        (i) => lojas[i] as string,
      ),
      explanation: {
        pt:
          `Divida vendas por funcionários em cada linha: ${lista}. O maior é ` +
          `${lojas[certa]}. ${maiorTotal} vende mais no total, mas com mais gente — "por ` +
          `funcionário" pede a razão, não a coluna de vendas.`,
        en:
          `Divide sales by employees on each row: ${lista}. The highest is ${lojas[certa]}. ` +
          `${maiorTotal} sells the most in total, but with more staff — "per employee" asks ` +
          `for the ratio, not the sales column.`,
      },
    }
  }

  const deps = rotulos(rng, DEPARTAMENTOS, n)
  const { func, porCabeca, orc } = sortear(() => {
    const porCabeca = d === 3 ? distintos(rng, n, 3, 15) : colados(rng, n, 6, 14, 1)
    const func = distintos(rng, n, 5, 40)
    const orc = func.map((f, i) => f * (porCabeca[i] as number))
    const certa = argmin(porCabeca)
    const atalhos = unicos([argmin(orc), argmax(func)], certa)
    const todas = unicos([argmin(orc), argmax(func), argmax(porCabeca)], certa)
    return atalhos.length === 2 && todas.length >= (d === 3 ? 2 : 3)
      ? { func, porCabeca, orc }
      : undefined
  })
  const certa = argmin(porCabeca)
  const lista = porCabeca.map((v, i) => `${deps[i]} ${v}`).join('; ')
  const menorTotal = deps[argmin(orc)] as string
  return {
    kind: 'linha',
    stem: 'Which department spends the least on training per employee?',
    tabela: dados(
      'Training budget by department',
      ['Department', 'Employees', 'Budget ($K)'],
      deps.map((dep, i) => [dep, func[i] as number, orc[i] as number]),
    ),
    correta: deps[certa] as string,
    armadilhas: unicos([argmin(orc), argmax(func), argmax(porCabeca)], certa).map(
      (i) => deps[i] as string,
    ),
    explanation: {
      pt:
        `Orçamento ÷ funcionários, em milhares por pessoa: ${lista}. O menor é ${deps[certa]}. ` +
        `${menorTotal} tem o menor orçamento total, mas para pouca gente — a pergunta é POR ` +
        `funcionário.`,
      en:
        `Budget ÷ employees, in thousands per person: ${lista}. The lowest is ${deps[certa]}. ` +
        `${menorTotal} has the smallest total budget, but for few people — the question is PER ` +
        `employee.`,
    },
  }
}

// --- Linha: lucro total e margem ---------------------------------------------

interface Catalogo {
  un: number[]
  preco: number[]
  custo: number[]
}

function catalogo(rng: Rng, n: number, colado: boolean): Catalogo {
  const un = distintos(rng, n, 4, 40).map((v) => v * 10)
  const preco = distintos(rng, n, 3, 30).map((v) => v * 4)
  const margem = colado
    ? preco.map((p) => Math.max(1, Math.round(p * (0.2 + rng.next() * 0.25))))
    : preco.map((p) => rng.int(1, Math.max(1, Math.floor(p * 0.6))))
  const custo = preco.map((p, i) => p - (margem[i] as number))
  return { un, preco, custo }
}

const qualLinhaLucro: Template = (rng, d) => {
  const n = 5
  const produtos = rotulos(rng, PRODUTOS, n)
  const { un, preco, custo } = sortear(() => {
    const c = catalogo(rng, n, d === 5)
    const unit = c.preco.map((p, i) => p - (c.custo[i] as number))
    const lucro = c.un.map((u, i) => u * (unit[i] as number))
    const receita = c.un.map((u, i) => u * (c.preco[i] as number))
    if (!maximoUnico(lucro)) return undefined
    const certa = argmax(lucro)
    const armadilhas = unicos(
      [argmax(unit), argmax(receita), argmax(c.un)].filter((_, k) =>
        maximoUnico([unit, receita, c.un][k] as number[]),
      ),
      certa,
    )
    if (armadilhas.length < (d === 4 ? 2 : 3)) return undefined
    // No nível 5 o segundo lugar fica a menos de 10%: estimar não resolve.
    const ordenado = [...lucro].sort((a, b) => b - a)
    if (d === 5 && (ordenado[1] as number) < (ordenado[0] as number) * 0.9) return undefined
    return c
  })

  const unit = preco.map((p, i) => p - (custo[i] as number))
  const lucro = un.map((u, i) => u * (unit[i] as number))
  const receita = un.map((u, i) => u * (preco[i] as number))
  const certa = argmax(lucro)
  const lista = lucro.map((v, i) => `${produtos[i]} ${usd(v)}`).join('; ')
  const porUnidade = produtos[argmax(unit)] as string

  return {
    kind: 'linha',
    stem: 'Which product earned the greatest total profit?',
    tabela: dados(
      'Product sales, March',
      ['Product', 'Units sold', 'Price ($)', 'Cost ($)'],
      produtos.map((p, i) => [p, un[i] as number, preco[i] as number, custo[i] as number]),
    ),
    correta: produtos[certa] as string,
    armadilhas: unicos([argmax(unit), argmax(receita), argmax(un), argmax(preco)], certa).map(
      (i) => produtos[i] as string,
    ),
    explanation: {
      pt:
        `Lucro total = unidades × (preço − custo): ${lista}. O maior é ${produtos[certa]}. ` +
        `${porUnidade} lucra mais POR UNIDADE, e o mais vendido ou o de maior receita também ` +
        `não bastam — o total cruza as três colunas.`,
      en:
        `Total profit = units × (price − cost): ${lista}. The greatest is ${produtos[certa]}. ` +
        `${porUnidade} makes the most PER UNIT, and neither the best seller nor the top ` +
        `revenue is enough — the total crosses all three columns.`,
    },
  }
}

const qualLinhaMargem: Template = (rng) => {
  const n = 5
  const produtos = rotulos(rng, PRODUTOS, n)
  const { un, preco, custo, margem } = sortear(() => {
    // Preço múltiplo de 20 e margem múltipla de 5%: custo sempre inteiro.
    const preco = distintos(rng, n, 1, 9).map((v) => v * 20)
    const margem = distintos(rng, n, 3, 12).map((v) => v * 5)
    const custo = preco.map((p, i) => p - (p * (margem[i] as number)) / 100)
    const un = distintos(rng, n, 4, 40).map((v) => v * 10)
    const unit = preco.map((p, i) => p - (custo[i] as number))
    const lucro = un.map((u, i) => u * (unit[i] as number))
    const certa = argmax(margem)
    const candidatas = [unit, lucro, preco]
    const armadilhas = unicos(
      [argmax(unit), argmax(lucro), argmax(preco)].filter((_, k) =>
        maximoUnico(candidatas[k] as number[]),
      ),
      certa,
    )
    return armadilhas.length >= 3 ? { un, preco, custo, margem } : undefined
  })

  const unit = preco.map((p, i) => p - (custo[i] as number))
  const lucro = un.map((u, i) => u * (unit[i] as number))
  const certa = argmax(margem)
  const lista = margem.map((m, i) => `${produtos[i]} ${m}%`).join('; ')

  return {
    kind: 'linha',
    stem:
      'Which product had the highest profit margin (profit as a percent of price)?',
    tabela: dados(
      'Product sales, March',
      ['Product', 'Units sold', 'Price ($)', 'Cost ($)'],
      produtos.map((p, i) => [p, un[i] as number, preco[i] as number, custo[i] as number]),
    ),
    correta: produtos[certa] as string,
    armadilhas: unicos([argmax(unit), argmax(lucro), argmax(preco), argmin(custo)], certa).map(
      (i) => produtos[i] as string,
    ),
    explanation: {
      pt:
        `Margem = (preço − custo) ÷ preço: ${lista}. A maior é ${produtos[certa]}. O lucro ` +
        `por unidade em dólares favorece o produto caro (${produtos[argmax(unit)]}), e a ` +
        `coluna de unidades nem entra na conta.`,
      en:
        `Margin = (price − cost) ÷ price: ${lista}. The highest is ${produtos[certa]}. Profit ` +
        `per unit in dollars favours the expensive product (${produtos[argmax(unit)]}), and ` +
        `the units column does not enter the calculation at all.`,
    },
  }
}

// --- Registro ----------------------------------------------------------------

const TEMPLATES: Registro[] = [
  { id: 'somaFiltrada', niveis: [2, 3], passos: 2, build: somaFiltrada },
  { id: 'diferencaReceita', niveis: [2, 3], passos: 3, build: diferencaReceita },
  { id: 'variacaoLinha', niveis: [3, 4], passos: 2, build: variacaoLinha },
  { id: 'qualLinhaRazao', niveis: [3, 4], passos: 2, build: qualLinhaRazao },
  { id: 'variacaoTotal', niveis: [4, 5], passos: 3, build: variacaoTotal },
  { id: 'participacao', niveis: [4, 5], passos: 3, build: participacao },
  { id: 'qualLinhaLucro', niveis: [4, 5], passos: 3, build: qualLinhaLucro },
  { id: 'mediaPonderada', niveis: [5], passos: 3, build: mediaPonderada },
  { id: 'qualLinhaMargem', niveis: [5], passos: 3, build: qualLinhaMargem },
]

const RESPOSTA_POR_TEMPLATE: Record<string, 'valor' | 'linha'> = {
  somaFiltrada: 'valor',
  diferencaReceita: 'valor',
  variacaoLinha: 'valor',
  qualLinhaRazao: 'linha',
  variacaoTotal: 'valor',
  participacao: 'valor',
  qualLinhaLucro: 'linha',
  mediaPonderada: 'valor',
  qualLinhaMargem: 'linha',
}

export const TABLE_TEMPLATES: TableTemplateInfo[] = TEMPLATES.map(({ id, niveis, passos }) => ({
  id,
  niveis,
  passos,
  resposta: RESPOSTA_POR_TEMPLATE[id] as 'valor' | 'linha',
}))

/**
 * Gera a questão e informa o template sorteado (os testes usam para provar
 * que o nível muda a família).
 */
export function gerarTabela(
  seed: number,
  difficulty: Difficulty,
): { questao: TableGenerated; template: string } {
  if (!NIVEIS_TABELA.includes(difficulty)) {
    throw new Error(`leitura de tabela começa no nível 2; pedido nível ${difficulty}`)
  }
  const rng = mulberry32(seed)
  const elegiveis = TEMPLATES.filter((t) => t.niveis.includes(difficulty))
  // Template sorteado uma vez; só os slots são re-sorteados (ver word.ts).
  const escolhido = rng.pick(elegiveis)
  const problema = semVazamento(() => escolhido.build(rng, difficulty), difficulty)
  const questao =
    problema.kind === 'valor'
      ? montarValor(rng, problema, difficulty)
      : montarLinha(rng, problema)
  return { questao, template: escolhido.id }
}

export const TABLE_GENERATORS = {
  tabela: (seed: number, difficulty: Difficulty) => gerarTabela(seed, difficulty).questao,
} as const satisfies Record<string, TableGenerator>

// --- Montagem ----------------------------------------------------------------

/**
 * Descarta o problema que entrega a resposta de vista: o valor certo impresso
 * numa célula ou no enunciado, ou (na pergunta de linha) o rótulo certo citado
 * no enunciado. Do nível 3 em diante exige, como em word.ts, pelo menos dois
 * erros reais perto da resposta — senão estimar resolve.
 */
function semVazamento(build: () => Problema, difficulty: Difficulty): Problema {
  for (let tentativa = 0; tentativa < 300; tentativa++) {
    const p = build()
    if (p.kind === 'linha') {
      const stem = ` ${normalizeText(p.stem)} `
      if (p.tabela.rows.some((r) => stem.includes(` ${normalizeText(r[0] as string)} `))) continue
      return p
    }
    const resposta = formatNumber(p.valor, p.format)
    if (numerosNaTabela(p.tabela).some((n) => Math.abs(n - p.valor) < 0.005)) continue
    if (numerosDe(p.stem).some((n) => Math.abs(n - p.valor) < 0.005)) continue
    if (normalizeText(p.stem).includes(` ${normalizeText(resposta)} `)) continue
    const perto = distratores(p).filter((v) => proximo(v, p.valor))
    if (difficulty >= 3 && perto.length < 2) continue
    return p
  }
  throw new Error('não consegui montar a tabela sem vazar a resposta')
}

function montarValor(rng: Rng, p: ProblemaValor, difficulty: Difficulty): TableGenerated {
  const valores = [p.valor]
  const vistos = new Set([arredonda(p.valor)])
  const candidatos = distratores(p)
  const ordenados =
    difficulty >= 3
      ? [
          ...candidatos.filter((v) => proximo(v, p.valor)),
          ...candidatos.filter((v) => !proximo(v, p.valor)),
        ]
      : candidatos

  for (const v of ordenados) {
    if (valores.length >= OPCOES_POR_QUESTAO) break
    vistos.add(arredonda(v))
    valores.push(v)
  }

  // Rede de segurança, no mesmo formato da resposta.
  let passo = 1
  while (valores.length < OPCOES_POR_QUESTAO) {
    const bruto = p.valor * (1 + 0.07 * passo * (passo % 2 === 0 ? 1 : -1))
    // No formato e no "grão" da resposta: decimal entre inteiros, ou 77,577
    // entre múltiplos de 50, denuncia o distrator.
    const g = grao(p.valor)
    const candidato = Math.round(Math.round(bruto / g) * g * 10) / 10
    if (candidato > 0 && !vistos.has(arredonda(candidato))) {
      vistos.add(arredonda(candidato))
      valores.push(candidato)
    }
    passo++
    if (passo > 60) throw new Error('não consegui montar distratores para a tabela')
  }

  const embaralhados = rng.shuffle(valores.map((v, i) => ({ v, certa: i === 0 })))
  return {
    subtipo: 'tabela',
    stem: p.stem,
    stemTable: p.tabela,
    options: embaralhados.map((o, i) => ({
      id: optionIdAt(i) as string,
      text: formatNumber(o.v, p.format),
    })),
    answerId: optionIdAt(embaralhados.findIndex((o) => o.certa)) as string,
    explanation: p.explanation,
    expression: p.expression,
    answerValue: p.valor,
  }
}

/**
 * Alternativas de "qual linha": as cinco linhas da tabela, como na prova. As
 * armadilhas já garantem que as métricas erradas apontam para linhas
 * diferentes da certa; a ordem é embaralhada para a posição não entregar nada.
 */
function montarLinha(rng: Rng, p: ProblemaLinha): TableGenerated {
  const linhas = p.tabela.rows.map((r) => r[0] as string)
  const outras = [...p.armadilhas, ...linhas.filter((l) => l !== p.correta && !p.armadilhas.includes(l))]
  const textos = [p.correta, ...outras].slice(0, OPCOES_POR_QUESTAO)
  const embaralhados = rng.shuffle(textos.map((t, i) => ({ t, certa: i === 0 })))
  return {
    subtipo: 'tabela',
    stem: p.stem,
    stemTable: p.tabela,
    options: embaralhados.map((o, i) => ({ id: optionIdAt(i) as string, text: o.t })),
    answerId: optionIdAt(embaralhados.findIndex((o) => o.certa)) as string,
    explanation: p.explanation,
  }
}

function distratores(p: ProblemaValor): number[] {
  return distratoresDe(p.valor, p.armadilhas, p.format)
}

/** Mesmo filtro de word.ts: fora o que se elimina de olho. */
function distratoresDe(valor: number, armadilhas: number[], format: NumberFormat): number[] {
  const out: number[] = []
  const vistos = new Set([arredonda(valor)])
  for (const bruto of armadilhas) {
    if (!Number.isFinite(bruto) || bruto <= 0) continue
    if (!exibivelExato(bruto, valor, format)) continue
    const v = Math.round(bruto * 100) / 100
    if (v > valor * 4 || v < valor / 4) continue
    const chave = arredonda(v)
    if (vistos.has(chave)) continue
    vistos.add(chave)
    out.push(v)
  }
  return out
}

/**
 * Quantos erros reais viram alternativa a ±20% da resposta. Os templates
 * checam isto já no sorteio dos slots, que é barato — descartar depois,
 * refazendo a tabela inteira, custava centenas de tentativas por questão.
 */
function pertos(valor: number, armadilhas: number[], format: NumberFormat): number {
  return distratoresDe(valor, armadilhas, format).filter((v) => proximo(v, valor)).length
}

function exibivelExato(v: number, valor: number, format: NumberFormat): boolean {
  switch (format) {
    case 'currency':
      return Math.abs(v * 100 - Math.round(v * 100)) < 1e-6
    case 'percent':
      return umaCasa(v)
    case 'plain':
      return ehInteiro(valor) ? ehInteiro(v) : umaCasa(v)
  }
}

/** Números de todas as células que não são rótulo de linha. */
export function numerosNaTabela(t: StemTable): number[] {
  return t.rows.flatMap((r) =>
    r.slice(1).flatMap((c) => {
      try {
        return [parseNumber(c)]
      } catch {
        return []
      }
    }),
  )
}

function numerosDe(stem: string): number[] {
  return (stem.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).flatMap((bruto) => {
    const v = Number(bruto.replace(/,/g, ''))
    return Number.isFinite(v) ? [v] : []
  })
}

// --- Utilitários -------------------------------------------------------------

function sortear<T>(tentar: () => T | undefined): T {
  for (let i = 0; i < 4000; i++) {
    const r = tentar()
    if (r !== undefined) return r
  }
  throw new Error('não consegui sortear uma tabela que feche a conta')
}

/** `n` inteiros distintos em [min, max]. */
function distintos(rng: Rng, n: number, min: number, max: number): number[] {
  const todos = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return rng.shuffle(todos).slice(0, n)
}

/**
 * `n` valores distintos, múltiplos de `passo`, espremidos numa faixa estreita
 * ao redor de um centro — para que a razão certa não se ache por estimativa.
 */
function colados(rng: Rng, n: number, min: number, max: number, passo: number): number[] {
  const centro = rng.int(min, max)
  const faixa = Math.max(n + 1, Math.round(centro * 0.12))
  const lo = Math.max(1, centro - Math.floor(faixa / 2))
  return distintos(rng, n, lo, lo + faixa).map((v) => v * passo)
}

function argmax(v: number[]): number {
  return v.indexOf(Math.max(...v))
}

function argmin(v: number[]): number {
  return v.indexOf(Math.min(...v))
}

function maximoUnico(v: number[]): boolean {
  const max = Math.max(...v)
  return v.filter((x) => x === max).length === 1
}

/** Índices sem repetição e sem a linha certa, na ordem dada. */
function unicos(indices: number[], certa: number): number[] {
  return [...new Set(indices)].filter((i) => i !== certa)
}

function juntar(itens: string[], e: string): string {
  if (itens.length <= 1) return itens.join('')
  return `${itens.slice(0, -1).join(', ')} ${e} ${itens[itens.length - 1]}`
}

/** Maior passo "redondo" de que o valor é múltiplo: 68,050 → 50; 33.5 → 0.1. */
function grao(v: number): number {
  for (const g of [1000, 500, 100, 50, 10, 5, 1]) {
    if (v >= g * 5 && ehInteiro(v / g)) return g
  }
  return ehInteiro(v) ? 1 : 0.1
}

function arredonda(v: number): number {
  return Math.round(v * 100)
}

function ehInteiro(v: number): boolean {
  return Math.abs(v - Math.round(v)) < 1e-9
}

/** Exato com no máximo uma casa decimal. */
function umaCasa(v: number): boolean {
  return Math.abs(v * 10 - Math.round(v * 10)) < 1e-6
}

function usd(v: number): string {
  return ehInteiro(v) ? `$${formatNumber(v)}` : formatNumber(v, 'currency')
}

function num(v: number): string {
  return formatNumber(v)
}
