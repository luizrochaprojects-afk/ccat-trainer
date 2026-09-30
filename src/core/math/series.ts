import { mulberry32, type Rng } from '../rng'
import { OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import { optionIdAt } from '../optionIds'
import { formatNumber } from './solver'
import type { LocalizedText } from '../i18n'
import { normalizeText } from '../schema'

/**
 * Séries numéricas geradas por regra (PRD §4.10 estendido a math_series).
 *
 * Mesmo contrato dos espaciais: a resposta sai da regra que construiu a série,
 * não de um julgamento posterior. Além disso cada questão carrega a
 * `expression` — a forma fechada do próximo termo — que o gate avalia por um
 * caminho independente do gerador.
 *
 * Nenhum nível tem progressão de diferença constante. É a primeira hipótese que
 * qualquer pessoa testa, então a questão se resolve sem reconhecer padrão
 * nenhum — e a CCAT real não gasta item com isso. O nível 1 já pede uma regra
 * não linear (diferença que cresce, dobro, quadrados); daí para cima o que
 * cresce é a sutileza da regra, não o tamanho dos números.
 */

export interface MathGenerated {
  subtipo: string
  stem: string
  options: { id: string; text: string }[]
  answerId: string
  explanation: LocalizedText
  /** forma fechada do valor correto, avaliada pelo gate (gate G2, método 'solver') */
  expression: string
  answerValue: number
  /** família da regra que montou a série; rótulo para teste e análise, fora do contrato do gate */
  familia?: string
}

export type MathGenerator = (seed: number, difficulty: Difficulty) => MathGenerated

interface Regra {
  familia: string
  /** termos exibidos */
  terms: number[]
  next: number
  expression: string
  explanation: LocalizedText
  /**
   * Continuações erradas que saem de quem entendeu a regra pela metade: usou a
   * outra série trançada, repetiu o último passo, esqueceu o deslocamento.
   * Viram os distratores prioritários.
   */
  erros: number[]
}

/** Devolve null quando o sorteio caiu num caso degenerado; aí se sorteia de novo. */
type Familia = (rng: Rng) => Regra | null


// --- Série simples -----------------------------------------------------------

export const gerarSerieSimples: MathGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const regra = sortear(() => rng.pick(FAMILIAS_SIMPLES[difficulty])(rng))
  return montar(rng, 'serie_simples', regra, difficulty)
}

/**
 * t(i) = a0 + i·d0 + c·i(i-1)/2: a diferença entre vizinhos anda de c em c.
 *
 * Serve do nível 1 (diferença que cresce de 1 em 1) ao 4 (diferenças que
 * aceleram para baixo e levam a série abaixo de zero); o que muda por nível é
 * a faixa dos parâmetros, não a regra.
 */
function segundaOrdem(familia: string, a0: number, d0: number, c: number): Regra | null {
  const terms = seq(5, (i) => a0 + i * d0 + (c * i * (i - 1)) / 2)
  const difs = diferencas(terms)
  // diferença zero repete o termo vizinho e a série fica com cara de erro de digitação
  if (c === 0 || difs.includes(0)) return null

  const ultimo = terms[4] as number
  const proxDif = d0 + 4 * c
  const next = ultimo + proxDif
  const direcao = c > 0 ? { pt: 'aumentam', en: 'grow' } : { pt: 'diminuem', en: 'drop' }

  return {
    familia,
    terms,
    next,
    expression: `${a0}+5*(${d0})+10*(${c})`,
    erros: [
      ultimo + proxDif + c, // pulou uma diferença
      ultimo + 2 * (difs[3] as number), // achou que a diferença dobrava
    ],
    explanation: {
      pt:
        `As diferenças entre vizinhos são ${difs.map(sinal).join(', ')}: elas mesmas ` +
        `${direcao.pt} ${Math.abs(c)} a cada passo. A próxima diferença é ${sinal(proxDif)}, ` +
        `então ${conta(ultimo, proxDif)} = ${fmt(next)}. Quando a diferença não é constante, ` +
        `calcule a diferença das diferenças — se ela for constante, a regra está ali.`,
      en:
        `The gaps between neighbours are ${difs.map(sinal).join(', ')}: they themselves ` +
        `${direcao.en} by ${Math.abs(c)} each step. The next gap is ${sinal(proxDif)}, so ` +
        `${conta(ultimo, proxDif)} = ${fmt(next)}. When the gap is not constant, take the ` +
        `difference of the differences — if that is constant, the rule is right there.`,
    },
  }
}

/**
 * Multiplica pela mesma razão a cada passo. A razão pode ser negativa (sinal
 * alterna), 3/2 ou 1/2 — as duas últimas são as únicas famílias com decimal na
 * resposta, e ficam no nível 5.
 */
function geometrica(familia: string, a0: number, r: number): Regra {
  const terms = [a0]
  for (let i = 1; i < 5; i++) terms.push((terms[i - 1] as number) * r)
  const ultimo = terms[4] as number
  const penultimo = terms[3] as number
  const next = ultimo * r

  const dica = {
    pt:
      'Quando a diferença cresce rápido demais para ser soma, divida um termo pelo ' +
      'anterior: se o quociente é sempre o mesmo, a série é geométrica.',
    en:
      'When the gap grows too fast to be a sum, divide one term by the previous one: if the ' +
      'quotient is always the same, the series is geometric.',
  }

  if (r === 1.5) {
    return {
      familia,
      terms,
      next,
      expression: `${ultimo}*3/2`,
      erros: [ultimo + (ultimo - penultimo), ultimo * 2, Math.floor(next), Math.ceil(next)],
      explanation: {
        pt:
          `Cada termo é o anterior multiplicado por 3/2 — soma-se a metade dele: ` +
          `${fmt(ultimo)} + ${fmt(ultimo / 2)} = ${fmt(next)}. A razão não precisa ser ` +
          `inteira: ${fmt(terms[1] as number)} ÷ ${fmt(a0)} = 1.5, e o mesmo vale para os ` +
          `demais. Resposta decimal é legítima — não arredonde.`,
        en:
          `Each term is the previous one multiplied by 3/2 — add half of it: ` +
          `${fmt(ultimo)} + ${fmt(ultimo / 2)} = ${fmt(next)}. The ratio need not be a whole ` +
          `number: ${fmt(terms[1] as number)} ÷ ${fmt(a0)} = 1.5, and the same holds for the ` +
          `rest. A decimal answer is legitimate — do not round it.`,
      },
    }
  }

  if (r === 0.5) {
    return {
      familia,
      terms,
      next,
      expression: `${ultimo}/2`,
      erros: [
        Math.floor(next * 2) / 2, // arredondou para meio
        Math.ceil(next * 2) / 2,
        next + 0.5,
        next - 0.5,
      ],
      explanation: {
        pt:
          `Cada termo é a metade do anterior, e a série não para quando sai dos inteiros: ` +
          `${fmt(ultimo)} ÷ 2 = ${fmt(next)}. Resposta decimal é legítima — não arredonde.`,
        en:
          `Each term is half of the previous one, and the series does not stop when it leaves ` +
          `the whole numbers: ${fmt(ultimo)} ÷ 2 = ${fmt(next)}. A decimal answer is ` +
          `legitimate — do not round it.`,
      },
    }
  }

  if (r < 0) {
    return {
      familia,
      terms,
      next,
      expression: `${ultimo}*(${r})`,
      erros: [ultimo * (r - 1)], // errou o tamanho da razão
      explanation: {
        pt:
          `Cada termo é o anterior multiplicado por ${r} — por isso o sinal alterna a cada ` +
          `passo: ${fmt(ultimo)} × (${r}) = ${fmt(next)}. Série que troca de sinal termo a ` +
          `termo quase sempre tem razão negativa: divida um termo pelo anterior e confira.`,
        en:
          `Each term is the previous one multiplied by ${r} — which is why the sign flips at ` +
          `every step: ${fmt(ultimo)} × (${r}) = ${fmt(next)}. A series that changes sign ` +
          `term by term almost always has a negative ratio: divide one term by the previous ` +
          `one and check.`,
      },
    }
  }

  return {
    familia,
    terms,
    next,
    expression: `${ultimo}*${r}`,
    erros: [ultimo * (r + 1), ultimo * (r - 1)],
    explanation: {
      pt:
        `Cada termo é o anterior multiplicado por ${r}: ${fmt(ultimo)} × ${r} = ` +
        `${fmt(next)}. ${dica.pt}`,
      en:
        `Each term is the previous one multiplied by ${r}: ${fmt(ultimo)} × ${r} = ` +
        `${fmt(next)}. ${dica.en}`,
    },
  }
}

