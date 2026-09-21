import { mulberry32, type Rng } from '../rng'
import type { Difficulty } from '../taxonomy'
import type { LocalizedText } from '../i18n'
import { optionIdAt } from '../optionIds'
import { formatNumber, type NumberFormat } from './solver'
import type { MathGenerated, MathGenerator } from './series'

/**
 * Problemas matemáticos por template (PRD §4.10 estendido a math_word).
 *
 * Enunciado e alternativas em **inglês** — inclusive os números, que usam
 * separador en-US. A CCAT é aplicada em inglês e ler o problema faz parte do
 * que ela mede; um enunciado em português treinaria outra coisa. As explicações
 * vêm nos dois idiomas (ver core/i18n.ts).
 *
 * Cada template preenche slots numéricos escolhidos para que a resposta seja
 * exata — nada de dízima, porque na prova você resolve de cabeça em 18s e
 * alternativa com arredondamento vira loteria.
 *
 * Os distratores são os **erros reais** do problema (esquecer de subtrair,
 * somar o desconto em vez de descontar, inverter a razão). Distrator aleatório
 * é eliminável de olho e não treina nada.
 */

interface Problema {
  stem: string
  /** valor correto */
  valor: number
  /** forma fechada, avaliada pelo gate por caminho independente */
  expression: string
  format: NumberFormat
  /** erros clássicos, na ordem de plausibilidade */
  armadilhas: number[]
  explanation: LocalizedText
}

type Template = (rng: Rng, d: Difficulty) => Problema

// --- Aritmética --------------------------------------------------------------

const estoque: Template = (rng) => {
  const porCaixa = rng.int(6, 24)
  const caixas = rng.int(5, 30)
  const despachadas = rng.int(10, porCaixa * caixas - 10)
  const recebido = porCaixa * caixas
  const valor = recebido - despachadas

  return {
    stem:
      `A warehouse received ${caixas} boxes of ${porCaixa} units each and shipped out ` +
      `${despachadas} units. How many units are left?`,
    valor,
    expression: `${caixas}*${porCaixa}-${despachadas}`,
    format: 'plain',
    armadilhas: [
      recebido, // esqueceu de subtrair
      recebido + despachadas, // somou em vez de subtrair
      valor - porCaixa, // errou uma caixa
      recebido - despachadas * 2,
    ],
    explanation: {
      pt:
        `Primeiro o total recebido: ${caixas} × ${porCaixa} = ${formatNumber(recebido)}. ` +
        `Depois tire o que saiu: ${formatNumber(recebido)} − ${formatNumber(despachadas)} = ` +
        `${formatNumber(valor)}. A pegadinha é parar na multiplicação — o enunciado ` +
        `pergunta o que RESTOU, não o que entrou.`,
      en:
        `First the total received: ${caixas} × ${porCaixa} = ${formatNumber(recebido)}. ` +
        `Then subtract what left: ${formatNumber(recebido)} − ${formatNumber(despachadas)} = ` +
        `${formatNumber(valor)}. The trap is stopping at the multiplication — the question ` +
        `asks what is LEFT, not what came in.`,
    },
  }
}

const divisaoIgual: Template = (rng) => {
  const pessoas = rng.int(3, 12)
  const porPessoa = rng.int(4, 40)
  const total = pessoas * porPessoa
  const sobra = rng.int(1, pessoas - 1)

  return {
    stem:
      `${formatNumber(total + sobra)} items are divided equally among ${pessoas} people. ` +
      `How many items does each person receive?`,
    valor: porPessoa,
    expression: `(${total + sobra}-${sobra})/${pessoas}`,
    format: 'plain',
    armadilhas: [porPessoa + 1, porPessoa - 1, sobra, total],
    explanation: {
      pt:
        `${formatNumber(total + sobra)} ÷ ${pessoas} = ${porPessoa} com resto ${sobra}. ` +
        `Cada pessoa fica com ${porPessoa} e sobram ${sobra}. Quando a divisão não é ` +
        `exata, confira o que a pergunta quer: o quociente ou o resto.`,
      en:
        `${formatNumber(total + sobra)} ÷ ${pessoas} = ${porPessoa} remainder ${sobra}. ` +
        `Each person receives ${porPessoa} and ${sobra} are left over. When the division is ` +
        `not exact, check which one the question wants: the quotient or the remainder.`,
    },
  }
}

