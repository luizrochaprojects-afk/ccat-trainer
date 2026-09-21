import { mulberry32, type Rng } from '../rng'
import type { Difficulty } from '../taxonomy'
import { optionIdAt } from '../optionIds'
import { formatNumber, type NumberFormat } from './solver'
import type { MathGenerated, MathGenerator } from './series'

/**
 * Problemas matemáticos por template (PRD §4.10 estendido a math_word).
 *
 * Cada template preenche slots numéricos escolhidos para que a resposta seja
 * exata — nada de dízima, porque na CCAT você resolve de cabeça em 18s e
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
  explanation: string
}

type Template = (rng: Rng, d: Difficulty) => Problema

// --- Aritmética --------------------------------------------------------------

const estoque: Template = (rng) => {
  const porCaixa = rng.int(6, 24)
  const caixas = rng.int(5, 30)
  const despachadas = rng.int(10, porCaixa * caixas - 10)
  const valor = porCaixa * caixas - despachadas

  return {
    stem:
      `Um depósito recebeu ${caixas} caixas com ${porCaixa} unidades cada e ` +
      `despachou ${despachadas} unidades. Quantas unidades restaram?`,
    valor,
    expression: `${caixas}*${porCaixa}-${despachadas}`,
    format: 'plain',
    armadilhas: [
      porCaixa * caixas, // esqueceu de subtrair
      porCaixa * caixas + despachadas, // somou em vez de subtrair
      valor - porCaixa, // errou uma caixa
      caixas * porCaixa - despachadas * 2,
    ],
    explanation:
      `Primeiro o total recebido: ${caixas} × ${porCaixa} = ${formatNumber(caixas * porCaixa)}. ` +
      `Depois tire o que saiu: ${formatNumber(caixas * porCaixa)} − ${formatNumber(despachadas)} = ` +
      `${formatNumber(valor)}. A pegadinha é parar na multiplicação — o enunciado ` +
      `pergunta o que RESTOU, não o que entrou.`,
  }
}

const divisaoIgual: Template = (rng) => {
  const pessoas = rng.int(3, 12)
  const porPessoa = rng.int(4, 40)
  const total = pessoas * porPessoa
  const sobra = rng.int(1, pessoas - 1)

  return {
    stem:
      `${formatNumber(total + sobra)} itens serão divididos igualmente entre ` +
      `${pessoas} pessoas. Quantos itens cada pessoa recebe, e quantos sobram? ` +
      `(informe quantos cada um recebe)`,
    valor: porPessoa,
    expression: `(${total + sobra}-${sobra})/${pessoas}`,
    format: 'plain',
    armadilhas: [porPessoa + 1, porPessoa - 1, sobra, total],
    explanation:
      `${formatNumber(total + sobra)} ÷ ${pessoas} = ${porPessoa} com resto ${sobra}. ` +
      `Cada pessoa fica com ${porPessoa} e sobram ${sobra}. Quando a divisão não é ` +
      `exata, confira o que a pergunta quer: o quociente ou o resto.`,
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
      `A razão entre o número de camisas e o de calças num estoque é ${a}:${b}. ` +
      `Se há ${formatNumber(x)} camisas, quantas calças há?`,
    valor,
    expression: `${x}/${a}*${b}`,
    format: 'plain',
    armadilhas: [
      Math.round((x * a) / b), // inverteu a razão
      x + (b - a) * k,
      valor + b,
      valor - b,
    ],
    explanation:
      `A razão ${a}:${b} significa que para cada ${a} camisas há ${b} calças. ` +
      `${formatNumber(x)} ÷ ${a} = ${k} grupos, e ${k} × ${b} = ${formatNumber(valor)} calças. ` +
      `O erro clássico é inverter e multiplicar por ${a}/${b} — leia qual grandeza ` +
      `vem primeiro na razão.`,
  }
}

const proporcaoDireta: Template = (rng) => {
  const unidades = rng.int(2, 12)
  const custoUnit = rng.pick([3, 4, 5, 6, 8, 10, 12, 15, 20, 25])
  const alvo = rng.int(unidades + 2, unidades + 30)
  const valor = alvo * custoUnit

  return {
    stem:
      `${unidades} peças custam R$ ${formatNumber(unidades * custoUnit)}. ` +
      `Mantendo o mesmo preço unitário, quanto custam ${alvo} peças?`,
    valor,
    expression: `${unidades * custoUnit}/${unidades}*${alvo}`,
    format: 'brl',
    armadilhas: [
      unidades * custoUnit + alvo, // somou em vez de escalar
      valor - custoUnit,
      valor + custoUnit,
      Math.round((unidades * custoUnit * unidades) / alvo),
    ],
    explanation:
      `Preço unitário: R$ ${formatNumber(unidades * custoUnit)} ÷ ${unidades} = ` +
      `R$ ${formatNumber(custoUnit, 'brl').replace('R$ ', '')}. Multiplique por ${alvo}: ` +
      `${formatNumber(valor, 'brl')}. Em proporção direta, sempre ache o valor de UMA ` +
      `unidade antes de escalar.`,
  }
}

// --- Porcentagem -------------------------------------------------------------

const desconto: Template = (rng) => {
  const pct = rng.pick([5, 10, 15, 20, 25, 30, 40, 50])
  const preco = rng.int(2, 40) * 20 // múltiplo de 20 → desconto exato
  const valor = preco * (1 - pct / 100)

  return {
    stem: `Um produto de R$ ${formatNumber(preco)} recebeu ${pct}% de desconto. Qual o preço final?`,
    valor,
    expression: `${preco}-${preco}*${pct}/100`,
    format: 'brl',
    armadilhas: [
      preco * (1 + pct / 100), // somou o desconto
      (preco * pct) / 100, // devolveu só o desconto
      preco - pct, // tratou % como valor absoluto
      valor - 10,
    ],
    explanation:
      `${pct}% de ${formatNumber(preco)} é ${formatNumber((preco * pct) / 100)}. ` +
      `O preço final é ${formatNumber(preco)} − ${formatNumber((preco * pct) / 100)} = ` +
      `${formatNumber(valor, 'brl')}. Atalho: desconto de ${pct}% é pagar ${100 - pct}% — ` +
      `multiplique direto por 0,${String(100 - pct).padStart(2, '0')} e pule uma etapa.`,
  }
}

const aumentoPercentual: Template = (rng) => {
  const pct = rng.pick([10, 20, 25, 50])
  const base = rng.int(2, 50) * 20
  const valor = base * (1 + pct / 100)

  return {
    stem:
      `Uma equipe de ${formatNumber(base)} pessoas cresceu ${pct}%. ` +
      `Quantas pessoas passou a ter?`,
    valor,
    expression: `${base}+${base}*${pct}/100`,
    format: 'plain',
    armadilhas: [base * (1 - pct / 100), (base * pct) / 100, base + pct, valor + base * 0.1],
    explanation:
      `O aumento é ${formatNumber((base * pct) / 100)} pessoas, então o total vira ` +
      `${formatNumber(base)} + ${formatNumber((base * pct) / 100)} = ${formatNumber(valor)}. ` +
      `Crescer ${pct}% é multiplicar por 1,${String(pct).padStart(2, '0')}.`,
  }
}

// --- Taxa --------------------------------------------------------------------

const velocidade: Template = (rng) => {
  const kmPorHora = rng.pick([40, 50, 60, 70, 80, 90, 100, 120])
  const horas = rng.int(2, 8)
  // horasAlvo === horas tornaria a pergunta degenerada: a resposta estaria
  // literalmente escrita no enunciado.
  const horasAlvo = rng.pick(range(2, 12).filter((h) => h !== horas))
  const valor = kmPorHora * horasAlvo

  return {
    stem:
      `Um carro percorre ${formatNumber(kmPorHora * horas)} km em ${horas} horas. ` +
      `Mantendo a mesma velocidade, quantos km percorre em ${horasAlvo} horas?`,
    valor,
    expression: `${kmPorHora * horas}/${horas}*${horasAlvo}`,
    format: 'plain',
    armadilhas: [
      kmPorHora * horas + horasAlvo,
      Math.round((kmPorHora * horas * horas) / horasAlvo),
      valor + kmPorHora,
      valor - kmPorHora,
    ],
    explanation:
      `Velocidade: ${formatNumber(kmPorHora * horas)} ÷ ${horas} = ${kmPorHora} km/h. ` +
      `Em ${horasAlvo} horas: ${kmPorHora} × ${horasAlvo} = ${formatNumber(valor)} km. ` +
      `Problema de taxa sempre passa pela mesma ponte: reduza a uma unidade, depois escale.`,
  }
}

const produtividade: Template = (rng) => {
  const porHora = rng.int(3, 25)
  const trabalhadores = rng.int(2, 10)
  const horas = rng.int(2, 10)
  const valor = porHora * trabalhadores * horas

  return {
    stem:
      `Um operário produz ${porHora} peças por hora. Quantas peças ` +
      `${trabalhadores} operários produzem em ${horas} horas?`,
    valor,
    expression: `${porHora}*${trabalhadores}*${horas}`,
    format: 'plain',
    armadilhas: [
      porHora * trabalhadores, // esqueceu as horas
      porHora * horas, // esqueceu os operários
      porHora + trabalhadores + horas,
      valor - porHora,
    ],
    explanation:
      `${porHora} peças/hora × ${trabalhadores} operários = ` +
      `${formatNumber(porHora * trabalhadores)} peças por hora no total. ` +
      `Em ${horas} horas: ${formatNumber(valor)}. O erro comum é multiplicar só por um ` +
      `dos dois fatores — conte quantas grandezas o enunciado empilha.`,
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
 * enunciado. Acontece por coincidência de slots ("R$ 100 com 50% de desconto"
 * → resposta 50) e faz o candidato acertar de vista, sem resolver nada.
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

/** Números citados num enunciado, já normalizados de pt-BR. */
function numerosDe(stem: string): number[] {
  return (stem.match(/\d[\d.]*(?:,\d+)?/g) ?? []).flatMap((bruto) => {
    const v = Number(bruto.replace(/\./g, '').replace(',', '.'))
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