/** Geométrica descendente com resposta inteira: m·rⁿ, …, m·r → m. */
function divisao(familia: string, m: number, r: number): Regra {
  const terms = seq(5, (i) => m * r ** (5 - i))
  const ultimo = terms[4] as number
  return {
    familia,
    terms,
    next: m,
    expression: `${ultimo}/${r}`,
    erros: [ultimo - r, Math.round(ultimo / (r + 1))],
    explanation: {
      pt:
        `Cada termo é o anterior dividido por ${r}: ${fmt(ultimo)} ÷ ${r} = ${fmt(m)}. ` +
        `Série que encolhe cada vez menos é sinal de divisão, não de subtração: divida um ` +
        `termo pelo seguinte e confira se dá sempre ${r}.`,
      en:
        `Each term is the previous one divided by ${r}: ${fmt(ultimo)} ÷ ${r} = ${fmt(m)}. ` +
        `A series that shrinks by less and less is a sign of division, not subtraction: ` +
        `divide one term by the next and check that you always get ${r}.`,
    },
  }
}

function fibonacci(familia: string, a0: number, a1: number): Regra {
  const terms = [a0, a1]
  for (let i = 2; i < 5; i++) {
    terms.push((terms[i - 1] as number) + (terms[i - 2] as number))
  }
  const next = (terms[4] as number) + (terms[3] as number)
  return {
    familia,
    terms,
    next,
    expression: `${terms[4]}+${terms[3]}`,
    erros: [
      (terms[4] as number) + (terms[2] as number), // somou o termo errado
      (terms[4] as number) * 2,
    ],
    explanation: {
      pt:
        `Cada termo é a soma dos dois anteriores (${terms[2]} = ${terms[0]} + ${terms[1]}, ` +
        `e assim por diante): ${terms[3]} + ${terms[4]} = ${fmt(next)}. Quando nem diferença ` +
        `nem razão são constantes, o próximo teste é somar os dois termos anteriores — é o ` +
        `padrão de Fibonacci.`,
      en:
        `Each term is the sum of the two before it (${terms[2]} = ${terms[0]} + ${terms[1]}, ` +
        `and so on): ${terms[3]} + ${terms[4]} = ${fmt(next)}. When neither the difference ` +
        `nor the ratio is constant, the next test is adding the two previous terms — that is ` +
        `the Fibonacci pattern.`,
    },
  }
}

/**
 * Cada termo é a soma dos TRÊS anteriores. Mostra seis termos, senão a regra
 * fecharia só duas vezes e não daria para distinguir de coincidência.
 */
function tribonacci(familia: string, a: number, b: number, c: number): Regra {
  const terms = [a, b, c]
  for (let i = 3; i < 6; i++) {
    terms.push((terms[i - 1] as number) + (terms[i - 2] as number) + (terms[i - 3] as number))
  }
  const [, , t2, t3, t4, t5] = terms as [number, number, number, number, number, number]
  const next = t3 + t4 + t5
  return {
    familia,
    terms,
    next,
    expression: `${t3}+${t4}+${t5}`,
    erros: [
      t4 + t5, // parou em Fibonacci
      t2 + t4 + t5, // pegou o trio errado
    ],
    explanation: {
      pt:
        `Cada termo é a soma dos TRÊS anteriores (${t3} = ${a} + ${b} + ${c}, ` +
        `${t4} = ${b} + ${c} + ${t3}…): ${t3} + ${t4} + ${t5} = ${fmt(next)}. Se somar os ` +
        `dois anteriores quase dá certo mas sempre falta um pedaço, teste somar três.`,
      en:
        `Each term is the sum of the THREE before it (${t3} = ${a} + ${b} + ${c}, ` +
        `${t4} = ${b} + ${c} + ${t3}…): ${t3} + ${t4} + ${t5} = ${fmt(next)}. If adding the ` +
        `two previous terms almost works but always falls short, try adding three.`,
    },
  }
}

/** (s+i)^p + k — quadrados ou cubos consecutivos, com ou sem deslocamento fixo. */
function potencias(familia: string, s: number, p: 2 | 3, k: number): Regra {
  const terms = seq(5, (i) => (s + i) ** p + k)
  const n = s + 5
  const next = n ** p + k
  const exp = p === 2 ? '²' : '³'
  const nome = p === 2 ? { pt: 'quadrados', en: 'squares' } : { pt: 'cubos', en: 'cubes' }
  const base = `${s}${exp}, ${s + 1}${exp}, ${s + 2}${exp}…`
  const desloc = k === 0 ? '' : ` ${k > 0 ? '+' : '-'} ${Math.abs(k)}`
  const potencia = p === 2 ? `(${n})*(${n})` : `(${n})*(${n})*(${n})`

  const dica =
    p === 2
      ? {
          pt: 'Diferenças que crescem de 2 em 2 denunciam quadrados.',
          en: 'Gaps that grow by 2 each time give squares away.',
        }
      : {
          pt:
            'Cubos crescem rápido e a diferença das diferenças ainda não fecha: reconheça ' +
            '8, 27, 64, 125, 216 de cabeça.',
          en:
            'Cubes grow fast and even the difference of the differences does not settle: ' +
            'know 8, 27, 64, 125, 216 by heart.',
        }

  return {
    familia,
    terms,
    next,
    expression: `${potencia}+(${k})`,
    erros: [
      ...(k !== 0 ? [n ** p] : []), // esqueceu o deslocamento
      next + 2,
    ],
    explanation: {
      pt:
        (k === 0
          ? `São ${nome.pt} perfeitos consecutivos: ${base} `
          : `Cada termo é um dos ${nome.pt} perfeitos consecutivos (${base}) ` +
            `${k > 0 ? 'mais' : 'menos'} ${Math.abs(k)}. `) +
        `O próximo é ${n}${exp}${desloc} = ${fmt(next)}. ${dica.pt}` +
        (k !== 0 ? ' Se os termos ficam colados em potências conhecidas, teste um deslocamento fixo.' : ''),
      en:
        (k === 0
          ? `These are consecutive perfect ${nome.en}: ${base} `
          : `Each term is one of the consecutive perfect ${nome.en} (${base}) ` +
            `${k > 0 ? 'plus' : 'minus'} ${Math.abs(k)}. `) +
        `The next one is ${n}${exp}${desloc} = ${fmt(next)}. ${dica.en}` +
        (k !== 0 ? ' If the terms sit right next to familiar powers, test a fixed offset.' : ''),
    },
  }
}

