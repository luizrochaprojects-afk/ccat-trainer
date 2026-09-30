import { mulberry32, type Rng } from '../rng'
import { OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import type { LocalizedText } from '../i18n'
import { optionIdAt } from '../optionIds'
import { normalizeText } from '../schema'
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
 *
 * O nível escolhe a FAMÍLIA do problema, não só o número de alternativas:
 *
 *  - 1-2: duas ou três contas com números amigáveis (troco, estoque, razão
 *         simples, desconto numa cesta, trecho com duas velocidades).
 *  - 3:   três passos ou uma pegadinha conceitual (mudança de média, preço
 *         original a partir do final, razão com total, proporção inversa).
 *  - 4-5: várias restrições ao mesmo tempo (média ponderada, percentuais
 *         sucessivos, mistura, trabalho conjunto, perseguição, velocidade média),
 *         números menos redondos e distratores colados na resposta.
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

interface Registro {
  id: string
  /** níveis em que o template entra no sorteio */
  niveis: readonly Difficulty[]
  /** menor número de passos de raciocínio que o template exige, em qualquer nível */
  passos: number
  build: Template
}

/** Metadados públicos do registro — o que os testes precisam para auditar o sorteio. */
export interface TemplateInfo {
  id: string
  niveis: readonly Difficulty[]
  passos: number
}

const NOMES = [
  'Ana', 'Ben', 'Carla', 'David', 'Elena', 'Farid', 'Grace', 'Hugo',
  'Iris', 'Jonas', 'Kate', 'Leo', 'Maya', 'Nina', 'Omar', 'Paula',
] as const

// --- Aritmética --------------------------------------------------------------

const COMPRAS: readonly (readonly [string, string])[] = [
  ['notebooks', 'pens'],
  ['coffees', 'muffins'],
  ['movie tickets', 'bags of popcorn'],
  ['sandwiches', 'bottles of juice'],
  ['folders', 'markers'],
  ['bus passes', 'snacks'],
]

const troco: Template = (rng, d) => {
  const nome = rng.pick(NOMES)
  const [item1, item2] = rng.pick(COMPRAS)
  const { q1, p1, q2, p2, gasto, nota } = sortear(() => {
    const q1 = rng.int(2, 5)
    const q2 = rng.int(2, 6)
    // Centavos só em quartos: 0.25 / 0.5 / 0.75 são exatos em ponto flutuante.
    const p1 = d === 1 ? rng.int(2, 9) : rng.int(3, 12) + rng.pick([0.25, 0.5, 0.75])
    const p2 =
      d === 1 ? rng.int(1, 4) + rng.pick([0, 0.5]) : rng.int(1, 5) + rng.pick([0.25, 0.5, 0.75])
    const gasto = c2(q1 * p1 + q2 * p2)
    const nota = [20, 50, 100].find((n) => n >= gasto + 2)
    return nota === undefined ? undefined : { q1, p1, q2, p2, gasto, nota }
  })
  const valor = c2(nota - gasto)

  return {
    stem:
      `${nome} buys ${q1} ${item1} at ${usd(p1)} each and ${q2} ${item2} at ${usd(p2)} ` +
      `each, paying with a $${nota} bill. How much change should ${nome} get back?`,
    valor,
    expression: `${nota}-(${q1}*${p1}+${q2}*${p2})`,
    format: 'currency',
    armadilhas: [
      nota - q1 * p1 - p2, // esqueceu a quantidade do segundo item
      nota - p1 - q2 * p2, // esqueceu a quantidade do primeiro
      gasto, // respondeu o gasto, não o troco
      nota - q1 * p1, // esqueceu o segundo item
    ],
    explanation: {
      pt:
        `Gasto: ${q1} × ${usd(p1)} + ${q2} × ${usd(p2)} = ${usd(gasto)}. Troco: $${nota} − ` +
        `${usd(gasto)} = ${usd(valor)}. O erro comum é multiplicar só o primeiro item pela ` +
        `quantidade — e o gasto total também está entre as alternativas.`,
      en:
        `Spent: ${q1} × ${usd(p1)} + ${q2} × ${usd(p2)} = ${usd(gasto)}. Change: $${nota} − ` +
        `${usd(gasto)} = ${usd(valor)}. The usual slip is multiplying only the first item by ` +
        `its quantity — and the total spent is sitting among the options too.`,
    },
  }
}

const estoque: Template = (rng, d) => {
  const caixas = d === 1 ? rng.int(6, 15) : rng.int(12, 30)
  const porCaixa = d === 1 ? rng.int(6, 12) : rng.int(12, 24)
  const saiuCaixas = rng.int(2, caixas - 3)
  const avulsas = rng.int(2, porCaixa - 1)
  const devolvidas = d === 1 ? 0 : rng.int(3, 40)
  const restoCaixas = (caixas - saiuCaixas) * porCaixa
  const valor = restoCaixas - avulsas + devolvidas

  const devolucao = devolvidas > 0 ? ` Later, a customer returned ${devolvidas} units.` : ''
  return {
    stem:
      `A warehouse received ${caixas} boxes of ${porCaixa} units each. It then shipped out ` +
      `${saiuCaixas} full boxes plus ${avulsas} loose units.${devolucao} How many units are ` +
      `in the warehouse now?`,
    valor,
    expression:
      `(${caixas}-${saiuCaixas})*${porCaixa}-${avulsas}` + (devolvidas > 0 ? `+${devolvidas}` : ''),
    format: 'plain',
    armadilhas: [
      ...(devolvidas > 0
        ? [valor - 2 * devolvidas, valor - devolvidas] // subtraiu a devolução / ignorou
        : []),
      restoCaixas + devolvidas, // esqueceu as unidades avulsas
      caixas * porCaixa - saiuCaixas - avulsas + devolvidas, // tratou caixas como unidades
      restoCaixas + avulsas + devolvidas, // somou as avulsas
      caixas * porCaixa - avulsas + devolvidas, // esqueceu as caixas despachadas
    ],
    explanation: {
      pt:
        `Sobram ${caixas} − ${saiuCaixas} = ${caixas - saiuCaixas} caixas, ou seja ` +
        `${num(restoCaixas)} unidades. Tire as ${avulsas} avulsas` +
        (devolvidas > 0 ? ` e some as ${devolvidas} devolvidas` : '') +
        `: ${num(valor)}. A pegadinha é misturar caixas com unidades — ${saiuCaixas} caixas ` +
        `são ${num(saiuCaixas * porCaixa)} unidades, não ${saiuCaixas}.`,
      en:
        `${caixas} − ${saiuCaixas} = ${caixas - saiuCaixas} boxes remain, i.e. ` +
        `${num(restoCaixas)} units. Take away the ${avulsas} loose units` +
        (devolvidas > 0 ? ` and add the ${devolvidas} returned` : '') +
        `: ${num(valor)}. The trap is mixing boxes with units — ${saiuCaixas} boxes are ` +
        `${num(saiuCaixas * porCaixa)} units, not ${saiuCaixas}.`,
    },
  }
}

/**
 * Substitui o antigo "divididos igualmente": 71 ÷ 3 não é exato, e o enunciado
 * esperava o quociente sem dizer. Aqui a pergunta é inequívoca — o MENOR número
 * de vans que leva todo mundo — e o arredondamento para cima é o raciocínio
 * cobrado, não um detalhe escondido.
 */
const vans: Template = (rng, d) => {
  const comMotorista = d >= 2
  const { alunos, profs, lugares, cap, pessoas, resto } = sortear(() => {
    const alunos = rng.int(35, 140)
    const profs = rng.int(3, 9)
    const lugares = rng.int(8, 15)
    const cap = comMotorista ? lugares - 1 : lugares
    const pessoas = alunos + profs
    const resto = pessoas % cap
    return resto === 0 ? undefined : { alunos, profs, lugares, cap, pessoas, resto }
  })
  const valor = (pessoas - resto) / cap + 1

  const assentos = comMotorista
    ? `Each van has ${lugares} seats, and one of them is taken by the driver.`
    : `Each van carries ${lugares} passengers, not counting the driver.`
  return {
    stem:
      `A school trip has ${alunos} students and ${profs} teachers. ${assentos} What is the ` +
      `smallest number of vans needed to take everyone?`,
    valor,
    expression: comMotorista
      ? `(${alunos}+${profs}-${resto})/(${lugares}-1)+1`
      : `(${alunos}+${profs}-${resto})/${lugares}+1`,
    format: 'plain',
    armadilhas: [
      valor - 1, // arredondou para baixo
      Math.ceil(alunos / cap), // esqueceu os professores
      ...(comMotorista ? [Math.ceil(pessoas / lugares)] : []), // contou o banco do motorista
      Math.floor(alunos / cap), // esqueceu os professores e arredondou para baixo
    ],
    explanation: {
      pt:
        `São ${alunos} + ${profs} = ${pessoas} pessoas e ${cap} lugares úteis por van` +
        (comMotorista ? ` (${lugares} menos o motorista)` : '') +
        `. ${pessoas} ÷ ${cap} = ${valor - 1} com resto ${resto}: essas ${resto} pessoas ` +
        `precisam de mais uma van, então ${valor}. Quando a pergunta é "quantos cabem" ` +
        `arredonda para baixo; quando é "quantos são necessários", para cima.`,
      en:
        `That is ${alunos} + ${profs} = ${pessoas} people and ${cap} usable seats per van` +
        (comMotorista ? ` (${lugares} minus the driver)` : '') +
        `. ${pessoas} ÷ ${cap} = ${valor - 1} remainder ${resto}: those ${resto} people ` +
        `need one more van, so ${valor}. When the question is "how many fit", round down; ` +
        `when it is "how many are needed", round up.`,
    },
  }
}

const mediaNova: Template = (rng) => {
  const nome = rng.pick(NOMES)

  if (rng.next() < 0.5) {
    const { n, media, dif, alvo, valor } = sortear(() => {
      const n = rng.int(3, 8)
      const media = rng.int(68, 86)
      const dif = rng.int(1, 3)
      const alvo = media + dif
      const valor = alvo + n * dif
      return valor <= 100 ? { n, media, dif, alvo, valor } : undefined
    })
    return {
      stem:
        `${nome} has an average of ${media} points over ${n} tests. What score on the next ` +
        `test would raise ${nome}'s average to exactly ${alvo}?`,
      valor,
      expression: `(${n}+1)*${alvo}-${n}*${media}`,
      format: 'plain',
      armadilhas: [
        alvo + dif, // cobriu a diferença de uma prova só
        valor + dif, // usou n+1 provas antigas
        valor - dif, // usou n−1
        alvo, // respondeu a própria média-alvo
      ],
      explanation: {
        pt:
          `Soma atual: ${n} × ${media} = ${num(n * media)}. Para média ${alvo} em ${n + 1} ` +
          `provas, a soma precisa ser ${n + 1} × ${alvo} = ${num((n + 1) * alvo)}. Falta ` +
          `${valor}. Atalho: a nova prova precisa de ${alvo} mais ${dif} ponto(s) para cada ` +
          `uma das ${n} provas antigas — ${alvo} + ${n} × ${dif}.`,
        en:
          `Current total: ${n} × ${media} = ${num(n * media)}. For an average of ${alvo} over ` +
          `${n + 1} tests the total must be ${n + 1} × ${alvo} = ${num((n + 1) * alvo)}. The ` +
          `gap is ${valor}. Shortcut: the new test needs ${alvo} plus ${dif} point(s) for each ` +
          `of the ${n} old tests — ${alvo} + ${n} × ${dif}.`,
      },
    }
  }

  const n = rng.int(5, 9)
  const novaMedia = rng.int(26, 38)
  const dif = rng.int(2, 4)
  const media = novaMedia + dif
  const valor = media + (n - 1) * dif
  return {
    stem:
      `The average age of a team of ${n} people is ${media}. When one person leaves, the ` +
      `average age of the remaining members drops to ${novaMedia}. How old is the person ` +
      `who left?`,
    valor,
    expression: `${n}*${media}-(${n}-1)*${novaMedia}`,
    format: 'plain',
    armadilhas: [
      media + n * dif, // usou n em vez de n−1 pessoas restantes
      valor - dif, // errou a contagem para o outro lado
      media + dif, // somou a diferença uma vez só
      media, // respondeu a média
    ],
    explanation: {
      pt:
        `Soma com ${n} pessoas: ${n} × ${media} = ${num(n * media)}. Soma das ${n - 1} que ` +
        `ficaram: ${n - 1} × ${novaMedia} = ${num((n - 1) * novaMedia)}. Quem saiu tem a ` +
        `diferença: ${valor}. A armadilha é multiplicar a média nova por ${n} — depois da ` +
        `saída sobram ${n - 1}.`,
      en:
        `Total with ${n} people: ${n} × ${media} = ${num(n * media)}. Total of the ${n - 1} ` +
        `who stayed: ${n - 1} × ${novaMedia} = ${num((n - 1) * novaMedia)}. The person who ` +
        `left is the difference: ${valor}. The trap is multiplying the new average by ${n} — ` +
        `after the departure only ${n - 1} remain.`,
    },
  }
}

const FRACOES: readonly (readonly [number, number])[] = [
  [1, 2], [1, 3], [1, 4], [1, 5], [2, 5], [3, 4], [2, 3], [3, 5], [1, 6], [3, 8], [1, 8], [3, 10],
]

const DIAS = ['Monday', 'Tuesday', 'Wednesday'] as const

const fracaoDoRestante: Template = (rng, d) => {
  const etapas = d >= 4 ? 3 : 2
  const fracoes = Array.from({ length: etapas }, () => rng.pick(FRACOES))
  const produtoDen = fracoes.reduce((acc, [, b]) => acc * b, 1)
  const total = sortear(() => {
    const t = produtoDen * rng.int(1, 40)
    return t >= 60 && t <= (d >= 4 ? 4000 : 1500) ? t : undefined
  })

  // Restante depois de cada etapa: r[0] = total, r[i] = r[i−1] × (1 − fração).
  const restos = [total]
  for (const [a, b] of fracoes) {
    const anterior = restos[restos.length - 1] as number
    restos.push((anterior * (b - a)) / b)
  }
  const valor = restos[etapas] as number
  const penultimo = restos[etapas - 1] as number
  const [ua, ub] = fracoes[etapas - 1] as readonly [number, number]
  const somaFracoes = fracoes.reduce((acc, [a, b]) => acc + a / b, 0)

  const txt = (f: readonly [number, number]) => `${f[0]}/${f[1]}`
  const partes = fracoes.map((f, i) =>
    i === 0
      ? `On ${DIAS[i]}, ${txt(f)} of the water is used.`
      : `On ${DIAS[i]}, ${txt(f)} of the water that remains is used.`,
  )
  return {
    stem:
      `A tank holds ${num(total)} liters of water. ${partes.join(' ')} ` +
      `How many liters are left?`,
    valor,
    expression: `${total}` + fracoes.map(([a, b]) => `*(1-${a}/${b})`).join(''),
    format: 'plain',
    armadilhas: [
      total * (1 - somaFracoes), // aplicou todas as frações ao total
      ...(etapas === 3
        ? [(restos[1] as number) * (1 - fracoes.slice(1).reduce((acc, [a, b]) => acc + a / b, 0))]
        : []), // acertou a 1ª base, errou a 2ª
      total - valor, // respondeu o que foi usado
      penultimo, // parou uma etapa antes
      (penultimo * ua) / ub, // respondeu o gasto da última etapa
    ],
    explanation: {
      pt:
        `Cada fração incide sobre o que SOBROU, não sobre o tanque cheio: ` +
        restos.map((r) => num(r)).join(' → ') +
        `. Resposta: ${num(valor)}. Somar as frações e aplicar ao total ` +
        `(${fracoes.map(txt).join(' + ')}) é o erro que o enunciado quer provocar.`,
      en:
        `Each fraction applies to what is LEFT, not to the full tank: ` +
        restos.map((r) => num(r)).join(' → ') +
        `. Answer: ${num(valor)}. Adding the fractions and applying them to the total ` +
        `(${fracoes.map(txt).join(' + ')}) is exactly the mistake the wording invites.`,
    },
  }
}

const mediaPonderada: Template = (rng, d) => {
  if (d === 4) {
    const { n1, n2, a1, a2, dif, total } = sortear(() => {
      const n1 = rng.int(12, 35)
      const n2 = rng.int(12, 35)
      const a1 = rng.int(58, 80)
      const dif = 2 * rng.int(3, 9)
      const total = n1 + n2
      if (n1 === n2 || (n2 * dif) % total !== 0) return undefined
      return { n1, n2, a1, a2: a1 + dif, dif, total }
    })
    const valor = a1 + (n2 * dif) / total
    return {
      stem:
        `On a skills test, the ${n1} people on Team A scored an average of ${a1} points and ` +
        `the ${n2} people on Team B scored an average of ${a2} points. What is the average ` +
        `score of everyone on both teams?`,
      valor,
      expression: `(${n1}*${a1}+${n2}*${a2})/(${n1}+${n2})`,
      format: 'plain',
      armadilhas: [
        (a1 + a2) / 2, // média das médias
        a1 + (n1 * dif) / total, // pesos trocados
        a1 + (n2 * dif) / n1, // dividiu pelo grupo em vez do total
      ],
      explanation: {
        pt:
          `Média de grupos de tamanhos diferentes pede os TOTAIS: ${n1} × ${a1} + ${n2} × ` +
          `${a2} = ${num(n1 * a1 + n2 * a2)} pontos, divididos por ${total} pessoas = ` +
          `${valor}. A média simples ${num((a1 + a2) / 2)} ignora que o time ` +
          `${n1 > n2 ? 'A' : 'B'} pesa mais.`,
        en:
          `Averaging groups of different sizes needs the TOTALS: ${n1} × ${a1} + ${n2} × ` +
          `${a2} = ${num(n1 * a1 + n2 * a2)} points, divided by ${total} people = ${valor}. ` +
          `The plain average ${num((a1 + a2) / 2)} ignores that Team ${n1 > n2 ? 'A' : 'B'} ` +
          `weighs more.`,
      },
    }
  }

  const { n1, n2, a1, m, valor } = sortear(() => {
    const n1 = rng.int(15, 40)
    const n2 = rng.int(5, 20)
    const a1 = rng.int(58, 80)
    const m = a1 + rng.int(1, 6)
    if (((m - a1) * n1) % n2 !== 0) return undefined
    const valor = m + ((m - a1) * n1) / n2
    return valor <= 100 ? { n1, n2, a1, m, valor } : undefined
  })
  return {
    stem:
      `A class of ${n1} students had an average score of ${a1}. After ${n2} new students ` +
      `joined, the class average rose to ${m}. What is the average score of the new students?`,
    valor,
    expression: `((${n1}+${n2})*${m}-${n1}*${a1})/${n2}`,
    format: 'plain',
    armadilhas: [
      2 * m - a1, // supôs grupos do mesmo tamanho
      m + ((m - a1) * n2) / n1, // inverteu os pesos
      m + ((m - a1) * (n1 + n2)) / n2, // usou o total no lugar da turma antiga
    ],
    explanation: {
      pt:
        `Soma nova: ${n1 + n2} × ${m} = ${num((n1 + n2) * m)}. Soma antiga: ${n1} × ${a1} = ` +
        `${num(n1 * a1)}. Os novos somam a diferença, ${num((n1 + n2) * m - n1 * a1)}, e têm ` +
        `média ${valor}. Supor grupos do mesmo tamanho dá ${2 * m - a1} — errado, porque os ` +
        `${n2} novos precisam puxar ${n1} antigos.`,
      en:
        `New total: ${n1 + n2} × ${m} = ${num((n1 + n2) * m)}. Old total: ${n1} × ${a1} = ` +
        `${num(n1 * a1)}. The newcomers account for the difference, ` +
        `${num((n1 + n2) * m - n1 * a1)}, an average of ${valor}. Assuming equal groups ` +
        `gives ${2 * m - a1} — wrong, because ${n2} newcomers have to pull up ${n1} students.`,
    },
  }
}

const desfazer: Template = (rng, d) => {
  const nome = rng.pick(NOMES)

  if (d === 4) {
    const { a, b, inicio, gasto, sobra } = sortear(() => {
      const [a, b] = rng.pick([[1, 4], [1, 3], [2, 5], [1, 5], [3, 8], [2, 3]] as const)
      const inicio = b * rng.int(8, 60)
      const gasto = rng.int(6, 45)
      const sobra = (inicio * (b - a)) / b - gasto
      return sobra >= 10 ? { a, b, inicio, gasto, sobra } : undefined
    })
    const f = a / b
    return {
      stem:
        `${nome} spent ${a}/${b} of the money in a wallet on a jacket, then spent $${gasto} ` +
        `on lunch. $${sobra} is left. How much money was in the wallet at the start?`,
      valor: inicio,
      expression: `(${sobra}+${gasto})/(1-${a}/${b})`,
      format: 'currency',
      armadilhas: [
        sobra / (1 - f) + gasto, // desfez na ordem errada
        (sobra + gasto) * (1 + f), // aplicou a fração ao que sobrou
        (sobra - gasto) / (1 - f), // trocou o sinal do almoço
        sobra + gasto, // esqueceu a fração
      ],
      explanation: {
        pt:
          `Desfaça de trás para frente: antes do almoço havia $${sobra} + $${gasto} = ` +
          `$${sobra + gasto}. Isso é o que restou depois de gastar ${a}/${b}, ou seja ` +
          `${b - a}/${b} do valor inicial: $${sobra + gasto} ÷ ${b - a}/${b} = ${usd(inicio)}. ` +
          `Somar ${a}/${b} de $${sobra + gasto} erra a base — a fração era do valor inicial.`,
        en:
          `Undo it backwards: before lunch there was $${sobra} + $${gasto} = ` +
          `$${sobra + gasto}. That is what remained after spending ${a}/${b}, i.e. ` +
          `${b - a}/${b} of the start: $${sobra + gasto} ÷ ${b - a}/${b} = ${usd(inicio)}. ` +
          `Adding ${a}/${b} of $${sobra + gasto} uses the wrong base — the fraction was of ` +
          `the starting amount.`,
      },
    }
  }

  const { f1, f2, inicio, gasto, sobra, aposAluguel } = sortear(() => {
    const f1 = rng.pick([[1, 4], [1, 3], [2, 5], [1, 5], [3, 10]] as const)
    const f2 = rng.pick([[1, 4], [1, 3], [2, 5], [1, 5], [1, 6]] as const)
    const inicio = f1[1] * f2[1] * rng.int(8, 40)
    const aposAluguel = (inicio * (f1[1] - f1[0])) / f1[1]
    const aposMercado = (aposAluguel * (f2[1] - f2[0])) / f2[1]
    const gasto = rng.int(12, 95)
    const sobra = aposMercado - gasto
    return sobra >= 20 ? { f1, f2, inicio, gasto, sobra, aposAluguel } : undefined
  })
  const resta1 = 1 - f1[0] / f1[1]
  const resta2 = 1 - f2[0] / f2[1]
  return {
    stem:
      `${nome} spent ${f1[0]}/${f1[1]} of a monthly budget on rent and ${f2[0]}/${f2[1]} of ` +
      `what remained on groceries, then $${gasto} on transport. $${num(sobra)} was left. ` +
      `What was the monthly budget?`,
    valor: inicio,
    expression: `(${sobra}+${gasto})/((1-${f1[0]}/${f1[1]})*(1-${f2[0]}/${f2[1]}))`,
    format: 'currency',
    armadilhas: [
      (sobra + gasto) / (1 - f1[0] / f1[1] - f2[0] / f2[1]), // frações sobre o total
      sobra / (resta1 * resta2) + gasto, // desfez na ordem errada
      (sobra + gasto) / resta1, // esqueceu a fração do mercado
      (sobra + gasto) / resta2, // esqueceu a do aluguel
    ],
    explanation: {
      pt:
        `De trás para frente: antes do transporte, ${usd(sobra + gasto)}. Isso é ` +
        `${f2[1] - f2[0]}/${f2[1]} do que sobrou do aluguel, que portanto era ` +
        `${usd(aposAluguel)}. E isso é ${f1[1] - f1[0]}/${f1[1]} do orçamento: ` +
        `${usd(inicio)}. Somar ${f1[0]}/${f1[1]} + ${f2[0]}/${f2[1]} trata a segunda fração ` +
        `como se fosse do total — ela é do restante.`,
      en:
        `Backwards: before transport, ${usd(sobra + gasto)}. That is ` +
        `${f2[1] - f2[0]}/${f2[1]} of what was left after rent, which was therefore ` +
        `${usd(aposAluguel)}. And that is ${f1[1] - f1[0]}/${f1[1]} of the budget: ` +
        `${usd(inicio)}. Adding ${f1[0]}/${f1[1]} + ${f2[0]}/${f2[1]} treats the second ` +
        `fraction as a share of the total — it is a share of the remainder.`,
    },
  }
}

// --- Porcentagem -------------------------------------------------------------

const ITENS_LOJA: readonly (readonly [string, string])[] = [
  ['shirt', 'pair of jeans'],
  ['lamp', 'rug'],
  ['backpack', 'pair of shoes'],
  ['jacket', 'scarf'],
  ['kettle', 'toaster'],
  ['desk', 'chair'],
]

const descontoCesta: Template = (rng, d) => {
  const [a, b] = rng.pick(ITENS_LOJA)
  const p1 = rng.int(3, 16) * 5
  const p2 = sortear(() => {
    const p = rng.int(3, 16) * 5
    return p !== p1 ? p : undefined
  })
  const total = p1 + p2

  if (d === 1) {
    const pct = rng.pick([10, 20, 25, 50])
    const valor = c2((total * (100 - pct)) / 100)
    return {
      stem:
        `A store sells a ${a} for $${p1} and a ${b} for $${p2}. Today everything is ` +
        `${pct}% off. How much do you pay for both items?`,
      valor,
      expression: `(${p1}+${p2})*(100-${pct})/100`,
      format: 'currency',
      armadilhas: [
        total - pct, // tratou os % como dólares
        (p1 * (100 - pct)) / 100 + p2, // descontou só o primeiro item
        p1 + (p2 * (100 - pct)) / 100, // descontou só o segundo
        total, // esqueceu o desconto
        (total * pct) / 100, // devolveu só o desconto
      ],
      explanation: {
        pt:
          `Some primeiro: $${p1} + $${p2} = $${total}. Com ${pct}% de desconto você paga ` +
          `${100 - pct}%: $${total} × 0.${String(100 - pct).padStart(2, '0')} = ${usd(valor)}. ` +
          `O desconto vale para os dois itens, não só para um.`,
        en:
          `Add first: $${p1} + $${p2} = $${total}. At ${pct}% off you pay ${100 - pct}%: ` +
          `$${total} × 0.${String(100 - pct).padStart(2, '0')} = ${usd(valor)}. The discount ` +
          `applies to both items, not just one.`,
      },
    }
  }

  const pct = rng.pick([15, 20, 25, 30, 35, 40])
  const cupom = rng.pick([5, 10, 15])
  const semCupom = c2((total * (100 - pct)) / 100)
  const valor = c2(semCupom - cupom)
  return {
    stem:
      `A store sells a ${a} for $${p1} and a ${b} for $${p2}. Today everything is ${pct}% ` +
      `off, and a $${cupom} coupon is then taken off the discounted total. How much do you ` +
      `pay for both items?`,
    valor,
    expression: `(${p1}+${p2})*(100-${pct})/100-${cupom}`,
    format: 'currency',
    armadilhas: [
      ((total - cupom) * (100 - pct)) / 100, // cupom antes do desconto
      semCupom, // esqueceu o cupom
      total - pct - cupom, // tratou os % como dólares
      semCupom + cupom, // somou o cupom
    ],
    explanation: {
      pt:
        `Total: $${total}. Com ${pct}% off: $${total} × ${(100 - pct) / 100} = ` +
        `${usd(semCupom)}. O cupom sai DEPOIS: ${usd(semCupom)} − $${cupom} = ${usd(valor)}. ` +
        `Tirar o cupom antes dá outro número — a ordem das operações está no enunciado.`,
      en:
        `Total: $${total}. At ${pct}% off: $${total} × ${(100 - pct) / 100} = ` +
        `${usd(semCupom)}. The coupon comes AFTER: ${usd(semCupom)} − $${cupom} = ` +
        `${usd(valor)}. Taking the coupon off first gives a different number — the order is ` +
        `in the wording.`,
    },
  }
}

const crescimento: Template = (rng, d) => {
  const base = d === 1 ? rng.int(3, 30) * 20 : rng.int(8, 60) * 20
  const pct = d === 1 ? rng.pick([10, 20, 25, 50]) : rng.pick([5, 15, 30, 35, 40, 45, 60, 75])
  const k = d === 1 ? rng.int(3, 30) : rng.int(10, 90)
  const aumentado = (base * (100 + pct)) / 100
  const valor = aumentado - k

  const stem =
    d === 1
      ? `A club had ${base} members. Membership grew by ${pct}%, and then ${k} members ` +
        `left. How many members does the club have now?`
      : `A shop sold ${num(base)} units in March. April sales were ${pct}% higher than ` +
        `March, and May sales were ${k} units lower than April. How many units did the shop ` +
        `sell in May?`
  return {
    stem,
    valor,
    expression: `${base}*(100+${pct})/100-${k}`,
    format: 'plain',
    armadilhas: [
      ((base - k) * (100 + pct)) / 100, // inverteu a ordem
      aumentado, // esqueceu a subtração
      base + pct - k, // tratou os % como unidades
      aumentado + k, // somou em vez de subtrair
    ],
    explanation: {
      pt:
        `${pct}% de ${num(base)} é ${num((base * pct) / 100)}, então o valor sobe para ` +
        `${num(aumentado)}. Depois tire ${k}: ${num(valor)}. A ordem importa — o percentual ` +
        `incide sobre ${num(base)}, antes da subtração.`,
      en:
        `${pct}% of ${num(base)} is ${num((base * pct) / 100)}, so it rises to ` +
        `${num(aumentado)}. Then take away ${k}: ${num(valor)}. Order matters — the percentage ` +
        `applies to ${num(base)}, before the subtraction.`,
    },
  }
}

const variacaoPercentual: Template = (rng) => {
  const item = rng.pick(['monthly phone plan', 'train ticket', 'gym membership', 'textbook'])
  const sobe = rng.next() < 0.5
  // Só percentuais em que o erro de base (dividir pelo preço novo) também dá
  // número exato — senão o erro mais comum nunca vira alternativa.
  const pct = sobe ? rng.pick([25, 60, 100]) : rng.pick([20, 50, 60])
  const de = rng.int(2, 30) * 20
  const para = (de * (sobe ? 100 + pct : 100 - pct)) / 100
  const dif = Math.abs(para - de)

  return {
    stem:
      `The price of a ${item} ${sobe ? 'rose' : 'fell'} from $${num(de)} to $${num(para)}. ` +
      `By what percent did the price ${sobe ? 'increase' : 'decrease'}?`,
    valor: pct,
    expression: sobe ? `(${para}-${de})/${de}*100` : `(${de}-${para})/${de}*100`,
    format: 'percent',
    armadilhas: [
      (dif / para) * 100, // base errada: dividiu pelo preço novo
      dif, // a diferença em dólares como se fosse %
      (para / de) * 100, // a razão novo/antigo
    ],
    explanation: {
      pt:
        `Variação: $${num(dif)}. Percentual é sempre sobre o valor de PARTIDA: ` +
        `${num(dif)} ÷ ${num(de)} = ${pct}%. Dividir pelo preço final é o erro mais comum ` +
        `aqui.`,
      en:
        `Change: $${num(dif)}. A percent change is always over the STARTING value: ` +
        `${num(dif)} ÷ ${num(de)} = ${pct}%. Dividing by the new price is the most common ` +
        `mistake here.`,
    },
  }
}

const precoOriginal: Template = (rng, d) => {
  if (d === 3) {
    if (rng.next() < 0.5) {
      const p = rng.pick([10, 15, 20, 25, 30, 35, 40])
      const original = rng.int(3, 40) * 20
      const final = (original * (100 - p)) / 100
      return {
        stem:
          `After a ${p}% discount, a coat costs $${num(final)}. What was the price before ` +
          `the discount?`,
        valor: original,
        expression: `${final}/(1-${p}/100)`,
        format: 'currency',
        armadilhas: [
          (final * (100 + p)) / 100, // aplicou o % ao preço final
          final + p, // tratou os % como dólares
          final / (1 + p / 100), // desfez como se fosse aumento
          (final * (100 - p)) / 100, // descontou de novo
        ],
        explanation: {
          pt:
            `Com ${p}% de desconto, $${num(final)} são ${100 - p}% do preço original. ` +
            `Original = ${num(final)} ÷ ${(100 - p) / 100} = ${usd(original)}. Somar ${p}% ` +
            `de $${num(final)} dá ${usd(c2((final * (100 + p)) / 100))} — o percentual era ` +
            `do preço ANTIGO, não do novo.`,
          en:
            `After ${p}% off, $${num(final)} is ${100 - p}% of the original. Original = ` +
            `${num(final)} ÷ ${(100 - p) / 100} = ${usd(original)}. Adding ${p}% of ` +
            `$${num(final)} gives ${usd(c2((final * (100 + p)) / 100))} — the percentage was ` +
            `of the OLD price, not the new one.`,
        },
      }
    }

    const p = rng.pick([4, 5, 8, 10, 12, 15, 20, 25])
    const original = rng.int(15, 90) * 100
    const final = (original * (100 + p)) / 100
    return {
      stem:
        `After a ${p}% raise, an employee's monthly salary is $${num(final)}. What was the ` +
        `salary before the raise?`,
      valor: original,
      expression: `${final}/(1+${p}/100)`,
      format: 'currency',
      armadilhas: [
        (final * (100 - p)) / 100, // tirou o % do salário novo
        final - p, // tratou os % como dólares
        final / (1 - p / 100), // desfez como se fosse desconto
      ],
      explanation: {
        pt:
          `O salário novo é ${100 + p}% do antigo. Antigo = ${num(final)} ÷ ` +
          `${(100 + p) / 100} = ${usd(original)}. Tirar ${p}% do salário novo dá menos, ` +
          `porque ${p}% de ${num(final)} é maior que ${p}% de ${num(original)}.`,
        en:
          `The new salary is ${100 + p}% of the old one. Old = ${num(final)} ÷ ` +
          `${(100 + p) / 100} = ${usd(original)}. Taking ${p}% off the new salary gives too ` +
          `little, because ${p}% of ${num(final)} is more than ${p}% of ${num(original)}.`,
      },
    }
  }

  const { p, t, original, final } = sortear(() => {
    const p = rng.pick([10, 15, 20, 25])
    const t = rng.pick([5, 6, 8, 10])
    const original = rng.int(4, 45) * 20
    const final = (original * (100 - p) * (100 + t)) / 10000
    return ehCentavo(final) ? { p, t, original, final: c2(final) } : undefined
  })
  return {
    stem:
      `A jacket was marked down by ${p}%, and then ${t}% sales tax was added to the sale ` +
      `price. The customer paid ${usd(final)}. What was the price before the discount?`,
    valor: original,
    expression: `${final}/((1-${p}/100)*(1+${t}/100))`,
    format: 'currency',
    armadilhas: [
      final / (1 - p / 100), // esqueceu o imposto
      final / (1 + t / 100), // esqueceu o desconto
      final / (1 - p / 100 + t / 100), // somou os percentuais
      final * (1 + p / 100) * (1 - t / 100), // inverteu os percentuais sobre o final
      (final * (100 + p - t)) / 100, // somou os percentuais invertidos sobre o final
    ],
    explanation: {
      pt:
        `O pago é original × ${(100 - p) / 100} × ${(100 + t) / 100}. Desfaça as duas ` +
        `etapas: ${usd(final)} ÷ ${(100 + t) / 100} = ${usd(c2(final / (1 + t / 100)))}, ` +
        `depois ÷ ${(100 - p) / 100} = ${usd(original)}. Desfazer só uma das etapas dá um ` +
        `valor próximo — e errado.`,
      en:
        `What was paid is original × ${(100 - p) / 100} × ${(100 + t) / 100}. Undo both ` +
        `steps: ${usd(final)} ÷ ${(100 + t) / 100} = ${usd(c2(final / (1 + t / 100)))}, then ` +
        `÷ ${(100 - p) / 100} = ${usd(original)}. Undoing only one of the steps gives a close ` +
        `number — and a wrong one.`,
    },
  }
}

const descontosSucessivos: Template = (rng, d) => {
  if (d === 3) {
    const preco = rng.int(5, 40) * 20
    const p1 = rng.pick([10, 20, 25, 30, 40])
    const p2 = rng.pick([10, 15, 20, 25, 50].filter((v) => v !== p1))
    const meio = (preco * (100 - p1)) / 100
    const valor = c2((meio * (100 - p2)) / 100)
    return {
      stem:
        `A $${num(preco)} coat is discounted by ${p1}%, and the sale price is then reduced by ` +
        `another ${p2}%. What is the final price?`,
      valor,
      expression: `${preco}*(1-${p1}/100)*(1-${p2}/100)`,
      format: 'currency',
      armadilhas: [
        (preco * (100 - p1 - p2)) / 100, // somou os descontos
        meio, // parou no primeiro desconto
        (preco * (100 - p2)) / 100, // aplicou só o segundo
        preco - p1 - p2, // tratou os % como dólares
      ],
      explanation: {
        pt:
          `O segundo desconto incide sobre o preço JÁ descontado: $${num(preco)} × ` +
          `${(100 - p1) / 100} = ${usd(meio)}; × ${(100 - p2) / 100} = ${usd(valor)}. ` +
          `Somar ${p1}% + ${p2}% = ${p1 + p2}% sobre o original desconta demais.`,
        en:
          `The second discount applies to the ALREADY reduced price: $${num(preco)} × ` +
          `${(100 - p1) / 100} = ${usd(meio)}; × ${(100 - p2) / 100} = ${usd(valor)}. Adding ` +
          `${p1}% + ${p2}% = ${p1 + p2}% off the original takes off too much.`,
      },
    }
  }

  if (d === 4) {
    const { preco, a, b, valor } = sortear(() => {
      const preco = rng.int(12, 90) * 10
      const a = rng.pick([10, 15, 20, 25, 30, 40])
      const b = rng.pick([10, 15, 20, 25, 30, 40])
      const valor = (preco * (100 + a) * (100 - b)) / 10000
      return ehCentavo(valor) ? { preco, a, b, valor: c2(valor) } : undefined
    })
    const subiu = (preco * (100 + a)) / 100
    return {
      stem:
        `A bicycle was priced at $${num(preco)}. Its price was raised by ${a}%, and later ` +
        `the new price was cut by ${b}%. What is the price now?`,
      valor,
      expression: `${preco}*(1+${a}/100)*(1-${b}/100)`,
      format: 'currency',
      armadilhas: [
        (preco * (100 + a - b)) / 100, // somou os percentuais
        preco, // achou que os percentuais se anulam
        subiu, // esqueceu o corte
        (preco * (100 - b)) / 100, // esqueceu o aumento
      ],
      explanation: {
        pt:
          `Aumento: $${num(preco)} × ${(100 + a) / 100} = ${usd(subiu)}. O corte de ${b}% é ` +
          `sobre ESSE valor: × ${(100 - b) / 100} = ${usd(valor)}. Percentuais em sequência ` +
          `se multiplicam — ${a}% para cima e ${b}% para baixo não somam ${a - b}%.`,
        en:
          `Raise: $${num(preco)} × ${(100 + a) / 100} = ${usd(subiu)}. The ${b}% cut applies ` +
          `to THAT amount: × ${(100 - b) / 100} = ${usd(valor)}. Successive percentages ` +
          `multiply — up ${a}% and down ${b}% is not a net ${a - b}%.`,
      },
    }
  }

  const { preco, a, b, c, valor } = sortear(() => {
    const preco = rng.int(24, 180) * 5
    const a = rng.pick([10, 20, 25, 30])
    const b = rng.pick([10, 15, 20, 25])
    const c = rng.pick([5, 10, 15, 20])
    const valor = (preco * (100 + a) * (100 - b) * (100 - c)) / 1_000_000
    return ehCentavo(valor) ? { preco, a, b, c, valor: c2(valor) } : undefined
  })
  const subiu = (preco * (100 + a)) / 100
  const segundo = (subiu * (100 - b)) / 100
  return {
    stem:
      `A sofa cost $${num(preco)}. The store raised the price by ${a}%, then offered ${b}% ` +
      `off the new price, and at checkout took a further ${c}% off the sale price. What did ` +
      `the customer pay?`,
    valor,
    expression: `${preco}*(1+${a}/100)*(1-${b}/100)*(1-${c}/100)`,
    format: 'currency',
    armadilhas: [
      (preco * (100 + a - b - c)) / 100, // somou tudo
      (subiu * (100 - b - c)) / 100, // somou só os dois descontos
      segundo, // esqueceu o último desconto
      (preco * (100 - b) * (100 - c)) / 10000, // esqueceu o aumento
    ],
    explanation: {
      pt:
        `Um fator por etapa: $${num(preco)} × ${(100 + a) / 100} × ${(100 - b) / 100} × ` +
        `${(100 - c) / 100}. Passo a passo: ${usd(subiu)} → ${usd(c2(segundo))} → ` +
        `${usd(valor)}. Somar ${a} − ${b} − ${c} = ${a - b - c}% é o atalho que parece certo ` +
        `e não é.`,
      en:
        `One factor per step: $${num(preco)} × ${(100 + a) / 100} × ${(100 - b) / 100} × ` +
        `${(100 - c) / 100}. Step by step: ${usd(subiu)} → ${usd(c2(segundo))} → ` +
        `${usd(valor)}. Adding ${a} − ${b} − ${c} = ${a - b - c}% is the shortcut that looks ` +
        `right and is not.`,
    },
  }
}

const juros: Template = (rng, d) => {
  const nome = rng.pick(NOMES)

  if (d === 4) {
    const p = rng.int(4, 40) * 500
    const r = rng.pick([2, 3, 4, 5, 6, 8])
    const t = rng.int(2, 5)
    const valor = (p * (100 + r * t)) / 100
    const umAno = (p * r) / 100
    return {
      stem:
        `${nome} deposits $${num(p)} in an account that pays ${r}% simple interest per ` +
        `year. How much will the account hold after ${t} years?`,
      valor,
      expression: `${p}*(1+${r}*${t}/100)`,
      format: 'currency',
      armadilhas: [
        p * (1 + r / 100) ** t, // compôs os juros
        p + umAno, // contou um ano só
        p + umAno * (t - 1), // um ano a menos
        p + umAno * (t + 1), // um ano a mais
      ],
      explanation: {
        pt:
          `Juros simples rendem o MESMO valor todo ano: ${r}% de $${num(p)} = ` +
          `$${num(umAno)} por ano. Em ${t} anos, $${num(umAno * t)}; o saldo é ` +
          `${usd(valor)}. Compor os juros (juros sobre juros) dá um pouco mais — e é outra ` +
          `pergunta.`,
        en:
          `Simple interest earns the SAME amount every year: ${r}% of $${num(p)} = ` +
          `$${num(umAno)} a year. Over ${t} years, $${num(umAno * t)}; the balance is ` +
          `${usd(valor)}. Compounding (interest on interest) gives a bit more — and answers a ` +
          `different question.`,
      },
    }
  }

  const p = rng.int(20, 90) * 100
  const r = rng.pick([4, 5, 6, 8, 10, 12])
  const umAno = (p * r) / 100
  const valor = c2((umAno * (100 + r)) / 100)
  return {
    stem:
      `${nome} invests $${num(p)} at ${r}% interest, compounded annually. How much interest ` +
      `does the investment earn in the second year alone?`,
    valor,
    expression: `${p}*(1+${r}/100)*${r}/100`,
    format: 'currency',
    armadilhas: [
      umAno, // juros do primeiro ano
      (p * ((1 + r / 100) ** 2 - 1)) / 2, // média dos dois anos
      p * ((1 + r / 100) ** 2 - 1), // juros dos dois anos juntos
    ],
    explanation: {
      pt:
        `No 1º ano rende ${r}% de $${num(p)} = $${num(umAno)}, e o saldo vira ` +
        `$${num(p + umAno)}. No 2º ano os ${r}% incidem sobre esse saldo: ` +
        `${usd(valor)}. É mais que o 1º ano justamente pelos juros sobre juros.`,
      en:
        `Year 1 earns ${r}% of $${num(p)} = $${num(umAno)}, so the balance becomes ` +
        `$${num(p + umAno)}. In year 2 the ${r}% applies to that balance: ${usd(valor)}. It is ` +
        `more than year 1 precisely because of interest on interest.`,
    },
  }
}

const markup: Template = (rng, d) => {
  const comImposto = d === 5
  const { custo, m, desc, t, valor } = sortear(() => {
    const custo = rng.int(8, 90) * 5
    const m = rng.pick([20, 25, 30, 40, 50, 60])
    const desc = rng.pick([10, 15, 20, 25, 30])
    const t = comImposto ? rng.pick([5, 8, 10]) : 0
    const valor = (custo * (100 + m) * (100 - desc) * (100 + t)) / 1_000_000
    return ehCentavo(valor) ? { custo, m, desc, t, valor: c2(valor) } : undefined
  })
  const marcado = (custo * (100 + m)) / 100
  const vendido = (marcado * (100 - desc)) / 100

  const imposto = comImposto ? `, and ${t}% sales tax is added at the register` : ''
  return {
    stem:
      `A shop buys a lamp for $${num(custo)} and marks the price up by ${m}%. During a sale ` +
      `the lamp is sold at ${desc}% off the marked price${imposto}. What does the customer ` +
      `pay?`,
    valor,
    expression: comImposto
      ? `${custo}*(1+${m}/100)*(1-${desc}/100)*(1+${t}/100)`
      : `${custo}*(1+${m}/100)*(1-${desc}/100)`,
    format: 'currency',
    armadilhas: [
      (custo * (100 + m - desc + t)) / 100, // somou os percentuais
      custo * (1 + (m / 100) * (1 - desc / 100)) * (1 + t / 100), // descontou só a margem
      ...(comImposto ? [vendido] : []), // esqueceu o imposto
      marcado * (1 + t / 100), // esqueceu o desconto
    ],
    explanation: {
      pt:
        `Preço marcado: $${num(custo)} × ${(100 + m) / 100} = ${usd(marcado)}. Com ${desc}% ` +
        `off: ${usd(c2(vendido))}` +
        (comImposto ? `; com ${t}% de imposto: ${usd(valor)}` : '') +
        `. Cada percentual incide sobre o valor da etapa anterior — somar ` +
        `${m}${comImposto ? ` − ${desc} + ${t}` : ` − ${desc}`} ignora isso.`,
      en:
        `Marked price: $${num(custo)} × ${(100 + m) / 100} = ${usd(marcado)}. At ${desc}% ` +
        `off: ${usd(c2(vendido))}` +
        (comImposto ? `; with ${t}% tax: ${usd(valor)}` : '') +
        `. Each percentage applies to the result of the step before — adding ` +
        `${m}${comImposto ? ` − ${desc} + ${t}` : ` − ${desc}`} ignores that.`,
    },
  }
}

// --- Razão e proporção -------------------------------------------------------

const PARES: readonly (readonly [string, string, string])[] = [
  ['shirts', 'trousers', 'stockroom'],
  ['red marbles', 'blue marbles', 'bag'],
  ['adults', 'children', 'theater'],
  ['cars', 'vans', 'parking lot'],
  ['apples', 'oranges', 'crate'],
]

const razaoSimples: Template = (rng, d) => {
  const [coisaA, coisaB, lugar] = rng.pick(PARES)
  const a = rng.int(2, 9)
  const b = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 11].filter((v) => v !== a && mdc(v, a) === 1))
  const k = rng.int(3, d === 1 ? 15 : 25)
  const x = a * k
  const outro = b * k
  const total = x + outro

  const pergunta =
    d === 1
      ? `how many ${coisaB} are there?`
      : `how many ${coisaA} and ${coisaB} are there altogether?`
  const valor = d === 1 ? outro : total
  return {
    stem:
      `The ratio of ${coisaA} to ${coisaB} in a ${lugar} is ${a}:${b}. If there are ` +
      `${num(x)} ${coisaA}, ${pergunta}`,
    valor,
    expression: d === 1 ? `${x}/${a}*${b}` : `${x}/${a}*(${a}+${b})`,
    format: 'plain',
    armadilhas:
      d === 1
        ? [
            (x * a) / b, // inverteu a razão
            x + (b - a), // raciocínio aditivo
            total, // respondeu o total
            outro + b, // contou um grupo a mais
          ]
        : [
            outro, // respondeu só a outra parte
            x + (x * a) / b, // inverteu a razão
            2 * x + (b - a), // raciocínio aditivo
            total + a + b, // contou um grupo a mais
          ],
    explanation: {
      pt:
        `${a}:${b} quer dizer grupos de ${a} ${coisaA} para ${b} ${coisaB}. ${num(x)} ÷ ${a} = ` +
        `${k} grupos` +
        (d === 1
          ? `, então ${k} × ${b} = ${num(outro)}.`
          : `, cada um com ${a + b} itens: ${k} × ${a + b} = ${num(total)}.`) +
        ` Razão é multiplicativa: somar a diferença (${b - a}) não escala.`,
      en:
        `${a}:${b} means groups of ${a} ${coisaA} for ${b} ${coisaB}. ${num(x)} ÷ ${a} = ` +
        `${k} groups` +
        (d === 1
          ? `, so ${k} × ${b} = ${num(outro)}.`
          : `, each with ${a + b} items: ${k} × ${a + b} = ${num(total)}.`) +
        ` A ratio is multiplicative: adding the difference (${b - a}) does not scale.`,
    },
  }
}