// --- Razão e proporção -------------------------------------------------------

const razaoSimples: Template = (rng) => {
  const a = rng.int(2, 9)
  const b = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 11, 12].filter((v) => v !== a))
  const k = rng.int(3, 20)
  const x = a * k
  const valor = b * k

  return {
    stem:
      `The ratio of shirts to trousers in a stockroom is ${a}:${b}. If there are ` +
      `${formatNumber(x)} shirts, how many trousers are there?`,
    valor,
    expression: `${x}/${a}*${b}`,
    format: 'plain',
    armadilhas: [Math.round((x * a) / b), x + (b - a) * k, valor + b, valor - b],
    explanation: {
      pt:
        `A razão ${a}:${b} significa que para cada ${a} camisas há ${b} calças. ` +
        `${formatNumber(x)} ÷ ${a} = ${k} grupos, e ${k} × ${b} = ${formatNumber(valor)}. ` +
        `O erro clássico é inverter e multiplicar por ${a}/${b} — leia qual grandeza ` +
        `vem primeiro na razão.`,
      en:
        `A ratio of ${a}:${b} means that for every ${a} shirts there are ${b} trousers. ` +
        `${formatNumber(x)} ÷ ${a} = ${k} groups, and ${k} × ${b} = ${formatNumber(valor)}. ` +
        `The classic mistake is flipping it and multiplying by ${a}/${b} — read which ` +
        `quantity comes first in the ratio.`,
    },
  }
}

const proporcaoDireta: Template = (rng) => {
  const unidades = rng.int(2, 12)
  const custoUnit = rng.pick([3, 4, 5, 6, 8, 10, 12, 15, 20, 25])
  const alvo = rng.int(unidades + 2, unidades + 30)
  const precoBase = unidades * custoUnit
  const valor = alvo * custoUnit

  return {
    stem:
      `${unidades} parts cost ${formatNumber(precoBase, 'currency')}. At the same unit ` +
      `price, how much do ${alvo} parts cost?`,
    valor,
    expression: `${precoBase}/${unidades}*${alvo}`,
    format: 'currency',
    armadilhas: [
      precoBase + alvo, // somou em vez de escalar
      valor - custoUnit,
      valor + custoUnit,
      Math.round((precoBase * unidades) / alvo),
    ],
    explanation: {
      pt:
        `Preço unitário: ${formatNumber(precoBase, 'currency')} ÷ ${unidades} = ` +
        `${formatNumber(custoUnit, 'currency')}. Multiplique por ${alvo}: ` +
        `${formatNumber(valor, 'currency')}. Em proporção direta, sempre ache o valor de ` +
        `UMA unidade antes de escalar.`,
      en:
        `Unit price: ${formatNumber(precoBase, 'currency')} ÷ ${unidades} = ` +
        `${formatNumber(custoUnit, 'currency')}. Multiply by ${alvo}: ` +
        `${formatNumber(valor, 'currency')}. In direct proportion, always find the price of ` +
        `ONE unit before scaling.`,
    },
  }
}

// --- Porcentagem -------------------------------------------------------------

const desconto: Template = (rng) => {
  const pct = rng.pick([5, 10, 15, 20, 25, 30, 40, 50])
  const preco = rng.int(2, 40) * 20 // múltiplo de 20 → desconto exato
  const corte = (preco * pct) / 100
  const valor = preco - corte

  return {
    stem:
      `An item priced at ${formatNumber(preco, 'currency')} is discounted by ${pct}%. ` +
      `What is the final price?`,
    valor,
    expression: `${preco}-${preco}*${pct}/100`,
    format: 'currency',
    armadilhas: [
      preco + corte, // somou o desconto
      corte, // devolveu só o desconto
      preco - pct, // tratou % como valor absoluto
      valor - 10,
    ],
    explanation: {
      pt:
        `${pct}% de ${formatNumber(preco)} é ${formatNumber(corte)}. O preço final é ` +
        `${formatNumber(preco)} − ${formatNumber(corte)} = ${formatNumber(valor, 'currency')}. ` +
        `Atalho: desconto de ${pct}% é pagar ${100 - pct}% — multiplique direto por ` +
        `0.${String(100 - pct).padStart(2, '0')} e pule uma etapa.`,
      en:
        `${pct}% of ${formatNumber(preco)} is ${formatNumber(corte)}. The final price is ` +
        `${formatNumber(preco)} − ${formatNumber(corte)} = ${formatNumber(valor, 'currency')}. ` +
        `Shortcut: a ${pct}% discount means paying ${100 - pct}% — multiply straight by ` +
        `0.${String(100 - pct).padStart(2, '0')} and skip a step.`,
    },
  }
}