/** n·(n+m): 6, 12, 20, 30, 42 → 56 é n² + n. */
function produtoConsecutivo(familia: string, s: number, m: number): Regra {
  const terms = seq(5, (i) => (s + i) * (s + i + m))
  const n = s + 5
  const next = n * (n + m)
  const formula = m === 1 ? 'n² + n' : `n² + ${m}n`
  const t = (i: number) => `${s + i}×${s + i + m}`
  return {
    familia,
    terms,
    next,
    expression: `${n}*${n + m}`,
    erros: [n * n, n * (n + m + 1), (n - 1) * (n + m)],
    explanation: {
      pt:
        `Cada termo é o produto de dois números ${m === 1 ? 'consecutivos' : `que distam ${m}`}: ` +
        `${t(0)} = ${terms[0]}, ${t(1)} = ${terms[1]}, ${t(2)} = ${terms[2]}… O próximo é ` +
        `${n}×${n + m} = ${fmt(next)} — ou seja, ${formula}. As diferenças também crescem de ` +
        `2 em 2, então dá para chegar lá pela diferença das diferenças.`,
      en:
        `Each term is the product of two numbers ${m === 1 ? 'in a row' : `${m} apart`}: ` +
        `${t(0)} = ${terms[0]}, ${t(1)} = ${terms[1]}, ${t(2)} = ${terms[2]}… The next one is ` +
        `${n}×${n + m} = ${fmt(next)} — that is, ${formula}. The gaps also grow by 2 each ` +
        `time, so the difference of the differences gets you there too.`,
    },
  }
}

/** As diferenças formam, elas mesmas, uma geométrica de razão r (r pode ser negativa). */
function diferencasGeometricas(familia: string, a0: number, d: number, r: number): Regra {
  const terms = [a0]
  for (let i = 0; i < 4; i++) terms.push((terms[i] as number) + d * r ** i)
  const difs = diferencas(terms)
  const ultimo = terms[4] as number
  const ultimaDif = difs[3] as number
  const proxDif = d * r ** 4
  const next = ultimo + proxDif

  const razao =
    r < 0
      ? {
          pt: `a anterior × (${r}) — o tamanho ${r === -2 ? 'dobra' : 'triplica'} e o sinal troca`,
          en: `the previous one × (${r}) — the size ${r === -2 ? 'doubles' : 'triples'} and the sign flips`,
        }
      : {
          pt: r === 2 ? 'o dobro da anterior' : 'o triplo da anterior',
          en: r === 2 ? 'double the previous one' : 'triple the previous one',
        }
  const dica =
    r < 0
      ? {
          pt: 'Série que sobe e desce com saltos cada vez maiores: separe o sinal do tamanho da diferença.',
          en: 'A series that rises and falls in ever bigger jumps: separate the sign from the size of the gap.',
        }
      : {
          pt: 'Quando a diferença das diferenças também não fecha, divida uma diferença pela anterior.',
          en: 'When the difference of the differences does not settle either, divide one gap by the previous one.',
        }

  return {
    familia,
    terms,
    next,
    expression: `${ultimo}+(${d})${`*(${r})`.repeat(4)}`,
    erros: [
      ...(r < 0 ? [ultimo - proxDif] : []), // acertou o tamanho, errou o sinal
      ultimo + ultimaDif * (r + 1),
      ultimo + ultimaDif * (r - 1),
    ],
    explanation: {
      pt:
        `As diferenças são ${difs.map(sinal).join(', ')}: cada uma é ${razao.pt}. A próxima é ` +
        `${sinal(proxDif)}, então ${conta(ultimo, proxDif)} = ${fmt(next)}. ${dica.pt}`,
      en:
        `The gaps are ${difs.map(sinal).join(', ')}: each is ${razao.en}. The next one is ` +
        `${sinal(proxDif)}, so ${conta(ultimo, proxDif)} = ${fmt(next)}. ${dica.en}`,
    },
  }
}

/** t(i+1) = r·t(i) + c — "multiplica e ajusta". */
function afim(familia: string, a0: number, r: number, c: number): Regra | null {
  // precisa crescer; no ponto fixo a série fica parada
  if (a0 * (r - 1) + c <= 0) return null
  const terms = [a0]
  for (let i = 1; i < 5; i++) terms.push((terms[i - 1] as number) * r + c)
  const ultimo = terms[4] as number
  const next = ultimo * r + c
  const ajuste = `${c > 0 ? '+' : '-'} ${Math.abs(c)}`
  const passo = (x: number) => `${fmt(x)} × ${r} ${ajuste}`

  return {
    familia,
    terms,
    next,
    expression: `${ultimo}*${r}+(${c})`,
    erros: [
      ultimo * r, // esqueceu o ajuste
      ultimo * r - c, // ajuste com o sinal trocado
      ultimo * r + 2 * c,
    ],
    explanation: {
      pt:
        `Cada termo é o anterior × ${r} ${ajuste}: ${passo(a0)} = ${terms[1]}, ` +
        `${passo(terms[1] as number)} = ${terms[2]}… Então ${passo(ultimo)} = ${fmt(next)}. ` +
        `Quando a razão entre vizinhos fica quase constante mas nunca fecha, teste ` +
        `"multiplica e ajusta".`,
      en:
        `Each term is the previous one × ${r} ${ajuste}: ${passo(a0)} = ${terms[1]}, ` +
        `${passo(terms[1] as number)} = ${terms[2]}… So ${passo(ultimo)} = ${fmt(next)}. ` +
        `When the ratio between neighbours is almost constant but never quite closes, test ` +
        `"multiply, then adjust".`,
    },
  }
}

/** ×m0, ×(m0+1), ×(m0+2)… — o multiplicador cresce de 1 em 1. */
function multiplicadorCrescente(familia: string, a0: number, m0: number): Regra {
  const terms = [a0]
  for (let i = 1; i < 5; i++) terms.push((terms[i - 1] as number) * (m0 + i - 1))
  const ultimo = terms[4] as number
  const m = m0 + 4
  const next = ultimo * m
  const fatores = [0, 1, 2, 3].map((i) => `×${m0 + i}`).join(', ')
  return {
    familia,
    terms,
    next,
    expression: `${ultimo}*${m}`,
    erros: [ultimo * (m - 1), ultimo * (m + 1)],
    explanation: {
      pt:
        `O multiplicador cresce a cada passo: ${fatores}. O próximo é ×${m}: ` +
        `${fmt(ultimo)} × ${m} = ${fmt(next)}. Divida cada termo pelo anterior — quando o ` +
        `quociente muda de forma regular, a regra está no quociente.`,
      en:
        `The multiplier grows at every step: ${fatores}. The next one is ×${m}: ` +
        `${fmt(ultimo)} × ${m} = ${fmt(next)}. Divide each term by the previous one — when ` +
        `the quotient changes in a regular way, the rule lives in the quotient.`,
    },
  }
}