const proporcaoDireta: Template = (rng, d) => {
  if (d === 1) {
    const item = rng.pick(['notebooks', 'light bulbs', 'towels', 'mugs'])
    const unidades = rng.int(2, 9)
    const custoUnit = rng.pick([1.5, 2.5, 3, 4, 4.5, 6, 7.5, 8, 12])
    const alvo = sortear(() => {
      const v = rng.int(unidades + 2, unidades + 12)
      return v % unidades !== 0 ? v : undefined
    })
    const precoBase = c2(unidades * custoUnit)
    const valor = c2(alvo * custoUnit)
    return {
      stem:
        `${unidades} ${item} cost ${usd(precoBase)}. At the same price each, how much do ` +
        `${alvo} ${item} cost?`,
      valor,
      expression: `${precoBase}/${unidades}*${alvo}`,
      format: 'currency',
      armadilhas: [
        precoBase + (alvo - unidades), // somou a diferença de unidades como dólares
        (alvo - unidades) * custoUnit, // calculou só as unidades extras
        valor - custoUnit, // contou uma unidade a menos
        (precoBase * alvo) / (unidades + 1), // dividiu pela quantidade errada
      ],
      explanation: {
        pt:
          `Preço unitário: ${usd(precoBase)} ÷ ${unidades} = ${usd(custoUnit)}. Vezes ` +
          `${alvo}: ${usd(valor)}. Em proporção direta, ache o valor de UMA unidade antes de ` +
          `escalar.`,
        en:
          `Unit price: ${usd(precoBase)} ÷ ${unidades} = ${usd(custoUnit)}. Times ${alvo}: ` +
          `${usd(valor)}. In direct proportion, find the price of ONE unit before scaling.`,
      },
    }
  }

  const unit = rng.pick([0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 1.25])
  const duzia = c2(unit * 12)
  const n = sortear(() => {
    const v = rng.int(14, 70)
    return v % 12 !== 0 ? v : undefined
  })
  const valor = c2(unit * n)
  return {
    stem:
      `Pencils are sold at ${usd(duzia)} per dozen. At the same price per pencil, how much ` +
      `do ${n} pencils cost?`,
    valor,
    expression: `${duzia}/12*${n}`,
    format: 'currency',
    armadilhas: [
      (duzia * n) / 10, // tratou a dúzia como 10
      duzia * Math.ceil(n / 12), // pagou dúzias inteiras
      duzia * Math.floor(n / 12), // pagou só as dúzias completas
      duzia + unit * (n % 12), // contou uma dúzia só mais as avulsas
    ],
    explanation: {
      pt:
        `Uma dúzia são 12: ${usd(duzia)} ÷ 12 = ${usd(unit)} por lápis. ${n} lápis: ` +
        `${usd(valor)}. A conversão de unidade (dúzia → unidade) é o passo que o enunciado ` +
        `esconde.`,
      en:
        `A dozen is 12: ${usd(duzia)} ÷ 12 = ${usd(unit)} per pencil. ${n} pencils: ` +
        `${usd(valor)}. The unit conversion (dozen → single) is the step the wording hides.`,
    },
  }
}