const aumentoPercentual: Template = (rng) => {
  const pct = rng.pick([10, 20, 25, 50])
  const base = rng.int(2, 50) * 20
  const acrescimo = (base * pct) / 100
  const valor = base + acrescimo

  return {
    stem:
      `A team of ${formatNumber(base)} people grew by ${pct}%. How many people does it ` +
      `have now?`,
    valor,
    expression: `${base}+${base}*${pct}/100`,
    format: 'plain',
    armadilhas: [base - acrescimo, acrescimo, base + pct, valor + base * 0.1],
    explanation: {
      pt:
        `O aumento é de ${formatNumber(acrescimo)} pessoas, então o total vira ` +
        `${formatNumber(base)} + ${formatNumber(acrescimo)} = ${formatNumber(valor)}. ` +
        `Crescer ${pct}% é multiplicar por 1.${String(pct).padStart(2, '0')}.`,
      en:
        `The increase is ${formatNumber(acrescimo)} people, so the total becomes ` +
        `${formatNumber(base)} + ${formatNumber(acrescimo)} = ${formatNumber(valor)}. ` +
        `Growing by ${pct}% means multiplying by 1.${String(pct).padStart(2, '0')}.`,
    },
  }
}

// --- Taxa --------------------------------------------------------------------

const velocidade: Template = (rng) => {
  const kmPorHora = rng.pick([40, 50, 60, 70, 80, 90, 100, 120])
  const horas = rng.int(2, 8)
  // horasAlvo === horas tornaria a pergunta degenerada: a resposta estaria
  // literalmente escrita no enunciado.
  const horasAlvo = rng.pick(range(2, 12).filter((h) => h !== horas))
  const percorrido = kmPorHora * horas
  const valor = kmPorHora * horasAlvo

  return {
    stem:
      `A car travels ${formatNumber(percorrido)} km in ${horas} hours. At the same speed, ` +
      `how many km does it travel in ${horasAlvo} hours?`,
    valor,
    expression: `${percorrido}/${horas}*${horasAlvo}`,
    format: 'plain',
    armadilhas: [
      percorrido + horasAlvo,
      Math.round((percorrido * horas) / horasAlvo),
      valor + kmPorHora,
      valor - kmPorHora,
    ],
    explanation: {
      pt:
        `Velocidade: ${formatNumber(percorrido)} ÷ ${horas} = ${kmPorHora} km/h. Em ` +
        `${horasAlvo} horas: ${kmPorHora} × ${horasAlvo} = ${formatNumber(valor)} km. ` +
        `Problema de taxa sempre passa pela mesma ponte: reduza a uma unidade, depois escale.`,
      en:
        `Speed: ${formatNumber(percorrido)} ÷ ${horas} = ${kmPorHora} km/h. In ${horasAlvo} ` +
        `hours: ${kmPorHora} × ${horasAlvo} = ${formatNumber(valor)} km. Every rate problem ` +
        `crosses the same bridge: reduce to one unit, then scale up.`,
    },
  }
}

const produtividade: Template = (rng) => {
  const porHora = rng.int(3, 25)
  const trabalhadores = rng.int(2, 10)
  const horas = rng.int(2, 10)
  const porHoraTotal = porHora * trabalhadores
  const valor = porHoraTotal * horas

  return {
    stem:
      `One worker makes ${porHora} parts per hour. How many parts do ${trabalhadores} ` +
      `workers make in ${horas} hours?`,
    valor,
    expression: `${porHora}*${trabalhadores}*${horas}`,
    format: 'plain',
    armadilhas: [
      porHoraTotal, // esqueceu as horas
      porHora * horas, // esqueceu os trabalhadores
      porHora + trabalhadores + horas,
      valor - porHora,
    ],
    explanation: {
      pt:
        `${porHora} peças/hora × ${trabalhadores} operários = ${formatNumber(porHoraTotal)} ` +
        `peças por hora no total. Em ${horas} horas: ${formatNumber(valor)}. O erro comum é ` +
        `multiplicar só por um dos dois fatores — conte quantas grandezas o enunciado empilha.`,
      en:
        `${porHora} parts/hour × ${trabalhadores} workers = ${formatNumber(porHoraTotal)} ` +
        `parts per hour in total. Over ${horas} hours: ${formatNumber(valor)}. The common ` +
        `mistake is multiplying by only one of the two factors — count how many quantities ` +
        `the problem stacks up.`,
    },
  }
}