const DESLOCAMENTOS = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]

/**
 * Famílias de regra por nível.
 *
 * Cada nível sorteia entre 3-5 famílias com faixas generosas. Isso não é
 * enfeite: com uma única família de faixa estreita, o espaço de questões
 * distintas fica menor que a meta de 150 por tipo e o pipeline passa a gerar
 * duplicata atrás de duplicata.
 */
const FAMILIAS_SIMPLES: Record<Difficulty, Familia[]> = {
  // uma regra não linear limpa, números pequenos
  1: [
    (rng) => segundaOrdem('diferenca_crescente', rng.int(1, 25), rng.int(1, 5), rng.pick([1, 2])),
    (rng) => geometrica('dobro', rng.int(2, 15), 2),
    (rng) => potencias('quadrados', rng.int(1, 9), 2, 0),
  ],
  // segunda ordem, razão diferente de 2, Fibonacci, quadrados deslocados
  2: [
    (rng) => {
      const c = rng.int(2, 4)
      if (rng.next() < 0.5) return segundaOrdem('segunda_diferenca', rng.int(2, 40), rng.int(2, 8), c)
      // descendo com o tombo diminuindo: 90, 76, 65, 57, 52 → 50
      return segundaOrdem('segunda_diferenca', rng.int(65, 99), -(rng.int(1, 4) + 4 * c), c)
    },
    (rng) =>
      rng.next() < 0.5
        ? geometrica('geometrica', rng.int(1, 6), 3)
        : divisao('geometrica', rng.int(3, 15), 2),
    (rng) => fibonacci('fibonacci', rng.int(1, 12), rng.int(2, 15)),
    (rng) => potencias('quadrados_mais_k', rng.int(3, 10), 2, rng.pick(DESLOCAMENTOS)),
  ],
  3: [
    // diferenças que trocam de sinal: a série desce, vira e volta a subir
    (rng) => {
      const c = rng.int(3, 6)
      return segundaOrdem('segunda_diferenca_mista', rng.int(30, 80), -rng.int(c + 1, 3 * c), c)
    },
    (rng) => {
      switch (rng.int(0, 2)) {
        case 0:
          return geometrica('geometrica_grande', rng.int(1, 4), 4)
        case 1:
          return geometrica('geometrica_grande', rng.int(1, 3), 5)
        default:
          return divisao('geometrica_grande', rng.int(1, 4), 3)
      }
    },
    (rng) => {
      const r = rng.pick([2, 3])
      return afim('afim', rng.int(2, r === 2 ? 12 : 6), r, rng.pick([-3, -2, -1, 1, 2, 3, 4, 5]))
    },
    (rng) => potencias('cubos', rng.int(1, 5), 3, 0),
  ],
  // duas regras que interagem, negativos, n² + n, diferenças geométricas
  4: [
    (rng) => produtoConsecutivo('produto_consecutivo', rng.int(1, 9), rng.pick([1, 3])),
    (rng) => {
      const r = rng.pick([2, 3])
      return diferencasGeometricas('diferencas_geometricas', rng.int(1, 30), rng.int(1, r === 2 ? 6 : 3), r)
    },
    // diferenças que aceleram para baixo e atravessam o zero
    (rng) => {
      const c = -rng.int(2, 6)
      const d0 = rng.int(-4, 4)
      const alvo = -rng.int(5, 40)
      return segundaOrdem('segunda_diferenca_negativa', alvo - 5 * d0 - 10 * c, d0, c)
    },
    (rng) => potencias('cubos_mais_k', rng.int(1, 6), 3, rng.pick(DESLOCAMENTOS)),
  ],
  5: [
    (rng) => {
      const m0 = rng.pick([2, 3])
      return multiplicadorCrescente('multiplicador_crescente', rng.int(1, m0 === 2 ? 5 : 3), m0)
    },
    (rng) =>
      rng.next() < 0.5
        ? geometrica('geometrica_negativa', rng.int(1, 12), -2)
        : geometrica('geometrica_negativa', rng.int(1, 5), -3),
    // razão fracionária: a resposta sai do inteiro
    (rng) =>
      rng.next() < 0.5
        ? geometrica('fracionaria', 16 * rng.pick([1, 3, 5, 7, 9]), 1.5)
        : geometrica('fracionaria', 8 * rng.pick(range(1, 12).map((i) => 2 * i + 1)), 0.5),
    (rng) => tribonacci('tribonacci', rng.int(1, 6), rng.int(1, 6), rng.int(2, 9)),
    (rng) => diferencasGeometricas('diferencas_alternadas', rng.int(5, 40), rng.int(1, 4), -2),
  ],
}

// --- Série alternada ---------------------------------------------------------

export const gerarSerieAlternada: MathGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const regra = sortear(() => rng.pick(FAMILIAS_ALTERNADAS[difficulty])(rng))
  return montar(rng, 'serie_alternada', regra, difficulty)
}

/** Uma das duas séries trançadas. */
interface Trilha {
  valor: (i: number) => number
  expressao: (i: number) => string
  /** predicado de "os termos …" */
  descricao: LocalizedText
}

const trilhaAritmetica = (a0: number, p: number): Trilha => ({
  valor: (i) => a0 + i * p,
  expressao: (i) => `${a0}+${i}*(${p})`,
  descricao:
    p > 0
      ? { pt: `sobem de ${p} em ${p}`, en: `go up by ${p} each time` }
      : { pt: `descem de ${-p} em ${-p}`, en: `go down by ${-p} each time` },
})

const trilhaGeometrica = (a0: number, r: number): Trilha => ({
  valor: (i) => a0 * r ** i,
  expressao: (i) => `${a0}${`*(${r})`.repeat(i)}`,
  descricao:
    r === 2
      ? { pt: 'dobram a cada passo', en: 'double each time' }
      : r < 0
        ? { pt: `são multiplicados por ${r} (o sinal alterna)`, en: `are multiplied by ${r} (the sign flips)` }
        : { pt: `são multiplicados por ${r}`, en: `are multiplied by ${r}` },
})

const trilhaSegundaOrdem = (a0: number, d0: number, c: number): Trilha => {
  const difs = [0, 1, 2].map((i) => sinal(d0 + i * c)).join(', ')
  return {
    valor: (i) => a0 + i * d0 + (c * i * (i - 1)) / 2,
    expressao: (i) => `${a0}+${i}*(${d0})+(${c})*${(i * (i - 1)) / 2}`,
    descricao: {
      pt: `mudam por uma diferença que ${c > 0 ? 'aumenta' : 'diminui'} ${Math.abs(c)} a cada passo (${difs}…)`,
      en: `change by a gap that ${c > 0 ? 'grows' : 'drops'} by ${Math.abs(c)} each step (${difs}…)`,
    },
  }
}