const TRIOS: readonly (readonly [number, number, number])[] = [
  [3, 4, 5], [4, 5, 6], [5, 6, 7], [2, 3, 4], [3, 4, 6], [4, 5, 7],
  [5, 6, 8], [6, 7, 8], [5, 7, 8], [4, 6, 7], [7, 8, 10], [3, 5, 6],
]

const razaoComTotal: Template = (rng, d) => {
  if (d === 2) {
    const a = rng.int(2, 7)
    const b = rng.pick([3, 4, 5, 6, 7, 8, 9].filter((v) => v !== a && mdc(v, a) === 1))
    const k = rng.int(4, 20)
    const total = (a + b) * k
    const valor = b * k
    return {
      stem:
        `A class has ${total} students, and the ratio of boys to girls is ${a}:${b}. How ` +
        `many girls are in the class?`,
      valor,
      expression: `${total}/(${a}+${b})*${b}`,
      format: 'plain',
      armadilhas: [
        a * k, // respondeu os meninos
        Math.abs(b - a) * k, // respondeu a diferença
        total / 2, // dividiu meio a meio
      ],
      explanation: {
        pt:
          `A razão ${a}:${b} divide a turma em ${a + b} partes iguais: ${total} ÷ ${a + b} = ` +
          `${k}. Meninas são ${b} partes: ${valor}. O total da razão é ${a} + ${b}, não ${b}.`,
        en:
          `A ${a}:${b} ratio splits the class into ${a + b} equal parts: ${total} ÷ ${a + b} = ` +
          `${k}. Girls are ${b} parts: ${valor}. The ratio total is ${a} + ${b}, not ${b}.`,
      },
    }
  }

  const [a, b, c] = rng.pick(TRIOS)
  const k = rng.int(15, 60)
  const total = (a + b + c) * k
  const valor = b * k
  return {
    stem:
      `A prize of $${num(total)} is shared among Ana, Ben and Cara in the ratio ${a}:${b}:${c}. ` +
      `How much does Ben receive?`,
    valor,
    expression: `${total}/(${a}+${b}+${c})*${b}`,
    format: 'currency',
    armadilhas: [
      a * k, // a parte da Ana
      c * k, // a parte da Cara
      total / 3, // dividiu igualmente
      (total * b) / (a + b), // ignorou a terceira pessoa
    ],
    explanation: {
      pt:
        `São ${a} + ${b} + ${c} = ${a + b + c} partes: $${num(total)} ÷ ${a + b + c} = ` +
        `$${k} por parte. Ben tem ${b} partes: ${usd(valor)}. Com três pessoas, o divisor é a ` +
        `soma dos TRÊS termos.`,
      en:
        `There are ${a} + ${b} + ${c} = ${a + b + c} parts: $${num(total)} ÷ ${a + b + c} = ` +
        `$${k} per part. Ben has ${b} parts: ${usd(valor)}. With three people, the divisor is ` +
        `the sum of all THREE terms.`,
    },
  }
}