// --- Registro ----------------------------------------------------------------

const TEMPLATES: Record<string, Template[]> = {
  aritmetica: [estoque, divisaoIgual],
  razao_proporcao: [razaoSimples, proporcaoDireta],
  porcentagem: [desconto, aumentoPercentual],
  taxa: [velocidade, produtividade],
}

function criar(subtipo: string): MathGenerator {
  return (seed, difficulty) => {
    const rng = mulberry32(seed)
    const templates = TEMPLATES[subtipo] as Template[]
    const problema = semVazamento(() => rng.pick(templates)(rng, difficulty), subtipo)
    return montar(rng, subtipo, problema, difficulty)
  }
}

/**
 * Descarta o problema se o valor da resposta aparece entre os números do
 * enunciado. Acontece por coincidência de slots ("$100 discounted by 50%" →
 * resposta 50) e faz o candidato acertar de vista, sem resolver nada.
 */
function semVazamento(build: () => Problema, subtipo: string): Problema {
  for (let tentativa = 0; tentativa < 80; tentativa++) {
    const problema = build()
    if (!numerosDe(problema.stem).some((n) => Math.abs(n - problema.valor) < 0.005)) {
      return problema
    }
  }
  throw new Error(`não consegui montar ${subtipo} sem vazar a resposta no enunciado`)
}

/** Números citados num enunciado, no formato en-US (1,234.50). */
function numerosDe(stem: string): number[] {
  return (stem.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).flatMap((bruto) => {
    const v = Number(bruto.replace(/,/g, ''))
    return Number.isFinite(v) ? [v] : []
  })
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

export const WORD_GENERATORS = {
  aritmetica: criar('aritmetica'),
  razao_proporcao: criar('razao_proporcao'),
  porcentagem: criar('porcentagem'),
  taxa: criar('taxa'),
} as const satisfies Record<string, MathGenerator>

export type WordGeneratorId = keyof typeof WORD_GENERATORS
export const WORD_GENERATOR_IDS = Object.keys(WORD_GENERATORS) as WordGeneratorId[]

// --- Montagem ----------------------------------------------------------------

function montar(
  rng: Rng,
  subtipo: string,
  problema: Problema,
  difficulty: Difficulty,
): MathGenerated {
  const quantidade = difficulty <= 2 ? 4 : 5
  const valores = [problema.valor]
  const vistos = new Set([arredonda(problema.valor)])

  for (const armadilha of problema.armadilhas) {
    if (valores.length >= quantidade) break
    if (!Number.isFinite(armadilha) || armadilha < 0) continue
    const chave = arredonda(armadilha)
    if (vistos.has(chave)) continue
    vistos.add(chave)
    valores.push(armadilha)
  }

  // Rede de segurança: as armadilhas podem colidir entre si dependendo dos slots.
  let passo = 1
  while (valores.length < quantidade) {
    const c = problema.valor * (1 + 0.07 * passo * (passo % 2 === 0 ? 1 : -1))
    const candidato = Math.max(1, Math.round(c))
    if (!vistos.has(arredonda(candidato))) {
      vistos.add(arredonda(candidato))
      valores.push(candidato)
    }
    passo++
    if (passo > 60) throw new Error(`não consegui montar distratores para ${subtipo}`)
  }

  const embaralhados = rng.shuffle(valores.map((v, i) => ({ v, isCorrect: i === 0 })))
  const options = embaralhados.map((o, i) => ({
    id: optionIdAt(i) as string,
    text: formatNumber(o.v, problema.format),
  }))
  const answerIndex = embaralhados.findIndex((o) => o.isCorrect)

  return {
    subtipo,
    stem: problema.stem,
    options,
    answerId: optionIdAt(answerIndex) as string,
    explanation: problema.explanation,
    expression: problema.expression,
    answerValue: problema.valor,
  }
}

/** Compara valores pelo que será EXIBIDO (2 casas), não pelo float cru. */
function arredonda(v: number): number {
  return Math.round(v * 100)
}