const trilhaQuadrados = (s: number): Trilha => ({
  valor: (i) => (s + i) ** 2,
  expressao: (i) => `${s + i}*${s + i}`,
  descricao: {
    pt: `são quadrados perfeitos (${s}², ${s + 1}², ${s + 2}²…)`,
    en: `are perfect squares (${s}², ${s + 1}², ${s + 2}²…)`,
  },
})

type SorteioTrilha = (rng: Rng) => Trilha

const LINEARES: SorteioTrilha[] = [
  (rng) => trilhaAritmetica(rng.int(2, 30), rng.int(2, 9)),
  (rng) => trilhaAritmetica(rng.int(40, 95), -rng.int(2, 9)),
]

const CURVAS: SorteioTrilha[] = [
  (rng) => trilhaGeometrica(rng.int(1, 9), 2),
  (rng) => trilhaGeometrica(rng.int(1, 4), 3),
  (rng) => trilhaSegundaOrdem(rng.int(1, 30), rng.int(1, 5), rng.int(1, 3)),
  (rng) => trilhaQuadrados(rng.int(2, 9)),
]

const NEGATIVAS: SorteioTrilha[] = [
  (rng) => trilhaGeometrica(rng.int(1, 6), -2),
  (rng) => trilhaSegundaOrdem(rng.int(5, 30), rng.int(-3, 2), -rng.int(2, 5)),
]

/**
 * Tranca A (posições ímpares) e B (pares) e mostra n termos.
 *
 * Com n par a vaga cai em A; com n ímpar, em B. Sortear n é o que obriga a
 * contar a posição da lacuna — com a vaga sempre na mesma série, bastava
 * decorar "continua a primeira".
 */
function trancar(familia: string, A: Trilha, B: Trilha, n: number): Regra {
  const terms = seq(n, (j) => (j % 2 === 0 ? A : B).valor(Math.floor(j / 2)))
  const daA = n % 2 === 0
  const certa = daA ? A : B
  const outra = daA ? B : A
  const k = Math.floor(n / 2)
  const next = certa.valor(k)
  const anterior = certa.valor(k - 1)
  const antes = certa.valor(k - 2)

  return {
    familia,
    terms,
    next,
    expression: certa.expressao(k),
    erros: [
      outra.valor(daA ? k : k + 1), // continuou a outra série
      anterior + (anterior - antes), // repetiu o último passo da série certa
    ],
    explanation: {
      pt:
        `São duas séries trançadas. Nas posições ímpares (1ª, 3ª, 5ª…) os termos ` +
        `${A.descricao.pt}; nas pares (2ª, 4ª, 6ª…), os termos ${B.descricao.pt}. A vaga é a ` +
        `${n + 1}ª posição, ${daA ? 'ímpar' : 'par'}, então continua a ` +
        `${daA ? 'primeira' : 'segunda'} série: ${fmt(anterior)} → ${fmt(next)}. Quando a ` +
        `sequência sobe e desce sem padrão, leia um termo sim, um termo não — e conte a ` +
        `posição da lacuna antes de responder.`,
      en:
        `Two series are interleaved. In the odd positions (1st, 3rd, 5th…) the terms ` +
        `${A.descricao.en}; in the even ones (2nd, 4th, 6th…) they ${B.descricao.en}. The ` +
        `blank is the ${ordinal(n + 1)} position, ${daA ? 'odd' : 'even'}, so it continues ` +
        `the ${daA ? 'first' : 'second'} series: ${fmt(anterior)} → ${fmt(next)}. When a ` +
        `sequence rises and falls with no pattern, read every other term — and count the ` +
        `blank's position before answering.`,
    },
  }
}

interface FuncaoPar {
  aplicar: (x: number) => number
  expressao: (x: number) => string
  conta: (x: number) => string
  erros: (x: number) => number[]
  descricao: LocalizedText
}

const FUNCOES_PAR: ((rng: Rng) => FuncaoPar)[] = [
  () => ({
    aplicar: (x) => x * x,
    expressao: (x) => `${x}*${x}`,
    conta: (x) => `${x}²`,
    erros: (x) => [x * (x + 1), x * (x - 1)],
    descricao: { pt: 'o quadrado do termo anterior', en: 'the square of the term before it' },
  }),
  (rng) => {
    const k = rng.pick([-3, -2, -1, 1, 2, 3, 4, 5])
    const mais = { pt: k > 0 ? 'mais' : 'menos', en: k > 0 ? 'plus' : 'minus' }
    return {
      aplicar: (x) => 2 * x + k,
      expressao: (x) => `2*${x}+(${k})`,
      conta: (x) => `2 × ${x} ${k > 0 ? '+' : '-'} ${Math.abs(k)}`,
      erros: (x) => [2 * x, 2 * x - k, 3 * x + k],
      descricao: {
        pt: `o dobro do termo anterior ${mais.pt} ${Math.abs(k)}`,
        en: `twice the term before it ${mais.en} ${Math.abs(k)}`,
      },
    }
  },
  (rng) => {
    const k = rng.int(1, 5)
    return {
      aplicar: (x) => 3 * x - k,
      expressao: (x) => `3*${x}-${k}`,
      conta: (x) => `3 × ${x} - ${k}`,
      erros: (x) => [3 * x, 3 * x + k, 2 * x - k],
      descricao: {
        pt: `o triplo do termo anterior menos ${k}`,
        en: `three times the term before it minus ${k}`,
      },
    }
  },
  (rng) => {
    const k = rng.pick([-3, -2, -1, 1, 2, 3])
    const mais = { pt: k > 0 ? 'mais' : 'menos', en: k > 0 ? 'plus' : 'minus' }
    return {
      aplicar: (x) => x * x + k,
      expressao: (x) => `${x}*${x}+(${k})`,
      conta: (x) => `${x}² ${k > 0 ? '+' : '-'} ${Math.abs(k)}`,
      erros: (x) => [x * x, x * x - k],
      descricao: {
        pt: `o quadrado do termo anterior ${mais.pt} ${Math.abs(k)}`,
        en: `the square of the term before it ${mais.en} ${Math.abs(k)}`,
      },
    }
  },
]

/**
 * Nível 5: os termos vêm em pares (x, f(x)), e x segue a própria regra não
 * linear. Nenhuma das duas trilhas fecha lendo "um sim, um não" — a relação
 * está entre vizinhos.
 */