const proporcaoInversa: Template = (rng) => {
  const quem = rng.pick(['painters', 'workers', 'cleaners', 'builders'])
  const { w1, w2, d1, valor } = sortear(() => {
    const w1 = rng.int(5, 15)
    const w2 = w1 + rng.pick([-2, -1, 1, 2, 3])
    // d1 múltiplo do que torna exatos a resposta e os erros de proporção direta.
    const passo = mmc(w2 / mdc(w1, w2), w1 / mdc(w1, Math.abs(w2 - w1)))
    if (passo > 60) return undefined
    const d1 = passo * rng.int(1, Math.floor(60 / passo))
    return d1 >= 8 ? { w1, w2, d1, valor: (w1 * d1) / w2 } : undefined
  })
  return {
    stem:
      `${w1} ${quem} can finish a job in ${d1} days. Working at the same rate, how many ` +
      `days would ${w2} ${quem} need to finish the same job?`,
    valor,
    expression: `${w1}*${d1}/${w2}`,
    format: 'plain',
    armadilhas: [
      (d1 * w2) / w1, // tratou como proporção direta
      d1 - (w2 - w1), // raciocínio aditivo
      d1 * (2 - w2 / w1), // "x% mais gente, x% menos dias"
    ],
    explanation: {
      pt:
        `O trabalho total é ${w1} × ${d1} = ${w1 * d1} pessoa-dias. Com ${w2} pessoas: ` +
        `${w1 * d1} ÷ ${w2} = ${valor} dias. Mais gente, MENOS dias — é proporção inversa, ` +
        `e nem somar a diferença nem aplicar o percentual ao contrário funciona.`,
      en:
        `The total job is ${w1} × ${d1} = ${w1 * d1} worker-days. With ${w2} people: ` +
        `${w1 * d1} ÷ ${w2} = ${valor} days. More people, FEWER days — it is inverse ` +
        `proportion, and neither adding the difference nor reversing the percentage works.`,
    },
  }
}