const pares: Familia = (rng) => {
  const A = trilhaSegundaOrdem(rng.int(1, 6), rng.int(1, 3), rng.int(1, 2))
  const f = rng.pick(FUNCOES_PAR)(rng)
  const terms = seq(7, (j) => (j % 2 === 0 ? A.valor(j / 2) : f.aplicar(A.valor((j - 1) / 2))))
  const x = A.valor(3)
  const next = f.aplicar(x)
  const [a0, b0, a1, b1, a2, b2] = terms as [number, number, number, number, number, number]

  return {
    familia: 'pares',
    terms,
    next,
    expression: f.expressao(x),
    erros: [
      A.valor(4), // continuou a trilha de x
      b2 + (b2 - b1), // leu a trilha de f(x) sozinha, como se fosse linear
      ...f.erros(x),
    ],
    explanation: {
      pt:
        `Os termos vêm em pares: cada termo de posição par é ${f.descricao.pt} ` +
        `(${a0} → ${b0}, ${a1} → ${b1}, ${a2} → ${b2}). Os termos de posição ímpar ` +
        `${A.descricao.pt}. A vaga é a 8ª posição, par, então sai do ${fmt(x)} logo antes ` +
        `dela: ${f.conta(x)} = ${fmt(next)}. Quando nenhuma das duas trilhas fecha sozinha, ` +
        `compare cada termo com o vizinho da esquerda.`,
      en:
        `The terms come in pairs: each even-position term is ${f.descricao.en} ` +
        `(${a0} → ${b0}, ${a1} → ${b1}, ${a2} → ${b2}). The odd-position terms ` +
        `${A.descricao.en}. The blank is the 8th position, even, so it comes from the ` +
        `${fmt(x)} right before it: ${f.conta(x)} = ${fmt(next)}. When neither strand closes ` +
        `on its own, compare each term with its left-hand neighbour.`,
    },
  }
}

/** Só aceita a série se ela de fato passa por número negativo. */
function comNegativo(regra: Regra | null): Regra | null {
  return regra && regra.terms.some((t) => t < 0) ? regra : null
}

/**
 * Nível 1: duas lineares em sentidos opostos — o trabalho é enxergar a trança.
 * Do 2 em diante pelo menos uma trilha é não linear e aparecem 8-9 termos,
 * para que cada trilha mostre quatro valores e a regra dela seja recuperável.
 */
const FAMILIAS_ALTERNADAS: Record<Difficulty, Familia[]> = {
  1: [
    (rng) => {
      const [A, B] = emOrdem(rng, (LINEARES[0] as SorteioTrilha)(rng), (LINEARES[1] as SorteioTrilha)(rng))
      return trancar('duas_lineares', A, B, rng.pick([6, 7]))
    },
  ],
  2: [
    (rng) => {
      const [A, B] = emOrdem(rng, rng.pick(LINEARES)(rng), rng.pick(CURVAS)(rng))
      return trancar('linear_com_curva', A, B, rng.pick([8, 9]))
    },
  ],
  3: [
    (rng) => {
      const [f, g] = rng.shuffle(CURVAS) as [SorteioTrilha, SorteioTrilha]
      return trancar('duas_curvas', f(rng), g(rng), rng.pick([8, 9]))
    },
  ],
  4: [
    (rng) => {
      const [A, B] = emOrdem(rng, rng.pick(NEGATIVAS)(rng), rng.pick(CURVAS)(rng))
      return comNegativo(trancar('curva_com_negativos', A, B, rng.pick([8, 9])))
    },
  ],
  // pares aparece duas vezes: é a família que só existe no nível 5
  5: [
    pares,
    pares,
    (rng) => {
      const [f, g] = rng.shuffle(NEGATIVAS) as [SorteioTrilha, SorteioTrilha]
      return comNegativo(trancar('duas_negativas', f(rng), g(rng), rng.pick([8, 9])))
    },
  ],
}

// --- Série de dois passos ----------------------------------------------------

export const gerarSerieDoisPassos: MathGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const regra = sortear(() => rng.pick(FAMILIAS_DOIS_PASSOS[difficulty])(rng))
  return montar(rng, 'serie_dois_passos', regra, difficulty)
}

interface Operacao {
  aplicar: (x: number) => number
  expressao: (x: number) => string
  simbolo: string
  pt: string
  en: string
}

const soma = (k: number): Operacao => ({
  aplicar: (x) => x + k,
  expressao: (x) => `(${x})+${k}`,
  simbolo: `+${k}`,
  pt: `soma ${k}`,
  en: `add ${k}`,
})

const subtrai = (k: number): Operacao => ({
  aplicar: (x) => x - k,
  expressao: (x) => `(${x})-${k}`,
  simbolo: `-${k}`,
  pt: `subtrai ${k}`,
  en: `subtract ${k}`,
})

const multiplica = (k: number): Operacao => ({
  aplicar: (x) => x * k,
  expressao: (x) => `(${x})*(${k})`,
  simbolo: k < 0 ? `×(${k})` : `×${k}`,
  pt: `multiplica por ${k}`,
  en: `multiply by ${k}`,
})

/**
 * Aplica opEm(0), opEm(1)… a partir de a0 e mostra n termos. A vaga é o
 * resultado da operação de índice n-1 — com n sorteado, ela cai ora numa
 * operação, ora na outra.
 */
function porOperacoes(
  familia: string,
  a0: number,
  opEm: (i: number) => Operacao,
  n: number,
  descricao: LocalizedText,
  errosDoPasso: (i: number, x: number) => number[],
): Regra {
  const terms = [a0]
  for (let i = 1; i < n; i++) terms.push(opEm(i - 1).aplicar(terms[i - 1] as number))
  const ultimo = terms[n - 1] as number
  const op = opEm(n - 1)
  const next = op.aplicar(ultimo)
  const cadeia = [fmt(a0), ...terms.slice(1).map((t, i) => `${fmt(t)} (${opEm(i).simbolo})`)].join(' → ')
  const fechamento = `${fmt(ultimo)} ${op.simbolo} = ${fmt(next)}`

  return {
    familia,
    terms,
    next,
    expression: op.expressao(ultimo),
    erros: errosDoPasso(n - 1, ultimo),
    explanation: {
      pt:
        `${descricao.pt} Veja: ${cadeia}. O próximo passo é ${op.simbolo}: ${fechamento}. ` +
        `Quando nem a diferença nem a razão são constantes, escreva a operação entre cada ` +
        `par de vizinhos — o ciclo aparece.`,
      en:
        `${descricao.en} Look: ${cadeia}. The next step is ${op.simbolo}: ${fechamento}. ` +
        `When neither the difference nor the ratio is constant, write down the operation ` +
        `between each pair of neighbours — the cycle shows up.`,
    },
  }
}

/** Operações em ciclo fixo: [+a, ×2], [+a, ×2, -b]… */
function ciclo(familia: string, a0: number, ops: Operacao[], n: number): Regra {
  const L = ops.length
  const nome = L === 2 ? { pt: 'duas', en: 'two' } : { pt: 'três', en: 'three' }
  return porOperacoes(
    familia,
    a0,
    (i) => ops[i % L] as Operacao,
    n,
    {
      pt: `A regra alterna ${nome.pt} operações em ciclo: ${ops.map((o) => o.pt).join(', depois ')}.`,
      en: `The rule cycles through ${nome.en} operations: ${ops.map((o) => o.en).join(', then ')}.`,
    },
    (i, x) => {
      const certa = ops[i % L] as Operacao
      const seguinte = ops[(i + 1) % L] as Operacao
      return [
        ...ops.filter((o) => o !== certa).map((o) => o.aplicar(x)), // operação da vez errada
        seguinte.aplicar(certa.aplicar(x)), // aplicou duas de uma vez
      ]
    },
  )
}

/**
 * Uma operação fixa alternando com uma soma (ou subtração) cujo valor cresce
 * de 1 em 1: ×2, +1, ×2, +2, ×2, +3… O operando não é óbvio porque nunca se
 * repete.
 */
function operandoCrescente(
  familia: string,
  a0: number,
  fixa: Operacao,
  variavel: (k: number) => Operacao,
  nomeVariavel: LocalizedText,
  k0: number,
  fixaPrimeiro: boolean,
  n: number,
): Regra | null {
  const ehFixa = (i: number) => (i % 2 === 0) === fixaPrimeiro
  const kEm = (i: number) => k0 + Math.floor(i / 2)
  const opEm = (i: number) => (ehFixa(i) ? fixa : variavel(kEm(i)))
  const serie = [0, 1, 2].map((j) => variavel(k0 + j).simbolo).join(', ')

  const regra = porOperacoes(
    familia,
    a0,
    opEm,
    n,
    {
      pt: `A regra alterna "${fixa.pt}" com ${nomeVariavel.pt} cujo valor cresce 1 a cada vez (${serie}…).`,
      en: `The rule alternates "${fixa.en}" with ${nomeVariavel.en} that grows by 1 each time (${serie}…).`,
    },
    (i, x) => {
      if (ehFixa(i)) return [variavel(kEm(i + 1)).aplicar(x)] // operação da vez errada
      const k = kEm(i)
      return [
        variavel(k - 1).aplicar(x), // esqueceu que o operando cresce
        variavel(k + 1).aplicar(x),
        fixa.aplicar(x),
      ]
    },
  )

  // Com certas entradas, o operando crescente vira razão constante (8 → 6 e
  // 12 → 9 são -2 e -3, mas também ×3/4) e a série ganha uma segunda leitura.
  const razoes = regra.terms
    .slice(1)
    .flatMap((y, i) => (ehFixa(i) ? [] : [y / (regra.terms[i] as number)]))
  return new Set(razoes).size === 1 ? null : regra
}

/** Só aceita a série se todos os termos ficam positivos. */
function positiva(regra: Regra | null): Regra | null {
  return regra && regra.terms.every((t) => t > 0) ? regra : null
}

const FAMILIAS_DOIS_PASSOS: Record<Difficulty, Familia[]> = {
  1: [
    (rng) => {
      const a = rng.int(4, 12)
      const b = rng.int(1, a - 2)
      return ciclo('soma_e_subtrai', rng.int(b + 1, 30), emOrdem(rng, soma(a), subtrai(b)), 5)
    },
    (rng) => ciclo('soma_e_dobra', rng.int(1, 8), emOrdem(rng, soma(rng.int(1, 6)), multiplica(2)), 5),
  ],
  // a partir daqui a vaga cai em qualquer uma das operações
  2: [
    (rng) => {
      const ops = emOrdem(rng, soma(rng.int(1, 5)), multiplica(3))
      return ciclo('soma_e_triplica', rng.int(1, 4), ops, rng.pick([5, 6]))
    },
    (rng) => {
      const b = rng.int(1, 9)
      const ops = emOrdem(rng, multiplica(2), subtrai(b))
      return positiva(ciclo('dobra_e_subtrai', rng.int(2 * b + 1, 2 * b + 12), ops, rng.pick([5, 6])))
    },
  ],
  3: [
    (rng) => {
      const b = rng.int(2, 12)
      const base = Math.ceil(1.5 * b) + 1
      const ops = emOrdem(rng, multiplica(3), subtrai(b))
      return positiva(ciclo('triplica_e_subtrai', rng.int(base, base + 6), ops, rng.pick([5, 6])))
    },
    (rng) => {
      const a = rng.int(2, 9)
      const ops = emOrdem(rng, subtrai(a), multiplica(2))
      return positiva(ciclo('subtrai_e_dobra', rng.int(2 * a + 1, 2 * a + 10), ops, rng.pick([5, 6])))
    },
    (rng) => {
      const ops = emOrdem(rng, multiplica(4), soma(rng.int(1, 9)))
      return ciclo('quadruplica_e_soma', rng.int(1, 3), ops, rng.pick([5, 6]))
    },
  ],
  // ciclo de três operações e operando que cresce
  4: [
    (rng) => {
      const a = rng.int(1, 9)
      const b = rng.int(1, 9)
      if (a === b) return null
      const ops = rotacao(rng, [soma(a), multiplica(2), subtrai(b)])
      return positiva(ciclo('ciclo_de_tres', rng.int(1, 10), ops, rng.pick([7, 8])))
    },
    (rng) =>
      operandoCrescente(
        'soma_crescente',
        rng.int(1, 9),
        multiplica(2),
        soma,
        { pt: 'uma soma', en: 'an addition' },
        rng.int(1, 5),
        rng.next() < 0.5,
        rng.pick([6, 7]),
      ),
  ],
  // negativos: multiplicador negativo, ciclo que atravessa o zero, subtração crescente
  5: [
    (rng) => {
      const a = rng.int(1, 9)
      const ops = rng.next() < 0.5 ? [multiplica(-2), soma(a)] : [subtrai(a), multiplica(-2)]
      return ciclo('sinal_alternado', rng.int(1, 9), ops, rng.pick([6, 7]))
    },
    (rng) => {
      const a = rng.int(3, 9)
      const b = rng.int(1, 9)
      const ops = rotacao(rng, [subtrai(a), multiplica(2), subtrai(b)])
      return comNegativo(ciclo('ciclo_de_tres_negativo', rng.int(1, 2 * a + b - 1), ops, rng.pick([7, 8])))
    },
    // positiva: se a subtração alcança o zero, a multiplicação trava a série nele
    (rng) => {
      const fator = rng.pick([2, 3])
      return positiva(operandoCrescente(
        'subtracao_crescente',
        rng.int(3, fator === 2 ? 12 : 6),
        multiplica(fator),
        subtrai,
        { pt: 'uma subtração', en: 'a subtraction' },
        rng.int(1, 5),
        rng.next() < 0.5,
        rng.pick([6, 7]),
      ))
    },
  ],
}

export const SERIES_GENERATORS = {
  serie_simples: gerarSerieSimples,
  serie_alternada: gerarSerieAlternada,
  serie_dois_passos: gerarSerieDoisPassos,
} as const satisfies Record<string, MathGenerator>

export type SeriesGeneratorId = keyof typeof SERIES_GENERATORS
export const SERIES_GENERATOR_IDS = Object.keys(SERIES_GENERATORS) as SeriesGeneratorId[]

// --- Sorteio -----------------------------------------------------------------

/**
 * Sorteia até sair uma regra utilizável. Rejeita:
 *  - diferença constante entre vizinhos (a série trivial que este gerador existe
 *    para evitar — numa trança ou num ciclo ela pode surgir por coincidência);
 *  - resposta que já aparece no enunciado, com ou sem sinal. Numa série
 *    trançada isso acontece de verdade, e a questão fica ambígua: o candidato vê
 *    o número no enunciado e não sabe se acertou pela regra ou de vista. O sinal
 *    conta como igual porque o gate compara texto normalizado, que descarta o "-";
 *  - número grande demais ou com mais de duas casas decimais.
 */
function sortear(build: () => Regra | null): Regra {
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const regra = build()
    if (regra && regraValida(regra)) return regra
  }
  throw new Error('não consegui montar uma série válida')
}