const proporcaoComposta: Template = (rng, d) => {
  // Razões perto de 1 (máquinas e horas mudam pouco): assim quem ignora um dos
  // fatores ou o inverte chega perto da resposta, e a estimativa não resolve.
  const { r, w1, h1, w2, h2 } = sortear(() => {
    if (d === 4) {
      const w1 = rng.int(4, 12)
      const h1 = rng.int(3, 9)
      const w2 = w1 + rng.pick([-2, -1, 1, 2])
      return { r: rng.int(3, 15), w1, h1, w2, h2: h1 + rng.pick([-2, -1, 1, 2]) }
    }
    // Aqui a resposta é o tempo: h1 múltiplo de w2 e h2 múltiplo de w1 deixam
    // inteiros os erros "ignorou os trabalhadores" e "ignorou a quantidade".
    const w1 = rng.int(3, 8)
    const w2 = w1 + rng.pick([-1, 1])
    const vezes = rng.int(4, 8)
    const h1 = (vezes + rng.pick([-1, 1])) * w2
    return w2 >= 2 ? { r: rng.int(2, 9), w1, h1, w2, h2: vezes * w1 } : undefined
  })
  const n1 = r * w1 * h1
  const n2 = r * w2 * h2

  if (d === 4) {
    return {
      stem:
        `${w1} machines produce ${num(n1)} parts in ${h1} hours. At the same rate, how many ` +
        `parts would ${w2} machines produce in ${h2} hours?`,
      valor: n2,
      expression: `${n1}/(${w1}*${h1})*${w2}*${h2}`,
      format: 'plain',
      armadilhas: [
        (n1 * w1 * h2) / (w2 * h1), // inverteu a relação das máquinas
        (n1 * w2 * h1) / (w1 * h2), // inverteu a das horas
        (n1 * w2) / w1, // ignorou as horas
        (n1 * h2) / h1, // ignorou as máquinas
      ],
      explanation: {
        pt:
          `Taxa por máquina-hora: ${num(n1)} ÷ (${w1} × ${h1}) = ${r} peças. Com ${w2} ` +
          `máquinas por ${h2} horas: ${r} × ${w2} × ${h2} = ${num(n2)}. As duas grandezas ` +
          `escalam a produção no mesmo sentido — reduza à unidade e depois multiplique.`,
        en:
          `Rate per machine-hour: ${num(n1)} ÷ (${w1} × ${h1}) = ${r} parts. With ${w2} ` +
          `machines for ${h2} hours: ${r} × ${w2} × ${h2} = ${num(n2)}. Both quantities scale ` +
          `output the same way — reduce to one unit, then multiply.`,
      },
    }
  }

  return {
    stem:
      `${w1} workers assemble ${num(n1)} chairs in ${h1} hours. Working at the same rate, ` +
      `how many hours would ${w2} workers need to assemble ${num(n2)} chairs?`,
    valor: h2,
    expression: `${n2}/(${n1}/(${w1}*${h1})*${w2})`,
    format: 'plain',
    armadilhas: [
      (h1 * n2 * w2) / (n1 * w1), // inverteu a relação dos trabalhadores
      (h1 * n2) / n1, // ignorou os trabalhadores
      (h1 * w1) / w2, // ignorou a quantidade
      (h1 * n1 * w1) / (n2 * w2), // inverteu a da quantidade
    ],
    explanation: {
      pt:
        `Taxa por trabalhador-hora: ${num(n1)} ÷ (${w1} × ${h1}) = ${r} cadeiras. ${w2} ` +
        `trabalhadores fazem ${r * w2} por hora; ${num(n2)} ÷ ${r * w2} = ${h2} horas. Mais ` +
        `gente reduz o tempo, mais cadeiras aumentam — cada grandeza tem seu sentido.`,
      en:
        `Rate per worker-hour: ${num(n1)} ÷ (${w1} × ${h1}) = ${r} chairs. ${w2} workers make ` +
        `${r * w2} an hour; ${num(n2)} ÷ ${r * w2} = ${h2} hours. More people cut the time, ` +
        `more chairs add to it — each quantity pulls its own way.`,
    },
  }
}

const mistura: Template = (rng, d) => {
  if (d === 4) {
    const { x, y, a, b, valor } = sortear(() => {
      const x = rng.int(2, 12) * 5
      const y = rng.int(2, 12) * 5
      const a = rng.int(1, 12) * 5
      const b = rng.int(1, 12) * 5
      if (x === y || a === b) return undefined
      const valor = (x * a + y * b) / (x + y)
      const umaCasa = Math.abs(valor * 10 - Math.round(valor * 10)) < 1e-9
      return umaCasa ? { x, y, a, b, valor } : undefined
    })
    return {
      stem:
        `${x} liters of a ${a}% salt solution are mixed with ${y} liters of a ${b}% salt ` +
        `solution. What is the salt concentration of the mixture?`,
      valor,
      expression: `(${x}*${a}+${y}*${b})/(${x}+${y})`,
      format: 'percent',
      armadilhas: [
        (a + b) / 2, // média simples das concentrações
        (y * a + x * b) / (x + y), // pesos trocados
        (x * a + y * b) / 100, // respondeu os litros de sal
        a + b, // somou as concentrações
      ],
      explanation: {
        pt:
          `Sal em cada parte: ${x} × ${a}% = ${num((x * a) / 100)} L e ${y} × ${b}% = ` +
          `${num((y * b) / 100)} L. Total ${num((x * a + y * b) / 100)} L de sal em ` +
          `${x + y} L: ${formatNumber(valor, 'percent')}. A média simples só vale com volumes ` +
          `iguais.`,
        en:
          `Salt in each part: ${x} × ${a}% = ${num((x * a) / 100)} L and ${y} × ${b}% = ` +
          `${num((y * b) / 100)} L. Total ${num((x * a + y * b) / 100)} L of salt in ${x + y} L: ` +
          `${formatNumber(valor, 'percent')}. The plain average only works with equal volumes.`,
      },
    }
  }

  const { x, y, p1, p2, lucro, custoMedio, valor } = sortear(() => {
    const x = rng.int(3, 20)
    const y = rng.int(3, 20)
    const p1 = rng.int(6, 16)
    const p2 = rng.int(8, 24)
    const lucro = rng.pick([10, 20, 25, 50])
    if (x === y || p1 === p2) return undefined
    const custoMedio = (x * p1 + y * p2) / (x + y)
    const valor = (custoMedio * (100 + lucro)) / 100
    return ehCentavo(custoMedio) && ehCentavo(valor)
      ? { x, y, p1, p2, lucro, custoMedio, valor: c2(valor) }
      : undefined
  })
  return {
    stem:
      `A roaster blends ${x} kg of coffee costing $${p1} per kg with ${y} kg costing $${p2} ` +
      `per kg. To make a ${lucro}% profit on cost, at what price per kg should the blend be ` +
      `sold?`,
    valor,
    expression: `(${x}*${p1}+${y}*${p2})/(${x}+${y})*(1+${lucro}/100)`,
    format: 'currency',
    armadilhas: [
      (((p1 + p2) / 2) * (100 + lucro)) / 100, // média simples dos preços
      custoMedio, // esqueceu o lucro
      (((y * p1 + x * p2) / (x + y)) * (100 + lucro)) / 100, // pesos trocados
    ],
    explanation: {
      pt:
        `Custo total: ${x} × $${p1} + ${y} × $${p2} = $${num(x * p1 + y * p2)} por ` +
        `${x + y} kg, ou ${usd(c2(custoMedio))}/kg. Com ${lucro}% de lucro: ` +
        `${usd(c2(custoMedio))} × ${(100 + lucro) / 100} = ${usd(valor)}. A média simples ` +
        `dos preços ignora que as quantidades são diferentes.`,
      en:
        `Total cost: ${x} × $${p1} + ${y} × $${p2} = $${num(x * p1 + y * p2)} for ${x + y} kg, ` +
        `or ${usd(c2(custoMedio))}/kg. With a ${lucro}% profit: ${usd(c2(custoMedio))} × ` +
        `${(100 + lucro) / 100} = ${usd(valor)}. The plain average of the prices ignores that ` +
        `the amounts differ.`,
    },
  }
}

// --- Taxa --------------------------------------------------------------------

const velocidade: Template = (rng, d) => {
  const nome = rng.pick(NOMES)

  if (d === 1) {
    const { v1, h1, v2, h2 } = sortear(() => {
      const v1 = rng.int(8, 30)
      const v2 = rng.int(8, 30)
      const h1 = rng.int(1, 4)
      const h2 = rng.int(1, 4)
      return v1 !== v2 && h1 !== h2 ? { v1, h1, v2, h2 } : undefined
    })
    const valor = v1 * h1 + v2 * h2
    return {
      stem:
        `${nome} cycles for ${h1} ${h1 === 1 ? 'hour' : 'hours'} at ${v1} km/h and then for ` +
        `${h2} ${h2 === 1 ? 'hour' : 'hours'} at ${v2} km/h. How many kilometers does ${nome} ` +
        `ride in total?`,
      valor,
      expression: `${v1}*${h1}+${v2}*${h2}`,
      format: 'plain',
      armadilhas: [
        ((v1 + v2) / 2) * (h1 + h2), // média das velocidades × tempo total
        v1 * h2 + v2 * h1, // trocou os tempos
        v1 * (h1 + h2), // usou uma velocidade só
        v2 * (h1 + h2),
      ],
      explanation: {
        pt:
          `Distância de cada trecho: ${v1} × ${h1} = ${v1 * h1} km e ${v2} × ${h2} = ` +
          `${v2 * h2} km. Total: ${valor} km. Tirar a média das velocidades só funciona se os ` +
          `tempos forem iguais — aqui não são.`,
        en:
          `Distance of each leg: ${v1} × ${h1} = ${v1 * h1} km and ${v2} × ${h2} = ` +
          `${v2 * h2} km. Total: ${valor} km. Averaging the speeds only works when the times ` +
          `are equal — here they are not.`,
      },
    }
  }

  const { v, km, minutos } = sortear(() => {
    const v = rng.pick([12, 15, 18, 20, 24, 30, 36, 40, 45])
    const minutos = rng.int(20, 150)
    const km = (v * minutos) / 60
    // minutos múltiplos de 3 → horas com duas casas, que é o que se lê errado como h:min
    return ehInteiro(km) && minutos % 60 !== 0 && minutos % 3 === 0 ? { v, km, minutos } : undefined
  })
  const horas = minutos / 60
  return {
    stem:
      `${nome} rides a bike at a steady ${v} km/h. How many minutes does it take ${nome} to ` +
      `ride ${km} km?`,
    valor: minutos,
    expression: `${km}/${v}*60`,
    format: 'plain',
    armadilhas: [
      horaMalLida(horas), // leu 1.25 h como 1h25
      (v / km) * 60, // inverteu a razão
      (km * 100) / v, // hora de 100 minutos
    ],
    explanation: {
      pt:
        `Tempo = distância ÷ velocidade = ${km} ÷ ${v} = ${num(horas)} h. Em minutos: ` +
        `${num(horas)} × 60 = ${minutos}. A pegadinha é ler ${num(horas)} h como se a parte ` +
        `decimal já fosse minutos.`,
      en:
        `Time = distance ÷ speed = ${km} ÷ ${v} = ${num(horas)} h. In minutes: ${num(horas)} × ` +
        `60 = ${minutos}. The trap is reading ${num(horas)} h as if the decimal part were ` +
        `already minutes.`,
    },
  }
}

const produtividade: Template = (rng, d) => {
  if (d === 1) {
    const { a, b, horas } = sortear(() => {
      const a = rng.int(10, 40)
      const b = rng.int(10, 40)
      const horas = rng.int(2, 9)
      const total = (a + b) * horas
      // Os erros "só uma máquina" precisam dar hora inteira para virar alternativa.
      return a !== b && total % a === 0 && total % b === 0 ? { a, b, horas } : undefined
    })
    const total = (a + b) * horas
    return {
      stem:
        `Machine A makes ${a} parts per hour and machine B makes ${b} parts per hour. ` +
        `Working together, how many hours do they need to make ${num(total)} parts?`,
      valor: horas,
      expression: `${total}/(${a}+${b})`,
      format: 'plain',
      armadilhas: [
        total / Math.max(a, b), // só a máquina mais rápida
        total / Math.min(a, b), // só a mais lenta
        (2 * total) / (a + b), // usou a média das taxas
        (total / a + total / b) / 2, // média dos tempos individuais
      ],
      explanation: {
        pt:
          `Juntas, as máquinas fazem ${a} + ${b} = ${a + b} peças por hora. ${num(total)} ÷ ` +
          `${a + b} = ${horas} horas. Taxas trabalhando ao mesmo tempo se SOMAM.`,
        en:
          `Together the machines make ${a} + ${b} = ${a + b} parts per hour. ${num(total)} ÷ ` +
          `${a + b} = ${horas} hours. Rates working at the same time ADD UP.`,
      },
    }
  }

  const { a, b, atraso, total } = sortear(() => {
    const a = rng.int(12, 45)
    const b = rng.int(12, 45)
    const total = rng.int(4, 10)
    const atraso = rng.int(1, total - 2)
    return a !== b ? { a, b, atraso, total } : undefined
  })
  const valor = a * total + b * (total - atraso)
  return {
    stem:
      `Machine A makes ${a} parts per hour and machine B makes ${b} parts per hour. A runs ` +
      `for ${total} hours; B is switched on ${atraso} ${atraso === 1 ? 'hour' : 'hours'} ` +
      `after A starts and runs until A stops. How many parts do they make in total?`,
    valor,
    expression: `${a}*${total}+${b}*(${total}-${atraso})`,
    format: 'plain',
    armadilhas: [
      (a + b) * total, // esqueceu o atraso
      (a + b) * (total - atraso), // descontou o atraso das duas máquinas
      a * total + b * atraso, // usou o atraso como tempo de B
      a * (total - atraso) + b * total, // atrasou a máquina errada
    ],
    explanation: {
      pt:
        `A trabalha ${total} h: ${a} × ${total} = ${a * total}. B trabalha ${total} − ` +
        `${atraso} = ${total - atraso} h: ${b} × ${total - atraso} = ${b * (total - atraso)}. ` +
        `Total: ${num(valor)}. Cada máquina tem o seu tempo — só B começou atrasada.`,
      en:
        `A runs ${total} h: ${a} × ${total} = ${a * total}. B runs ${total} − ${atraso} = ` +
        `${total - atraso} h: ${b} × ${total - atraso} = ${b * (total - atraso)}. Total: ` +
        `${num(valor)}. Each machine has its own time — only B started late.`,
    },
  }
}