function regraValida(r: Regra): boolean {
  const todos = [...r.terms, r.next]
  if (!todos.every((v) => Number.isFinite(v) && Math.abs(v) <= 99_999 && casasOk(v))) return false
  if (diferencaConstante(r.terms)) return false
  // Valor repetido no enunciado abre segunda leitura: em 5, 2, 6, 2, 6 o passo
  // 2 → 6 tanto pode ser ×3 quanto +4, e as duas dão respostas diferentes.
  if (new Set(r.terms).size !== r.terms.length) return false
  if (r.terms.some((t) => Math.abs(t) === Math.abs(r.next))) return false
  return !enunciadoContem(stemDe(r.terms), fmt(r.next))
}

// --- Montagem ----------------------------------------------------------------

function montar(
  rng: Rng,
  subtipo: string,
  regra: Regra,
  _difficulty: Difficulty,
): MathGenerated {
  const stem = stemDe(regra.terms)
  const valores = comDistratores(rng, regra, OPCOES_POR_QUESTAO, stem)
  const embaralhados = rng.shuffle(valores.map((v, i) => ({ v, isCorrect: i === 0 })))

  const options = embaralhados.map((o, i) => ({
    id: optionIdAt(i) as string,
    text: fmt(o.v),
  }))
  const answerIndex = embaralhados.findIndex((o) => o.isCorrect)

  return {
    subtipo,
    stem,
    options,
    answerId: optionIdAt(answerIndex) as string,
    explanation: {
      pt: `A resposta é ${fmt(regra.next)}. ${regra.explanation.pt}`,
      en: `The answer is ${fmt(regra.next)}. ${regra.explanation.en}`,
    },
    expression: regra.expression,
    answerValue: regra.next,
    familia: regra.familia,
  }
}

/**
 * Distratores = os erros que a pessoa de fato comete: usar a outra série,
 * repetir o último passo, tratar como segunda ordem o que não é, errar a conta
 * por pouco. Um distrator aleatório não treina nada — a pessoa elimina de olho
 * e acerta sem saber a regra.
 *
 * Os erros de regra vêm primeiro, mas sempre sobra vaga para ao menos um
 * deslize de conta (resposta ± pouco), que é o que obriga a fazer a conta até
 * o fim. Nenhum distrator repete número do enunciado, destoa no sinal de uma
 * série toda positiva ou fica longe demais para ser plausível.
 */
function comDistratores(rng: Rng, regra: Regra, quantidade: number, stem: string): number[] {
  const { next, terms, erros } = regra
  const ultimo = terms[terms.length - 1] as number
  const penultimo = terms[terms.length - 2] as number
  const antepenultimo = terms[terms.length - 3] as number
  const ultimaDif = ultimo - penultimo
  const penultimaDif = penultimo - antepenultimo

  const estruturais = [
    ...erros,
    ultimo + ultimaDif, // repetiu a última diferença
    ultimo + ultimaDif + (ultimaDif - penultimaDif), // tratou como segunda ordem
  ]

  // grão do deslize: 1 para inteiro, 0.5 ou 0.25 para as séries fracionárias
  const grao = Number.isInteger(next) ? 1 : Number.isInteger(next * 2) ? 0.5 : 0.25
  const salto = Number.isInteger(next) ? Math.max(3, Math.round(Math.abs(next - ultimo) / 4)) : 2 * grao
  const deslizes = [
    next + grao,
    next - grao,
    next + 2 * grao,
    next - 2 * grao,
    next + salto,
    next - salto,
    ...(Math.abs(next) >= 50 ? [next + 10, next - 10] : []),
  ]

  const soPositivos = Math.min(...terms, next) > 0
  const limite = Math.max(Math.abs(next), Math.abs(ultimo), 12)
  const vistos = new Set(terms.map((t) => Math.abs(t)))
  const textos = new Set([normalizeText(fmt(next))])

  const aceita = (c: number, relaxado = false): boolean => {
    if (!Number.isFinite(c) || !casasOk(c)) return false
    if (Number.isInteger(next) && !Number.isInteger(c)) return false
    if (soPositivos && c <= 0) return false
    if (vistos.has(Math.abs(c))) return false
    if (!relaxado && Math.abs(c - next) > limite) return false
    // o gate compara texto normalizado: "-12" e "12" contam como a mesma alternativa
    const texto = normalizeText(fmt(c))
    if (textos.has(texto) || enunciadoContem(stem, fmt(c))) return false
    textos.add(texto)
    return true
  }

  const escolhidos: number[] = [next]
  const pegar = (lista: number[], ate: number) => {
    for (const c of lista) {
      if (escolhidos.length >= ate) return
      if (aceita(c)) escolhidos.push(c)
    }
  }

  pegar(rng.shuffle(estruturais), quantidade - 1)
  pegar(rng.shuffle(deslizes), quantidade)
  pegar(estruturais, quantidade)

  // Rede de segurança: se os candidatos colidiram, completa afastando-se do alvo.
  for (let passo = 3; escolhidos.length < quantidade; passo++) {
    if (passo > 400) throw new Error('não consegui montar distratores para a série')
    const c = next + (passo % 2 === 0 ? 1 : -1) * Math.floor(passo / 2) * grao
    if (aceita(c, true)) escolhidos.push(c)
  }

  return escolhidos
}

// --- Utilitários -------------------------------------------------------------

/** Valor como aparece na alternativa: en-US, sem zero à direita (5.5, não 5.50). */
function fmt(v: number): string {
  const texto = formatNumber(v)
  return texto.includes('.') ? texto.replace(/\.?0+$/, '') : texto
}

/** O enunciado usa o número cru: com separador de milhar, "1,024" viraria dois termos. */
function stemDe(terms: number[]): string {
  return `${terms.map(String).join(', ')}, ?`
}

/** Mesmo critério do gate G2, com borda dos dois lados. */
function enunciadoContem(stem: string, texto: string): boolean {
  return ` ${normalizeText(stem)} `.includes(` ${normalizeText(texto)} `)
}

function sinal(v: number): string {
  return v < 0 ? fmt(v) : `+${fmt(v)}`
}

function conta(x: number, d: number): string {
  return `${fmt(x)} ${d < 0 ? '-' : '+'} ${fmt(Math.abs(d))}`
}

/** Ordinal em inglês; a vaga fica entre a 7ª e a 10ª posição, então basta o caso simples. */
function ordinal(n: number): string {
  const sufixo = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  return `${n}${sufixo}`
}

function casasOk(v: number): boolean {
  return Math.abs(v * 100 - Math.round(v * 100)) < 1e-9
}

function diferencas(terms: number[]): number[] {
  return terms.slice(1).map((t, i) => t - (terms[i] as number))
}

function diferencaConstante(terms: number[]): boolean {
  return new Set(diferencas(terms)).size === 1
}

function emOrdem<T>(rng: Rng, a: T, b: T): [T, T] {
  return rng.next() < 0.5 ? [a, b] : [b, a]
}

/** Mesmo ciclo começando de uma posição sorteada. */
function rotacao<T>(rng: Rng, itens: T[]): T[] {
  const k = rng.int(0, itens.length - 1)
  return [...itens.slice(k), ...itens.slice(0, k)]
}

function seq(n: number, f: (i: number) => number): number[] {
  return Array.from({ length: n }, (_, i) => f(i))
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}