const consumo: Template = (rng) => {
  const { l, preco, km, litros, valor } = sortear(() => {
    const l = rng.pick([5, 6, 7, 8, 9, 10, 12])
    const preco = rng.pick([1.25, 1.5, 1.75, 2, 1.2, 1.6, 1.8])
    const km = rng.int(2, 18) * 50
    const litros = (km * l) / 100
    const valor = litros * preco
    return ehCentavo(valor) ? { l, preco, km, litros, valor: c2(valor) } : undefined
  })
  return {
    stem:
      `A car uses ${l} liters of fuel per 100 km, and fuel costs ${usd(preco)} per liter. ` +
      `How much does the fuel cost for a ${km} km trip?`,
    valor,
    expression: `${km}/100*${l}*${preco}`,
    format: 'currency',
    armadilhas: [
      (km / l) * preco, // dividiu pelo consumo
      litros, // respondeu os litros
      l * preco, // custo de só 100 km
      (km / 100) * preco, // esqueceu o consumo
    ],
    explanation: {
      pt:
        `Litros: ${km} ÷ 100 × ${l} = ${num(litros)} L. Custo: ${num(litros)} × ` +
        `${usd(preco)} = ${usd(valor)}. "Por 100 km" pede dividir a distância por 100 ` +
        `antes de multiplicar.`,
      en:
        `Liters: ${km} ÷ 100 × ${l} = ${num(litros)} L. Cost: ${num(litros)} × ${usd(preco)} = ` +
        `${usd(valor)}. "Per 100 km" means dividing the distance by 100 before multiplying.`,
    },
  }
}

const maquinasIntervalo: Template = (rng) => {
  const { a, b, horas } = sortear(() => {
    const a = rng.int(2, 12)
    const b = rng.int(2, 12)
    const horas = rng.int(1, 4)
    const min = 60 * horas
    return a !== b && min % a === 0 && min % b === 0 ? { a, b, horas } : undefined
  })
  const min = 60 * horas
  const valor = min / a + min / b
  return {
    stem:
      `Machine A produces one part every ${a} minutes and machine B produces one part every ` +
      `${b} minutes. Running at the same time, how many parts do the two machines produce ` +
      `in ${horas} ${horas === 1 ? 'hour' : 'hours'}?`,
    valor,
    expression: `${horas}*60/${a}+${horas}*60/${b}`,
    format: 'plain',
    armadilhas: [
      (2 * min) / ((a + b) / 2), // usou o intervalo médio
      (2 * min) / Math.min(a, b), // as duas no ritmo da mais rápida
      (2 * min) / Math.max(a, b), // as duas no ritmo da mais lenta
      min / Math.min(a, b), // só a mais rápida
    ],
    explanation: {
      pt:
        `Em ${min} minutos, A faz ${min} ÷ ${a} = ${min / a} peças e B faz ${min} ÷ ${b} = ` +
        `${min / b}. Total: ${valor}. Média de intervalos NÃO dá a taxa média — some as ` +
        `taxas, não os tempos.`,
      en:
        `In ${min} minutes, A makes ${min} ÷ ${a} = ${min / a} parts and B makes ${min} ÷ ${b} ` +
        `= ${min / b}. Total: ${valor}. Averaging the intervals does NOT give the average ` +
        `rate — add the rates, not the times.`,
    },
  }
}

const encontro: Template = (rng, d) => {
  if (d === 3) {
    const { v1, v2, t, dist } = sortear(() => {
      const v2 = rng.int(8, 18) * 5
      const v1 = v2 + rng.int(1, 4) * 5
      const t = rng.pick([1.5, 2, 2.5, 3, 3.5, 4])
      const dist = (v1 + v2) * t
      return ehInteiro(v1 * t) && ehInteiro(dist / 2) ? { v1, v2, t, dist } : undefined
    })
    const valor = v1 * t
    return {
      stem:
        `Two towns are ${dist} km apart. At the same moment, a car leaves each town and ` +
        `drives toward the other, one at ${v1} km/h and the other at ${v2} km/h. When they ` +
        `meet, how many kilometers has the faster car traveled?`,
      valor,
      expression: `${dist}/(${v1}+${v2})*${v1}`,
      format: 'plain',
      armadilhas: [
        dist / 2, // supôs que se encontram no meio
        v2 * t, // respondeu o carro mais lento
        (dist / (v1 - v2)) * v1, // usou a diferença das velocidades
      ],
      explanation: {
        pt:
          `Indo um em direção ao outro, as velocidades se somam: ${v1} + ${v2} = ${v1 + v2} ` +
          `km/h. Encontram-se em ${dist} ÷ ${v1 + v2} = ${num(t)} h, e o mais rápido andou ` +
          `${v1} × ${num(t)} = ${num(valor)} km. Não é o meio do caminho: quem é mais rápido ` +
          `cobre mais.`,
        en:
          `Moving toward each other, the speeds add: ${v1} + ${v2} = ${v1 + v2} km/h. They meet ` +
          `after ${dist} ÷ ${v1 + v2} = ${num(t)} h, and the faster car covers ${v1} × ` +
          `${num(t)} = ${num(valor)} km. It is not the halfway point: the faster car covers ` +
          `more.`,
      },
    }
  }

  const { v1, v2, atraso, horas, valor } = sortear(() => {
    const v1 = rng.int(9, 16) * 5
    const v2 = v1 + rng.int(1, 3) * 5
    const atraso = rng.pick([15, 20, 30, 40, 45])
    const horas = (v1 * atraso) / 60 / (v2 - v1)
    const valor = v2 * horas
    return ehInteiro(valor) && ehInteiro(v1 * (horas + atraso / 60))
      ? { v1, v2, atraso, horas, valor }
      : undefined
  })
  const vantagem = (v1 * atraso) / 60
  return {
    stem:
      `A truck leaves a depot at ${v1} km/h. ${atraso} minutes later, a car leaves the same ` +
      `depot on the same road at ${v2} km/h. How many kilometers from the depot does the ` +
      `car catch up with the truck?`,
    valor,
    expression: `${v2}*(${v1}*${atraso}/60)/(${v2}-${v1})`,
    format: 'plain',
    armadilhas: [
      v1 * horas, // usou a velocidade do caminhão com o tempo do carro
      v2 * (horas + atraso / 60), // usou o tempo do caminhão com a velocidade do carro
      valor - vantagem, // descontou a vantagem
    ],
    explanation: {
      pt:
        `Em ${atraso} min o caminhão abre ${num(vantagem)} km. O carro fecha ${v2} − ${v1} = ` +
        `${v2 - v1} km/h: ${num(vantagem)} ÷ ${v2 - v1} = ${num(horas)} h. Nesse tempo o ` +
        `carro anda ${v2} × ${num(horas)} = ${num(valor)} km. Na perseguição, as velocidades ` +
        `se SUBTRAEM.`,
      en:
        `In ${atraso} min the truck gets ${num(vantagem)} km ahead. The car closes at ${v2} − ` +
        `${v1} = ${v2 - v1} km/h: ${num(vantagem)} ÷ ${v2 - v1} = ${num(horas)} h. In that ` +
        `time the car covers ${v2} × ${num(horas)} = ${num(valor)} km. In a chase, the speeds ` +
        `SUBTRACT.`,
    },
  }
}

const trabalhoConjunto: Template = (rng, d) => {
  if (d <= 4) {
    const { a, b, valor } = sortear(() => {
      const a = rng.int(2, d === 3 ? 8 : 15)
      const b = rng.int(2, d === 3 ? 8 : 15)
      const valor = (60 * a * b) / (a + b)
      return a !== b && ehInteiro(valor) ? { a, b, valor } : undefined
    })
    return {
      stem:
        `Working alone, Ana can paint a fence in ${a} hours and Ben can paint it in ${b} ` +
        `hours. Working together at those rates, how many minutes will they take to paint ` +
        `the fence?`,
      valor,
      expression: `60/(1/${a}+1/${b})`,
      format: 'plain',
      armadilhas: [
        (a + b) * 15, // metade da média dos tempos
        horaMalLida(valor / 60), // leu horas decimais como h:min
        Math.min(a, b) * 30, // metade do tempo do mais rápido
        Math.max(a, b) * 30, // metade do tempo do mais lento
      ],
      explanation: {
        pt:
          `Por hora, Ana faz 1/${a} da cerca e Ben 1/${b}. Juntos: 1/${a} + 1/${b} = ` +
          `${a + b}/${a * b} por hora, então levam ${a * b}/${a + b} h = ${valor} minutos. ` +
          `Somam-se as TAXAS, não os tempos; e a resposta sempre fica abaixo do tempo do ` +
          `mais rápido.`,
        en:
          `Per hour, Ana does 1/${a} of the fence and Ben 1/${b}. Together: 1/${a} + 1/${b} = ` +
          `${a + b}/${a * b} per hour, so they take ${a * b}/${a + b} h = ${valor} minutes. Add ` +
          `the RATES, not the times; and the answer is always below the faster person's time.`,
      },
    }
  }

  const { a, b, c, valor } = sortear(() => {
    const a = rng.int(2, 12)
    const b = rng.int(2, 12)
    const c = rng.int(6, 30)
    const taxa = 1 / a + 1 / b - 1 / c
    if (a === b || taxa <= 0) return undefined
    const valor = 60 / taxa
    if (!ehInteiro(valor) || c <= Math.max(a, b)) return undefined
    return { a, b, c, valor: Math.round(valor) }
  })
  return {
    stem:
      `Pipe A can fill a tank in ${a} hours and pipe B can fill it in ${b} hours. A drain ` +
      `can empty the full tank in ${c} hours. If the tank starts empty and all three are ` +
      `open, how many minutes does it take to fill the tank?`,
    valor,
    expression: `60/(1/${a}+1/${b}-1/${c})`,
    format: 'plain',
    armadilhas: [
      (60 * a * b) / (a + b), // esqueceu o ralo
      60 / (1 / a + 1 / b + 1 / c), // tratou o ralo como enchendo
      ((a + b) / 4) * 60, // metade da média dos tempos
    ],
    explanation: {
      pt:
        `Por hora: +1/${a} + 1/${b} − 1/${c} do tanque. O ralo entra com sinal de MENOS. ` +
        `O tempo é o inverso da taxa: ${num(valor / 60)} h = ${valor} minutos. Ignorar o ralo ` +
        `dá ${num((60 * a * b) / (a + b))} — perto, e errado.`,
      en:
        `Per hour: +1/${a} + 1/${b} − 1/${c} of the tank. The drain comes in with a MINUS sign. ` +
        `The time is the inverse of the rate: ${num(valor / 60)} h = ${valor} minutes. ` +
        `Ignoring the drain gives ${num((60 * a * b) / (a + b))} — close, and wrong.`,
    },
  }
}

const velocidadeMedia: Template = (rng, d) => {
  if (d === 4) {
    const { v1, v2, dist, valor } = sortear(() => {
      const v1 = rng.int(6, 24) * 5
      const v2 = rng.int(6, 24) * 5
      if (v1 === v2) return undefined
      const valor = (2 * v1 * v2) / (v1 + v2)
      const dist = v1 * v2 / mdc(v1, v2) * rng.int(1, 3)
      return ehInteiro(valor) && dist <= 600 ? { v1, v2, dist, valor } : undefined
    })
    return {
      stem:
        `A driver goes from town P to town Q, ${dist} km away, at ${v1} km/h and returns ` +
        `along the same road at ${v2} km/h. What is the average speed, in km/h, for the ` +
        `whole round trip?`,
      valor,
      expression: `2*${dist}/(${dist}/${v1}+${dist}/${v2})`,
      format: 'plain',
      armadilhas: [
        (v1 + v2) / 2, // média simples das velocidades
        (v1 * v1 + v2 * v2) / (v1 + v2), // ponderou pelos tempos trocados
        dist / (dist / v1 + dist / v2), // esqueceu que a distância é ida e volta
      ],
      explanation: {
        pt:
          `Velocidade média = distância total ÷ tempo total. Ida: ${dist} ÷ ${v1} = ` +
          `${num(dist / v1)} h; volta: ${dist} ÷ ${v2} = ${num(dist / v2)} h. ${2 * dist} km ` +
          `em ${num(dist / v1 + dist / v2)} h = ${valor} km/h. Fica abaixo de ` +
          `${num((v1 + v2) / 2)} porque se passa MAIS tempo no trecho lento.`,
        en:
          `Average speed = total distance ÷ total time. Out: ${dist} ÷ ${v1} = ` +
          `${num(dist / v1)} h; back: ${dist} ÷ ${v2} = ${num(dist / v2)} h. ${2 * dist} km in ` +
          `${num(dist / v1 + dist / v2)} h = ${valor} km/h. It is below ${num((v1 + v2) / 2)} ` +
          `because MORE time is spent on the slow leg.`,
      },
    }
  }

  const { v1, t1, v2, t2, valor } = sortear(() => {
    const v1 = rng.int(8, 22) * 5
    const v2 = rng.int(8, 22) * 5
    const t1 = rng.pick([1, 1.5, 2, 2.5, 3])
    const t2 = rng.pick([1, 1.5, 2, 2.5, 3, 4])
    if (v1 === v2 || t1 === t2) return undefined
    const valor = (v1 * t1 + v2 * t2) / (t1 + t2)
    return ehInteiro(valor) && ehInteiro(v1 * t1) && ehInteiro(v2 * t2)
      ? { v1, t1, v2, t2, valor }
      : undefined
  })
  const d1 = v1 * t1
  const d2 = v2 * t2
  return {
    stem:
      `A bus travels ${d1} km at ${v1} km/h and then another ${d2} km at ${v2} km/h. What is ` +
      `the bus's average speed, in km/h, for the whole journey?`,
    valor,
    expression: `(${d1}+${d2})/(${d1}/${v1}+${d2}/${v2})`,
    format: 'plain',
    armadilhas: [
      (v1 + v2) / 2, // média simples das velocidades
      (d1 * v1 + d2 * v2) / (d1 + d2), // ponderou pela distância
      (v1 * t2 + v2 * t1) / (t1 + t2), // ponderou pelos tempos trocados
      (d1 + d2) / Math.max(t1, t2), // usou só o tempo do trecho mais longo
    ],
    explanation: {
      pt:
        `Tempos: ${d1} ÷ ${v1} = ${num(t1)} h e ${d2} ÷ ${v2} = ${num(t2)} h. Total ` +
        `${d1 + d2} km em ${num(t1 + t2)} h = ${valor} km/h. Velocidade média se pondera ` +
        `pelo TEMPO, não pela distância nem igualmente.`,
      en:
        `Times: ${d1} ÷ ${v1} = ${num(t1)} h and ${d2} ÷ ${v2} = ${num(t2)} h. Total ` +
        `${d1 + d2} km in ${num(t1 + t2)} h = ${valor} km/h. Average speed is weighted by ` +
        `TIME, not by distance and not equally.`,
    },
  }
}

// --- Registro ----------------------------------------------------------------

/**
 * Templates por subtipo, com os níveis em que entram no sorteio.
 *
 * Cada nível tem pelo menos dois templates por subtipo — um só faria o nível
 * virar decoreba de formato. Os de nível 1-2 nunca aparecem do 3 em diante.
 */
const TEMPLATES: Record<string, Registro[]> = {
  aritmetica: [
    { id: 'troco', niveis: [1, 2], passos: 3, build: troco },
    { id: 'estoque', niveis: [1, 2], passos: 3, build: estoque },
    { id: 'vans', niveis: [1, 2], passos: 3, build: vans },
    { id: 'mediaNova', niveis: [3], passos: 3, build: mediaNova },
    { id: 'fracaoDoRestante', niveis: [3, 4], passos: 3, build: fracaoDoRestante },
    { id: 'mediaPonderada', niveis: [4, 5], passos: 4, build: mediaPonderada },
    { id: 'desfazer', niveis: [4, 5], passos: 4, build: desfazer },
  ],
  porcentagem: [
    { id: 'descontoCesta', niveis: [1, 2], passos: 2, build: descontoCesta },
    { id: 'crescimento', niveis: [1, 2], passos: 3, build: crescimento },
    { id: 'variacaoPercentual', niveis: [2], passos: 2, build: variacaoPercentual },
    { id: 'precoOriginal', niveis: [3, 4], passos: 3, build: precoOriginal },
    { id: 'descontosSucessivos', niveis: [3, 4, 5], passos: 3, build: descontosSucessivos },
    { id: 'juros', niveis: [4, 5], passos: 3, build: juros },
    { id: 'markup', niveis: [4, 5], passos: 3, build: markup },
  ],
  razao_proporcao: [
    { id: 'razaoSimples', niveis: [1, 2], passos: 2, build: razaoSimples },
    { id: 'proporcaoDireta', niveis: [1, 2], passos: 2, build: proporcaoDireta },
    { id: 'razaoComTotal', niveis: [2, 3], passos: 3, build: razaoComTotal },
    { id: 'proporcaoInversa', niveis: [3], passos: 3, build: proporcaoInversa },
    { id: 'proporcaoComposta', niveis: [4, 5], passos: 4, build: proporcaoComposta },
    { id: 'mistura', niveis: [4, 5], passos: 4, build: mistura },
  ],
  taxa: [
    { id: 'velocidade', niveis: [1, 2], passos: 2, build: velocidade },
    { id: 'produtividade', niveis: [1, 2], passos: 2, build: produtividade },
    { id: 'consumo', niveis: [2], passos: 3, build: consumo },
    { id: 'maquinasIntervalo', niveis: [3], passos: 3, build: maquinasIntervalo },
    { id: 'encontro', niveis: [3, 4], passos: 3, build: encontro },
    { id: 'trabalhoConjunto', niveis: [3, 4, 5], passos: 3, build: trabalhoConjunto },
    { id: 'velocidadeMedia', niveis: [4, 5], passos: 4, build: velocidadeMedia },
  ],
}

function criar(subtipo: string): MathGenerator {
  return (seed, difficulty) => gerarComTemplate(subtipo, seed, difficulty).questao
}

/**
 * Gera a questão e informa qual template saiu no sorteio. O app usa só a
 * questão; o template serve para os testes provarem que o nível muda a família.
 */
export function gerarComTemplate(
  subtipo: string,
  seed: number,
  difficulty: Difficulty,
): { questao: MathGenerated; template: string } {
  const rng = mulberry32(seed)
  const elegiveis = (TEMPLATES[subtipo] as Registro[]).filter((t) =>
    t.niveis.includes(difficulty),
  )
  // O template é sorteado UMA vez; só os slots são re-sorteados. Re-sortear o
  // template a cada descarte favoreceria os que passam mais fácil no filtro.
  const escolhido = rng.pick(elegiveis)
  const problema = semVazamento(() => escolhido.build(rng, difficulty), subtipo, difficulty)
  return { questao: montar(rng, subtipo, problema, difficulty), template: escolhido.id }
}

/**
 * Descarta o problema se o valor da resposta aparece entre os números do
 * enunciado. Acontece por coincidência de slots ("$100 discounted by 50%" →
 * resposta 50) e faz o candidato acertar de vista, sem resolver nada.
 *
 * Do nível 3 em diante, descarta também o problema cujos erros reais caem
 * longe da resposta: com menos de dois distratores a ±20%, a questão se
 * resolve por estimativa, sem fazer a conta.
 */
function semVazamento(build: () => Problema, subtipo: string, difficulty: Difficulty): Problema {
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const problema = build()
    if (numerosDe(problema.stem).some((n) => Math.abs(n - problema.valor) < 0.005)) continue
    // Mesma checagem textual do gate G2, para o gerador nunca produzir o que ele reprova.
    const resposta = normalizeText(formatNumber(problema.valor, problema.format))
    if (normalizeText(problema.stem).includes(` ${resposta} `)) continue
    const perto = distratores(problema).filter((v) => proximo(v, problema.valor))
    if (difficulty >= 3 && perto.length < 2) continue
    return problema
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

export const WORD_GENERATORS = {
  aritmetica: criar('aritmetica'),
  razao_proporcao: criar('razao_proporcao'),
  porcentagem: criar('porcentagem'),
  taxa: criar('taxa'),
} as const satisfies Record<string, MathGenerator>

export type WordGeneratorId = keyof typeof WORD_GENERATORS
export const WORD_GENERATOR_IDS = Object.keys(WORD_GENERATORS) as WordGeneratorId[]

export const WORD_TEMPLATES = Object.fromEntries(
  Object.entries(TEMPLATES).map(([subtipo, lista]) => [
    subtipo,
    lista.map(({ id, niveis, passos }) => ({ id, niveis, passos })),
  ]),
) as Record<WordGeneratorId, TemplateInfo[]>

// --- Montagem ----------------------------------------------------------------

function montar(
  rng: Rng,
  subtipo: string,
  problema: Problema,
  difficulty: Difficulty,
): MathGenerated {
  const quantidade = OPCOES_POR_QUESTAO
  const valores = [problema.valor]
  const vistos = new Set([arredonda(problema.valor)])

  // Do nível 3 em diante, os erros que caem perto da resposta entram primeiro:
  // são eles que obrigam a fazer a conta em vez de estimar.
  const candidatos = distratores(problema)
  const ordenados =
    difficulty >= 3
      ? [
          ...candidatos.filter((v) => proximo(v, problema.valor)),
          ...candidatos.filter((v) => !proximo(v, problema.valor)),
        ]
      : candidatos

  for (const armadilha of ordenados) {
    if (valores.length >= quantidade) break
    vistos.add(arredonda(armadilha))
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

/**
 * Armadilhas que podem virar alternativa, sem repetição.
 *
 * Fica de fora o que se elimina de olho: valor negativo, fora da escala da
 * resposta (mais de 4× para cima ou para baixo) ou com casas que a resposta não
 * tem — um "23.33" entre inteiros denuncia que não é a conta certa.
 */
function distratores(problema: Problema): number[] {
  const out: number[] = []
  const vistos = new Set([arredonda(problema.valor)])
  for (const bruto of problema.armadilhas) {
    if (!Number.isFinite(bruto) || bruto <= 0) continue
    if (!exibivelExato(bruto, problema)) continue
    const v = c2(bruto)
    if (v > problema.valor * 4 || v < problema.valor / 4) continue
    const chave = arredonda(v)
    if (vistos.has(chave)) continue
    vistos.add(chave)
    out.push(v)
  }
  return out
}

function exibivelExato(v: number, problema: Problema): boolean {
  switch (problema.format) {
    case 'currency':
      return ehCentavo(v)
    case 'percent':
      return Math.abs(v * 10 - Math.round(v * 10)) < 1e-6
    case 'plain':
      return ehInteiro(problema.valor) ? ehInteiro(v) : ehCentavo(v)
  }
}

/** Distrator a no máximo 20% da resposta — o que não se descarta por estimativa. */
export function proximo(v: number, valor: number): boolean {
  return Math.abs(v - valor) <= valor * 0.2 + 1e-9
}

/** Compara valores pelo que será EXIBIDO (2 casas), não pelo float cru. */
function arredonda(v: number): number {
  return Math.round(v * 100)
}

// --- Utilitários -------------------------------------------------------------

/** Sorteia slots até a condição fechar (resposta exata, nada degenerado). */
function sortear<T>(tentar: () => T | undefined): T {
  for (let i = 0; i < 2000; i++) {
    const r = tentar()
    if (r !== undefined) return r
  }
  throw new Error('não consegui sortear slots que fechem a conta')
}

/** Arredonda para centavos, limpando o ruído de ponto flutuante. */
function c2(v: number): number {
  return Math.round(v * 100) / 100
}

function ehInteiro(v: number): boolean {
  return Math.abs(v - Math.round(v)) < 1e-9
}

function ehCentavo(v: number): boolean {
  return Math.abs(v * 100 - Math.round(v * 100)) < 1e-6
}

function mdc(a: number, b: number): number {
  return b === 0 ? a : mdc(b, a % b)
}

function mmc(a: number, b: number): number {
  return (a * b) / mdc(a, b)
}

/** Valor em dólares no enunciado: "$2,500" quando inteiro, "$12.75" quando não. */
function usd(v: number): string {
  return ehInteiro(v) ? `$${formatNumber(v)}` : formatNumber(v, 'currency')
}

function num(v: number): string {
  return formatNumber(v)
}

/**
 * Horas decimais lidas como "h:min" — 1.25 h vira 1h25 = 85 min. Erro real de
 * quem converte de cabeça; NaN quando não há leitura errada plausível.
 */
function horaMalLida(horas: number): number {
  const inteiras = Math.floor(horas)
  const centesimos = (horas - inteiras) * 100
  if (Math.abs(centesimos - Math.round(centesimos)) > 1e-6 || Math.round(centesimos) === 0) {
    return Number.NaN
  }
  return inteiras * 60 + Math.round(centesimos)
}
