import { mulberry32, type Rng } from '../rng'
import { OPCOES_POR_QUESTAO, type Difficulty } from '../taxonomy'
import type { LocalizedText } from '../i18n'
import { optionIdAt } from '../optionIds'
import { normalizeText } from '../schema'
import { formatNumber, parseNumber, toleranciaDe } from './solver'
import type { MathGenerated, MathGenerator } from './series'

/**
 * Cálculo básico e comparação de valores (subtipo calculo_basico de math_word).
 *
 * A CCAT tem uma leva de questões curtas, sem história em volta: "Which of the
 * following is the smallest? 0.07 / 0.009 / 0.0081 / 0.0077 / 0.00779", "616
 * is 70% of what?", "What is 3/8 of 2/3 of 96?", "Which fraction is the
 * lowest?". Não medem conta longa; medem senso numérico — alinhar casas
 * decimais, saber que "de" é vezes, comparar fração sem calculadora.
 *
 * Fica num módulo próprio, e não nos templates de problemas com texto, porque o
 * contrato é outro. Nas questões de comparação as alternativas SÃO o objeto da
 * pergunta: 0.07 e 0.0077 distam 9× de propósito, e a regra "distrator a no
 * máximo 4× da resposta" dos problemas com texto não se aplica.
 *
 * Duas formas de questão:
 *  - conta: um valor a calcular, distratores = os erros reais (casa decimal
 *    trocada, percentual somado, fração invertida);
 *  - escolha: as cinco alternativas são candidatas e a resposta é a menor, a
 *    maior ou a mais perto de um alvo. A `expression` é `min(...)`, `max(...)`
 *    ou `nearest(alvo, ...)` sobre as próprias alternativas — o gate avalia e
 *    confere que os candidatos da expressão são exatamente as alternativas.
 *
 * O nível escolhe a família:
 *  - 1: decimais de comprimentos diferentes; produto de decimais.
 *  - 2: comparação com quase-empates; fração de fração; % de um número; divisão
 *       de decimais.
 *  - 3: o todo a partir da parte ("616 is 70% of what?"); % de %; o mais perto
 *       de uma fração.
 *  - 4: frações perto de 1/2 (referência); a fração mais perto de um decimal;
 *       fração de fração de fração; o todo a partir de uma fração.
 *  - 5: frações coladas que só o produto cruzado separa; "x% de A é y% de
 *       quê?"; cadeia de frações e percentuais.
 */

type Problema = Conta | Escolha

interface Conta {
  tipo: 'conta'
  familia: string
  stem: string
  valor: number
  /** forma fechada, avaliada pelo gate por caminho independente */
  expression: string
  /** erros clássicos, na ordem de plausibilidade */
  armadilhas: number[]
  explanation: LocalizedText
}

interface Escolha {
  tipo: 'escolha'
  familia: string
  stem: string
  /** as cinco alternativas como texto; a primeira é a resposta */
  alternativas: string[]
  expression: string
  explanation: LocalizedText
}

/** Devolve null quando o sorteio caiu num caso degenerado; aí se sorteia de novo. */
type Familia = (rng: Rng, d: Difficulty) => Problema | null

// --- Comparar decimais ---------------------------------------------------------

/**
 * Cinco decimais de comprimentos diferentes, e a pergunta é o menor ou o maior.
 *
 * Os candidatos saem de um mesmo par de algarismos m em escalas diferentes, e
 * cada um existe para pegar um raciocínio errado: o mais comprido parece mais
 * preciso (ou maior), o mais curto parece menor, e ler os algarismos como
 * inteiro ignorando os zeros ("779 > 77") aponta sempre uma alternativa errada.
 *
 * No nível 2 a resposta divide o prefixo com duas outras (0.00771 × 0.00775 ×
 * 0.0078) e só alinhando as casas dá para separar.
 */
const compararDecimais: Familia = (rng, d) => {
  const menor = rng.next() < 0.5
  const q = rng.pick([3, 4])
  const m = rng.int(12, 88)
  // m terminado em 0 seria escrito com uma casa a menos; m + 1 aparece como alternativa
  if (m % 10 === 0 || (m + 1) % 10 === 0) return null
  const r = rng.int(1, 9)
  const r2 = rng.int(1, 9)
  const vizinho = menor ? m + rng.int(1, 9) : m - rng.int(1, 9)
  if (vizinho % 10 === 0 || vizinho < 11) return null
  const dec = decimalDe

  let alternativas: string[]
  if (d === 1) {
    alternativas = menor
      ? [
          dec(m, q),
          dec(10 * m + r, q + 1), // mesmo começo, um algarismo a mais
          dec(vizinho, q), // mesmo tamanho, pouco maior
          dec(rng.int(1, 9), q - 2), // curto: parece pequeno
          dec(rng.int(Math.floor(m / 10) + 1, 9), q - 1), // mais zeros, parece menor
        ]
      : [
          dec(m, q),
          dec(10 * (m - 1) + r, q + 1), // comprido: parece maior
          dec(vizinho, q), // mesmo tamanho, pouco menor
          dec(Math.floor(m / 10), q - 1), // o prefixo truncado
          dec(rng.int(91, 99), q + 1), // "98" parece grande
        ]
  } else {
    alternativas = menor
      ? [
          dec(10 * m + Math.min(r, 5), q + 1),
          dec(10 * m + rng.int(Math.min(r, 5) + 1, 9), q + 1), // mesmo prefixo, pouco maior
          dec(m + 1, q), // mais curto, mas maior
          dec(10 * (m + 1) + r2, q + 1),
          dec(m, q - 1), // mesmos algarismos, um zero a menos
        ]
      : [
          dec(10 * m + Math.max(r, 5), q + 1),
          dec(10 * m + rng.int(1, Math.max(r, 5) - 1), q + 1),
          dec(m, q), // mais curto: parece "arredondado para cima"
          dec(100 * (m - 1) + 10 * r2 + rng.int(1, 9), q + 2), // mais comprido, e menor
          dec(m, q + 1), // mesmos algarismos, um zero a mais
        ]
  }

  const valores = alternativas.map(parseNumber)
  const alvo = menor ? Math.min(...valores) : Math.max(...valores)
  if (valores[0] !== alvo) return null

  const casas = Math.max(...alternativas.map(casasDe))
  const alinhados = alternativas.map((a) => parseNumber(a).toFixed(casas))
  const inteiros = alinhados.map((a) => String(Number(a.replace('.', ''))))
  const palavra = menor ? { pt: 'menor', en: 'smallest' } : { pt: 'maior', en: 'largest' }
  return {
    tipo: 'escolha',
    familia: 'comparar_decimais',
    stem: `Which of the following numbers is the ${palavra.en}?`,
    alternativas,
    expression: `${menor ? 'min' : 'max'}(${alternativas.join(',')})`,
    explanation: {
      pt:
        `Complete todos com zeros até ${casas} casas: ${alinhados.join(', ')}. Agora compare ` +
        `como inteiros — ${inteiros.join(', ')} — e o ${palavra.pt} é ${alternativas[0]}. ` +
        `Quantidade de algarismos não diz tamanho: o que manda é a primeira casa em que os ` +
        `números diferem, depois de alinhados.`,
      en:
        `Pad them all with zeros to ${casas} places: ${alinhados.join(', ')}. Now compare them ` +
        `as whole numbers — ${inteiros.join(', ')} — and the ${palavra.en} is ${alternativas[0]}. ` +
        `The number of digits says nothing about size: what decides is the first place where ` +
        `the numbers differ, once aligned.`,
    },
  }
}

// --- Produto e divisão de decimais ----------------------------------------------

const produtoDecimal: Familia = (rng) => {
  const x = rng.pick([2, 3, 4, 5, 6, 8, 12, 15, 25, 35, 45])
  const y = rng.pick([2, 3, 4, 5, 6, 8, 9])
  const i = rng.int(1, 2)
  const j = rng.int(1, 2)
  const a = decimalDe(x, i)
  const b = decimalDe(y, j)
  const casas = i + j
  const valor = parseNumber(decimalDe(x * y, casas))
  return {
    tipo: 'conta',
    familia: 'produto_decimal',
    stem: `What is ${a} × ${b}?`,
    valor,
    expression: `${a}*${b}`,
    armadilhas: [
      parseNumber(decimalDe(x * y, casas - 1)), // contou uma casa a menos
      parseNumber(decimalDe(x * y, casas + 1)), // uma casa a mais
      c6(parseNumber(a) + parseNumber(b)), // somou
      parseNumber(decimalDe(x * y, Math.max(i, j))), // usou as casas de um fator só
    ],
    explanation: {
      pt:
        `Multiplique sem a vírgula: ${x} × ${y} = ${x * y}. Depois conte as casas dos fatores: ` +
        `${a} tem ${i} e ${b} tem ${j}, então o produto tem ${casas}: ${txt(valor)}. Errar a ` +
        `contagem de casas dá um resultado 10 vezes maior ou menor — e esses valores estão ` +
        `entre as alternativas.`,
      en:
        `Multiply without the decimal point: ${x} × ${y} = ${x * y}. Then count the decimal ` +
        `places in the factors: ${a} has ${i} and ${b} has ${j}, so the product has ${casas}: ` +
        `${txt(valor)}. Miscounting the places gives a result 10 times too big or too small — ` +
        `and those values are among the options.`,
    },
  }
}

const quocienteDecimal: Familia = (rng) => {
  const x = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 12, 15])
  const y = rng.pick([2, 3, 4, 5, 6, 8, 12, 15, 25])
  const i = rng.int(1, 3)
  const j = rng.int(1, 3)
  const dividendo = decimalDe(x * y, i)
  const divisor = decimalDe(y, j)
  // x·y·10^-i ÷ y·10^-j = x·10^(j-i)
  const valor = parseNumber(j >= i ? String(x * 10 ** (j - i)) : decimalDe(x, i - j))
  if (!dividendo.includes('.') || !divisor.includes('.')) return null
  return {
    tipo: 'conta',
    familia: 'quociente_decimal',
    stem: `What is ${dividendo} ÷ ${divisor}?`,
    valor,
    expression: `${dividendo}/${divisor}`,
    armadilhas: [c6(valor * 10), c6(valor / 10), c6(valor * 100), c6(valor / 100)],
    explanation: {
      pt:
        `Na divisão, mova a vírgula dos DOIS números até o divisor ficar inteiro: ` +
        `${dividendo} ÷ ${divisor} = ${txt(parseNumber(dividendo) * 10 ** j)} ÷ ${y} = ` +
        `${txt(valor)}. Mover só a vírgula do divisor muda a conta por um fator de 10.`,
      en:
        `When dividing, shift the decimal point in BOTH numbers until the divisor is whole: ` +
        `${dividendo} ÷ ${divisor} = ${txt(parseNumber(dividendo) * 10 ** j)} ÷ ${y} = ` +
        `${txt(valor)}. Shifting only the divisor's point throws the answer off by a factor of 10.`,
    },
  }
}

// --- Percentuais ------------------------------------------------------------------

const porcentagemDe: Familia = (rng) => {
  const p = rng.pick([15, 35, 45, 55, 65, 85, 12.5, 37.5, 62.5, 87.5])
  const base = rng.int(4, 90) * 10
  const valor = (base * p) / 100
  if (!ehInteiro(valor)) return null
  // 12.5%, 37.5%… são oitavos; os demais terminam em 5 e se montam com 10% e 5%.
  const oitavo = p % 1 !== 0
  const dezenas = p - 5 === 10 ? { pt: '', en: '' } : {
    pt: `; ${p - 5}% é ${txt((base * (p - 5)) / 100)}`,
    en: `; ${p - 5}% is ${txt((base * (p - 5)) / 100)}`,
  }
  const atalho = oitavo
    ? {
        pt: `${p}% é ${p / 12.5}/8: ${num(base)} ÷ 8 = ${txt(base / 8)}, vezes ${p / 12.5} = ${num(valor)}`,
        en: `${p}% is ${p / 12.5}/8: ${num(base)} ÷ 8 = ${txt(base / 8)}, times ${p / 12.5} = ${num(valor)}`,
      }
    : {
        pt: `10% de ${num(base)} é ${txt(base / 10)}${dezenas.pt}; mais 5% (metade de 10%), ${txt(base / 20)}: ${num(valor)}`,
        en: `10% of ${num(base)} is ${txt(base / 10)}${dezenas.en}; plus 5% (half of 10%), ${txt(base / 20)}: ${num(valor)}`,
      }
  return {
    tipo: 'conta',
    familia: 'porcentagem_de',
    stem: `What is ${p}% of ${num(base)}?`,
    valor,
    expression: `${base}*${p}/100`,
    armadilhas: [
      base - valor, // respondeu o que sobra
      valor * 10, // casa decimal trocada (0.35 lido como 3.5)
      (base * (100 + p)) / 100, // somou o percentual
      valor / 10,
    ],
    explanation: {
      pt: `Monte com pedaços fáceis: ${atalho.pt}. Confira se a pergunta quer a parte (${num(valor)}) e não o que sobra (${num(base - valor)}).`,
      en: `Build it from easy pieces: ${atalho.en}. Check that the question wants the part (${num(valor)}), not what is left (${num(base - valor)}).`,
    },
  }
}

const todoPelaParte: Familia = (rng) => {
  const p = rng.pick([20, 25, 30, 35, 40, 45, 60, 65, 70, 75, 80, 85, 90])
  const todo = rng.int(4, 120) * 20
  const parte = (todo * p) / 100
  return {
    tipo: 'conta',
    familia: 'todo_pela_parte',
    stem: `${num(parte)} is ${p}% of what number?`,
    valor: todo,
    expression: `${parte}/(${p}/100)`,
    armadilhas: [
      (parte * (200 - p)) / 100, // somou à parte o percentual que falta
      (parte * p) / 100, // tirou ${p}% da parte
      (parte * 100) / (100 - p), // tratou a parte como o restante
      parte + (100 - p), // raciocínio aditivo
      todo * 10, // casa decimal trocada
    ],
    explanation: {
      pt:
        `${p}% do número é ${num(parte)}, então o número é ${num(parte)} ÷ ${p / 100} = ` +
        `${num(todo)}. Confira de volta: 10% de ${num(todo)} é ${txt(todo / 10)}, e ${p}% é ` +
        `${num(parte)}. O erro é aplicar o percentual à PARTE — somar ${100 - p}% a ` +
        `${num(parte)} dá ${txt((parte * (200 - p)) / 100)}, porque o percentual é do todo, ` +
        `que é justamente o que falta.`,
      en:
        `${p}% of the number is ${num(parte)}, so the number is ${num(parte)} ÷ ${p / 100} = ` +
        `${num(todo)}. Check it backwards: 10% of ${num(todo)} is ${txt(todo / 10)}, and ${p}% ` +
        `is ${num(parte)}. The mistake is applying the percentage to the PART — adding ` +
        `${100 - p}% to ${num(parte)} gives ${txt((parte * (200 - p)) / 100)}, because the ` +
        `percentage is of the whole, which is exactly what is missing.`,
    },
  }
}

const porcentagemDePorcentagem: Familia = (rng) => {
  const p1 = rng.pick([10, 20, 25, 30, 40, 50, 60, 75, 80])
  const p2 = rng.pick([15, 20, 25, 30, 35, 40, 45, 60, 75].filter((v) => v !== p1))
  const base = rng.int(5, 100) * 20
  const meio = (base * p2) / 100
  const valor = (meio * p1) / 100
  if (!ehInteiro(meio) || !ehInteiro(valor)) return null
  const efetivo = (p1 * p2) / 100
  return {
    tipo: 'conta',
    familia: 'porcentagem_de_porcentagem',
    stem: `What is ${p1}% of ${p2}% of ${num(base)}?`,
    valor,
    expression: `${p1}/100*${p2}/100*${base}`,
    armadilhas: [
      (base * (p1 + p2)) / 100, // somou os percentuais
      (base * Math.abs(p2 - p1)) / 100, // subtraiu os percentuais
      meio, // parou no primeiro percentual
      (base * p1) / 100, // aplicou só o de fora
      valor * 10, // casa decimal trocada
    ],
    explanation: {
      pt:
        `De dentro para fora: ${p2}% de ${num(base)} = ${txt(meio)}; ${p1}% disso = ` +
        `${num(valor)}. Percentual de percentual se MULTIPLICA: ${p1 / 100} × ${p2 / 100} = ` +
        `${efetivo / 100}, ou ${txt(efetivo)}% de ${num(base)}. Somar (${p1 + p2}%) é o erro ` +
        `que o enunciado quer provocar.`,
      en:
        `From the inside out: ${p2}% of ${num(base)} = ${txt(meio)}; ${p1}% of that = ` +
        `${num(valor)}. A percentage of a percentage MULTIPLIES: ${p1 / 100} × ${p2 / 100} = ` +
        `${efetivo / 100}, i.e. ${txt(efetivo)}% of ${num(base)}. Adding them (${p1 + p2}%) is ` +
        `the mistake the wording invites.`,
    },
  }
}

/** "30% of 120 is 45% of what number?" — duas bases numa frase só. */
const porcentagemEquivalente: Familia = (rng) => {
  const [p1, p2] = rng.shuffle([10, 15, 20, 25, 30, 35, 40, 45, 60, 75, 80]).slice(0, 2) as [number, number]
  const base = rng.int(3, 60) * 20
  const parte = (base * p1) / 100
  const valor = (parte * 100) / p2
  if (!ehInteiro(parte) || !ehInteiro(valor) || valor === base) return null
  return {
    tipo: 'conta',
    familia: 'porcentagem_equivalente',
    stem: `${p1}% of ${num(base)} is ${p2}% of what number?`,
    valor,
    expression: `${p1}/100*${base}/(${p2}/100)`,
    armadilhas: [
      (base * p2) / p1, // inverteu a razão dos percentuais
      parte, // parou no primeiro percentual
      (parte * p2) / 100, // tirou ${p2}% da parte
      base + p1 - p2, // raciocínio aditivo
      valor * 10,
    ],
    explanation: {
      pt:
        `${p1}% de ${num(base)} = ${txt(parte)}. Agora ${txt(parte)} é ${p2}% de quê? ` +
        `${txt(parte)} ÷ ${p2 / 100} = ${num(valor)}. Atalho: o número é ${num(base)} × ` +
        `${p1}/${p2}, ${p2 > p1 ? 'menor' : 'maior'} que ${num(base)} porque ${p2}% é um ` +
        `pedaço ${p2 > p1 ? 'maior' : 'menor'} que ${p1}%. Inverter a fração (× ${p2}/${p1}) ` +
        `é o erro comum.`,
      en:
        `${p1}% of ${num(base)} = ${txt(parte)}. Now ${txt(parte)} is ${p2}% of what? ` +
        `${txt(parte)} ÷ ${p2 / 100} = ${num(valor)}. Shortcut: the number is ${num(base)} × ` +
        `${p1}/${p2}, ${p2 > p1 ? 'smaller' : 'bigger'} than ${num(base)} because ${p2}% is a ` +
        `${p2 > p1 ? 'bigger' : 'smaller'} slice than ${p1}%. Flipping the fraction ` +
        `(× ${p2}/${p1}) is the common slip.`,
    },
  }
}

// --- Frações ----------------------------------------------------------------------

const FRACOES: readonly (readonly [number, number])[] = [
  [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6],
  [3, 8], [5, 8], [7, 8], [2, 7], [3, 7], [4, 9], [5, 9], [7, 10], [3, 10],
]

/** "What is 3/8 of 2/3 of 96?" — duas frações no nível 2, três no nível 4. */
const fracaoDeFracao: Familia = (rng, d) => {
  const quantas = d >= 4 ? 3 : 2
  const fracoes = rng.shuffle(FRACOES).slice(0, quantas)
  const denominadores = fracoes.reduce((acc, [, b]) => acc * b, 1)
  const total = denominadores * rng.int(1, 12)
  if (total < 30 || total > (quantas === 3 ? 3000 : 1000)) return null

  // Aplica de dentro para fora: a última fração citada incide primeiro no total.
  const passos = [total]
  for (const [a, b] of [...fracoes].reverse()) passos.push(((passos.at(-1) as number) * a) / b)
  if (!passos.every(ehInteiro)) return null
  const valor = passos.at(-1) as number
  const f = (x: readonly [number, number]) => x[0] / x[1]
  const semA = (k: number) => fracoes.reduce((acc, x, i) => (i === k ? acc : acc * f(x)), total)
  const [externa] = fracoes as [readonly [number, number]]
  const produto = reduzida(
    fracoes.reduce((acc, [a]) => acc * a, 1),
    denominadores,
  )

  return {
    tipo: 'conta',
    familia: 'fracao_de_fracao',
    stem: `What is ${fracoes.map(fr).join(' of ')} of ${num(total)}?`,
    valor,
    expression: `${fracoes.map(([a, b]) => `${a}/${b}`).join('*')}*${total}`,
    armadilhas: [
      ...fracoes.map((_, k) => semA(k)), // esqueceu uma das frações
      total * fracoes.reduce((acc, x) => acc + f(x), 0), // somou as frações
      (passos.at(-2) as number) * (externa[1] / externa[0]), // inverteu a fração de fora
      total - valor, // respondeu o que sobra
    ],
    explanation: {
      pt:
        `"De" é multiplicação. De dentro para fora: ${passos.map(num).join(' → ')}. Mais ` +
        `rápido: multiplique as frações e simplifique antes — ${fracoes.map(fr).join(' × ')} = ` +
        `${fr(produto)}, e ${fr(produto)} de ${num(total)} = ${num(valor)}. Somar as frações ` +
        `é o erro clássico: cada uma incide sobre o resultado da anterior.`,
      en:
        `"Of" means multiply. From the inside out: ${passos.map(num).join(' → ')}. Faster: ` +
        `multiply the fractions and cancel first — ${fracoes.map(fr).join(' × ')} = ` +
        `${fr(produto)}, and ${fr(produto)} of ${num(total)} = ${num(valor)}. Adding the ` +
        `fractions is the classic slip: each one applies to the result of the one before.`,
    },
  }
}

/** "36 is 3/8 of what number?" */
const todoPelaFracao: Familia = (rng) => {
  const [a, b] = rng.pick(FRACOES.filter(([x]) => x > 1))
  const todo = b * rng.int(3, 60)
  const parte = (todo * a) / b
  return {
    tipo: 'conta',
    familia: 'todo_pela_fracao',
    stem: `${num(parte)} is ${a}/${b} of what number?`,
    valor: todo,
    expression: `${parte}/(${a}/${b})`,
    armadilhas: [
      (parte * a) / b, // aplicou a fração em vez de desfazer
      (parte * b) / (b - a), // tratou a parte como o restante
      parte + (parte * (b - a)) / b, // somou a fração que falta sobre a parte
      parte * b, // esqueceu o numerador
      parte / a, // achou só "um pedaço"
    ],
    explanation: {
      pt:
        `${a}/${b} do número é ${num(parte)}. Um pedaço de 1/${b} é ${num(parte)} ÷ ${a} = ` +
        `${txt(parte / a)}, e o número inteiro são ${b} pedaços: ${txt(parte / a)} × ${b} = ` +
        `${num(todo)}. Dividir por ${a}/${b} é o mesmo que multiplicar por ${b}/${a}. ` +
        `Multiplicar por ${a}/${b} anda no sentido errado.`,
      en:
        `${a}/${b} of the number is ${num(parte)}. One 1/${b} piece is ${num(parte)} ÷ ${a} = ` +
        `${txt(parte / a)}, and the whole number is ${b} pieces: ${txt(parte / a)} × ${b} = ` +
        `${num(todo)}. Dividing by ${a}/${b} is the same as multiplying by ${b}/${a}. ` +
        `Multiplying by ${a}/${b} goes the wrong way.`,
    },
  }
}

/** "What is 2/3 of 45% of 1/5 of 2,000?" — fração, percentual e fração encadeados. */
const cadeiaMista: Familia = (rng) => {
  const f1 = rng.pick(FRACOES)
  const p = rng.pick([15, 20, 25, 30, 35, 40, 45, 60, 75])
  const f2 = rng.pick(FRACOES.filter((x) => x !== f1))
  const total = rng.int(2, 80) * 100
  const passo1 = (total * f2[0]) / f2[1]
  const passo2 = (passo1 * p) / 100
  const valor = (passo2 * f1[0]) / f1[1]
  if (![passo1, passo2, valor].every(ehInteiro)) return null
  return {
    tipo: 'conta',
    familia: 'cadeia_mista',
    stem: `What is ${fr(f1)} of ${p}% of ${fr(f2)} of ${num(total)}?`,
    valor,
    expression: `${f1[0]}/${f1[1]}*${p}/100*${f2[0]}/${f2[1]}*${total}`,
    armadilhas: [
      passo2, // parou antes da última fração
      (total * p * f1[0]) / (100 * f1[1]), // pulou a fração de dentro
      (passo1 * f1[0]) / f1[1], // pulou o percentual
      (passo2 * f1[1]) / f1[0], // inverteu a fração de fora
      valor * 10,
    ],
    explanation: {
      pt:
        `De dentro para fora: ${fr(f2)} de ${num(total)} = ${num(passo1)}; ${p}% disso = ` +
        `${num(passo2)}; ${fr(f1)} disso = ${num(valor)}. A ordem não muda o resultado — é tudo ` +
        `multiplicação —, então comece pelo passo que simplifica mais. O que não pode é pular ` +
        `um elo da cadeia.`,
      en:
        `From the inside out: ${fr(f2)} of ${num(total)} = ${num(passo1)}; ${p}% of that = ` +
        `${num(passo2)}; ${fr(f1)} of that = ${num(valor)}. The order does not change the ` +
        `result — it is all multiplication —, so start with whichever step cancels most. What ` +
        `you cannot do is skip a link in the chain.`,
    },
  }
}

// --- Mais perto de ------------------------------------------------------------------

/** Frações cujo valor não cai em cima de x.xx5 — senão o arredondamento empataria. */
const ALVOS_FRACAO: readonly (readonly [number, number])[] = [
  [1, 3], [2, 3], [1, 6], [5, 6], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
  [1, 9], [2, 9], [7, 9], [8, 9], [2, 11], [3, 11], [4, 11], [7, 11], [1, 12], [5, 12], [7, 12],
]

const ALVOS_DECIMAL = [15, 2, 25, 3, 35, 4, 45, 55, 6, 65, 7, 75, 8, 85, 9].map((v) =>
  v < 10 ? v / 10 : v / 100,
)

/**
 * Nível 3: alvo em fração, alternativas em decimal ("closest to 1/3?").
 * Nível 4: alvo em decimal, alternativas em fração — cada uma precisa virar
 * decimal de cabeça, e as distâncias ficam parecidas.
 */
const maisPertoDe: Familia = (rng, d) => {
  if (d === 3) {
    const [a, b] = rng.pick(ALVOS_FRACAO)
    const t = a / b
    const m = Math.round(t * 100)
    const candidatos = [
      m,
      Math.round(t * 10) * 10, // arredondou cedo demais, para uma casa
      m + 1,
      m - 1,
      m + 2,
      m - 2,
      Math.floor(t * 10) * 10 + 5,
    ]
    const vistos = new Set<number>()
    const escolhidos = [m]
    vistos.add(m)
    for (const c of [candidatos[1] as number, ...rng.shuffle(candidatos.slice(2))]) {
      if (escolhidos.length >= OPCOES_POR_QUESTAO) break
      if (c <= 0 || c >= 100 || vistos.has(c)) continue
      vistos.add(c)
      escolhidos.push(c)
    }
    const alternativas = escolhidos.map((c) => decimalDe(c, 2))
    return perto('mais_perto_de', fr([a, b]), `${a}/${b}`, t, alternativas, {
      pt: `${fr([a, b])} = ${t.toFixed(4)}…`,
      en: `${fr([a, b])} = ${t.toFixed(4)}…`,
    })
  }

  const t = rng.pick(ALVOS_DECIMAL)
  const pool: string[] = []
  for (let den = 3; den <= 16; den++) {
    for (let num_ = 1; num_ < den; num_++) {
      const v = num_ / den
      if (mdc(num_, den) === 1 && Math.abs(v - t) <= 0.1 && Math.abs(v - t) > 1e-9) pool.push(`${num_}/${den}`)
    }
  }
  const alternativas = rng.shuffle(pool).slice(0, OPCOES_POR_QUESTAO)
  const alvo = String(t)
  return perto('mais_perto_de', alvo, alvo, t, ordenarPorDistancia(alternativas, t), {
    pt: `o alvo é ${alvo}`,
    en: `the target is ${alvo}`,
  })
}

function ordenarPorDistancia(alternativas: string[], t: number): string[] {
  return [...alternativas].sort((x, y) => Math.abs(parseNumber(x) - t) - Math.abs(parseNumber(y) - t))
}

/**
 * Monta a questão de "mais perto": a primeira alternativa precisa ser a mais
 * perto do alvo, com folga sobre a segunda — sem folga, a questão vira
 * loteria de arredondamento.
 */
function perto(
  familia: string,
  alvoTexto: string,
  alvoExpressao: string,
  t: number,
  alternativas: string[],
  alvoExplicado: LocalizedText,
): Escolha | null {
  if (alternativas.length < OPCOES_POR_QUESTAO) return null
  const dist = alternativas.map((x) => Math.abs(parseNumber(x) - t))
  const [melhor, segunda] = [...dist].sort((x, y) => x - y) as [number, number]
  if (dist[0] !== melhor || segunda - melhor < 0.002) return null

  const lista = alternativas
    .map((x, i) => `${x}${x.includes('/') ? ` ≈ ${parseNumber(x).toFixed(3)}` : ''} (${(dist[i] as number).toFixed(3)})`)
    .join('; ')
  return {
    tipo: 'escolha',
    familia,
    stem: `Which of the following is closest to ${alvoTexto}?`,
    alternativas,
    expression: `nearest(${alvoExpressao},${alternativas.join(',')})`,
    explanation: {
      pt:
        `Leve tudo para decimal e meça a distância: ${alvoExplicado.pt}; ${lista}. A menor ` +
        `distância é a de ${alternativas[0]}. Parecer com o alvo não basta — ` +
        `a alternativa "redonda" costuma estar mais longe do que aparenta.`,
      en:
        `Turn everything into decimals and measure the gap: ${alvoExplicado.en}; ${lista}. The ` +
        `smallest gap belongs to ${alternativas[0]}. Looking like the target is not enough — ` +
        `the "round" option is often further away than it seems.`,
    },
  }
}

// --- Comparar frações --------------------------------------------------------------

/**
 * Nível 4: todas as frações ficam do mesmo lado de 1/2, coladas nela. O
 * atalho é medir quanto cada uma passa (ou falta) de 1/2: a/b − 1/2 =
 * (2a − b)/(2b). A série 2/3, 5/9, 7/13, 4/7, 3/5 da prova real é deste tipo.
 */
const fracaoReferencia: Familia = (rng) => {
  const acima = rng.next() < 0.5
  const pool: [number, number][] = []
  for (let b = 5; b <= 25; b++) {
    for (const e of [1, 2, 3]) {
      const a = (b + (acima ? e : -e)) / 2
      if (ehInteiro(a) && a > 0 && mdc(a, b) === 1) pool.push([a, b])
    }
  }
  const fracoes = rng.shuffle(pool).slice(0, OPCOES_POR_QUESTAO)
  const menor = rng.next() < 0.5
  const escolha = extremo(fracoes, menor, 0.004)
  if (!escolha) return null

  const excesso = (f: readonly [number, number]) => fr(reduzida(Math.abs(2 * f[0] - f[1]), 2 * f[1]))
  const lista = escolha.map((f) => `${fr(f)} → ${excesso(f)}`).join('; ')
  const lado = acima ? { pt: 'passa de', en: 'is above' } : { pt: 'falta para', en: 'is below' }
  const decide =
    acima === menor
      ? { pt: 'a que fica MAIS PERTO de 1/2', en: 'the one CLOSEST to 1/2' }
      : { pt: 'a que fica MAIS LONGE de 1/2', en: 'the one FURTHEST from 1/2' }
  return comparacaoDeFracoes('fracao_referencia', escolha, menor, {
    pt:
      `Todas ficam logo ${acima ? 'acima' : 'abaixo'} de 1/2. Quanto cada uma ${lado.pt} 1/2 ` +
      `é |2a − b|/(2b): ${lista}. A ${menor ? 'menor' : 'maior'} fração é ${decide.pt}: ` +
      `${fr(escolha[0] as [number, number])}. Maior denominador ou menor numerador não ` +
      `decidem sozinhos — compare com a referência.`,
    en:
      `They all sit just ${acima ? 'above' : 'below'} 1/2. How far each one ${lado.en} 1/2 is ` +
      `|2a − b|/(2b): ${lista}. The ${menor ? 'smallest' : 'largest'} fraction is ` +
      `${decide.en}: ${fr(escolha[0] as [number, number])}. The biggest denominator or the ` +
      `smallest numerator does not decide it on its own — compare against the benchmark.`,
  })
}

/**
 * Nível 5: frações coladas umas nas outras, longe de qualquer referência. Só o
 * produto cruzado separa: a/b > c/d ⇔ a·d > c·b.
 */
const fracaoProdutoCruzado: Familia = (rng) => {
  const centro = rng.int(55, 88) / 100
  const pool: [number, number][] = []
  for (let b = 5; b <= 19; b++) {
    for (let a = 1; a < b; a++) {
      if (mdc(a, b) === 1 && Math.abs(a / b - centro) <= 0.035) pool.push([a, b])
    }
  }
  const fracoes = rng.shuffle(pool).slice(0, OPCOES_POR_QUESTAO)
  const menor = rng.next() < 0.5
  const escolha = extremo(fracoes, menor, 0.002)
  if (!escolha) return null

  const [a, b] = escolha[0] as [number, number]
  // o páreo: a alternativa mais perto da resposta
  const [c, dd] = [...escolha.slice(1)].sort(
    (x, y) => Math.abs(x[0] / x[1] - a / b) - Math.abs(y[0] / y[1] - a / b),
  )[0] as [number, number]
  const sinal = menor ? '<' : '>'
  return comparacaoDeFracoes('fracao_produto_cruzado', escolha, menor, {
    pt:
      `Os valores são próximos demais para estimar (${escolha.map((f) => `${fr(f)} ≈ ${(f[0] / f[1]).toFixed(3)}`).join(', ')}). ` +
      `Compare pelo produto cruzado: a/b ${sinal} c/d quando a·d ${sinal} c·b. O páreo é ` +
      `${fr([a, b])} contra ${fr([c, dd])}: ${a} × ${dd} = ${a * dd} e ${c} × ${b} = ${c * b}, ` +
      `então ${fr([a, b])} é a ${menor ? 'menor' : 'maior'}. Faça o mesmo com as outras — ` +
      `é conta de inteiros, sem divisão.`,
    en:
      `The values are too close to eyeball (${escolha.map((f) => `${fr(f)} ≈ ${(f[0] / f[1]).toFixed(3)}`).join(', ')}). ` +
      `Compare by cross-multiplying: a/b ${sinal} c/d when a·d ${sinal} c·b. The close call is ` +
      `${fr([a, b])} against ${fr([c, dd])}: ${a} × ${dd} = ${a * dd} and ${c} × ${b} = ` +
      `${c * b}, so ${fr([a, b])} is the ${menor ? 'smallest' : 'largest'}. Do the same with ` +
      `the others — it is whole-number arithmetic, no division.`,
  })
}

/**
 * Reordena as frações com a extrema primeiro e confere que a questão não se
 * resolve por atalho errado: nem o maior (menor) denominador nem o menor
 * (maior) numerador podem apontar a resposta. Exige folga entre a extrema e a
 * segunda colocada.
 */
function extremo(fracoes: [number, number][], menor: boolean, folga: number): [number, number][] | null {
  if (fracoes.length < OPCOES_POR_QUESTAO) return null
  const valor = (f: [number, number]) => f[0] / f[1]
  const ordenadas = [...fracoes].sort((x, y) => (menor ? valor(x) - valor(y) : valor(y) - valor(x)))
  const [primeira, segunda] = ordenadas as [[number, number], [number, number]]
  if (Math.abs(valor(primeira) - valor(segunda)) < folga) return null

  const pelo = (chave: (f: [number, number]) => number, maior: boolean) => {
    const alvo = maior ? Math.max(...fracoes.map(chave)) : Math.min(...fracoes.map(chave))
    return fracoes.filter((f) => chave(f) === alvo)
  }
  const heuristicas = [
    pelo((f) => f[1], menor), // "maior denominador = menor fração"
    pelo((f) => f[0], !menor), // "menor numerador = menor fração"
  ]
  if (heuristicas.some((h) => h.length === 1 && h[0] === primeira)) return null
  return [primeira, ...fracoes.filter((f) => f !== primeira)]
}

function comparacaoDeFracoes(
  familia: string,
  fracoes: [number, number][],
  menor: boolean,
  explanation: LocalizedText,
): Escolha {
  const alternativas = fracoes.map(fr)
  return {
    tipo: 'escolha',
    familia,
    stem: `Which of the following fractions is the ${menor ? 'smallest' : 'largest'}?`,
    alternativas,
    expression: `${menor ? 'min' : 'max'}(${alternativas.join(',')})`,
    explanation,
  }
}

// --- Registro ---------------------------------------------------------------------

const FAMILIAS: Record<Difficulty, Familia[]> = {
  1: [compararDecimais, produtoDecimal],
  2: [compararDecimais, fracaoDeFracao, porcentagemDe, quocienteDecimal],
  3: [todoPelaParte, porcentagemDePorcentagem, maisPertoDe],
  4: [fracaoReferencia, maisPertoDe, fracaoDeFracao, todoPelaFracao],
  5: [fracaoProdutoCruzado, porcentagemEquivalente, cadeiaMista],
}

export const gerarCalculoBasico: MathGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  // A família é sorteada UMA vez; só os parâmetros são re-sorteados. Re-sortear
  // a família a cada descarte favoreceria as que passam mais fácil no filtro.
  const familia = rng.pick(FAMILIAS[difficulty])
  const problema = semVazamento(() => familia(rng, difficulty))
  return montar(rng, problema)
}

export const CALCULO_GENERATORS = {
  calculo_basico: gerarCalculoBasico,
} as const satisfies Record<string, MathGenerator>

// --- Sorteio ------------------------------------------------------------------------

/**
 * Sorteia até sair um problema utilizável: nada degenerado, e a resposta não
 * aparece no enunciado — nem como número, nem pela checagem textual do gate G2.
 */
function semVazamento(build: () => Problema | null): Problema {
  for (let tentativa = 0; tentativa < 400; tentativa++) {
    const p = build()
    if (!p) continue
    const resposta = p.tipo === 'conta' ? txt(p.valor) : (p.alternativas[0] as string)
    const valor = parseNumber(resposta)
    if (numerosDe(p.stem).some((n) => Math.abs(n - valor) < 1e-9)) continue
    if (` ${normalizeText(p.stem)} `.includes(` ${normalizeText(resposta)} `)) continue
    if (p.tipo === 'escolha' && !escolhaValida(p)) continue
    return p
  }
  throw new Error('não consegui montar uma questão de cálculo básico')
}

/** Cinco alternativas distintas no valor e no texto normalizado. */
function escolhaValida(p: Escolha): boolean {
  if (p.alternativas.length !== OPCOES_POR_QUESTAO) return false
  const valores = p.alternativas.map(parseNumber)
  if (new Set(valores).size !== valores.length) return false
  return new Set(p.alternativas.map(normalizeText)).size === p.alternativas.length
}

// --- Montagem -----------------------------------------------------------------------

function montar(rng: Rng, p: Problema): MathGenerated {
  const textos = p.tipo === 'escolha' ? p.alternativas : comDistratores(p)
  const embaralhados = rng.shuffle(textos.map((t, i) => ({ t, isCorrect: i === 0 })))
  const options = embaralhados.map((o, i) => ({ id: optionIdAt(i) as string, text: o.t }))
  const answerIndex = embaralhados.findIndex((o) => o.isCorrect)
  const resposta = textos[0] as string

  return {
    subtipo: 'calculo_basico',
    stem: p.stem,
    options,
    answerId: optionIdAt(answerIndex) as string,
    explanation: {
      pt: `A resposta é ${resposta}. ${p.explanation.pt}`,
      en: `The answer is ${resposta}. ${p.explanation.en}`,
    },
    expression: p.expression,
    answerValue: parseNumber(resposta),
    familia: p.familia,
  }
}

/**
 * Distratores de uma conta = as armadilhas, filtradas: positivas, exibíveis sem
 * arredondar, sem repetir texto e — se a resposta é inteira — inteiras, porque
 * um "431.2" entre inteiros denuncia que não é a conta certa. A escala fica
 * livre até 100×: errar a casa decimal é o erro que estas questões medem.
 */
function comDistratores(p: Conta): string[] {
  const resposta = txt(p.valor)
  const textos = [resposta]
  const vistos = new Set([normalizeText(resposta)])
  const inteira = ehInteiro(p.valor)

  const aceita = (bruto: number): boolean => {
    if (!Number.isFinite(bruto) || bruto <= 0) return false
    if (inteira && !ehInteiro(bruto)) return false
    if (!casasOk(bruto)) return false
    if (bruto > p.valor * 100 + 1e-9 || bruto < p.valor / 100 - 1e-9) return false
    const t = txt(bruto)
    const norm = normalizeText(t)
    // Mesma régua do gate: distrator dentro da tolerância da resposta seria um segundo gabarito.
    const perto = Math.max(toleranciaDe(t), toleranciaDe(resposta))
    if (vistos.has(norm) || Math.abs(parseNumber(t) - p.valor) <= perto) return false
    if (` ${normalizeText(p.stem)} `.includes(` ${norm} `)) return false
    vistos.add(norm)
    textos.push(t)
    return true
  }

  for (const a of p.armadilhas) {
    if (textos.length >= OPCOES_POR_QUESTAO) break
    aceita(c6(a))
  }

  // Rede de segurança: as armadilhas podem colidir entre si. Completa com
  // deslizes de conta perto da resposta, na mesma precisão dela.
  const casas = casasDe(resposta)
  const grao = inteira ? Math.max(1, Math.round(p.valor * 0.05)) : 10 ** -casas
  for (let passo = 1; textos.length < OPCOES_POR_QUESTAO; passo++) {
    if (passo > 200) throw new Error(`não consegui montar distratores para ${p.familia}`)
    const sinal = passo % 2 === 0 ? 1 : -1
    aceita(c6(p.valor + sinal * Math.ceil(passo / 2) * grao))
  }
  return textos
}

// --- Utilitários --------------------------------------------------------------------

/** m·10^-casas escrito sem ruído de ponto flutuante: decimalDe(77, 4) = "0.0077". */
function decimalDe(m: number, casas: number): string {
  if (casas <= 0) return String(m * 10 ** -casas)
  const s = String(m).padStart(casas + 1, '0')
  const inteiro = s.slice(0, s.length - casas)
  const decimal = s.slice(s.length - casas).replace(/0+$/, '')
  return decimal ? `${inteiro}.${decimal}` : inteiro
}

/** Valor como aparece na alternativa: inteiro com separador en-US, decimal sem zero à direita. */
function txt(v: number): string {
  if (ehInteiro(v)) return formatNumber(Math.round(v))
  const [inteiro, decimal] = v.toFixed(6).replace(/0+$/, '').split('.')
  return `${formatNumber(Number(inteiro))}.${decimal}`
}

function num(v: number): string {
  return formatNumber(v)
}

function fr(f: readonly [number, number]): string {
  return `${f[0]}/${f[1]}`
}

function reduzida(a: number, b: number): [number, number] {
  const g = mdc(a, b)
  return [a / g, b / g]
}

function casasDe(texto: string): number {
  return texto.split('.')[1]?.length ?? 0
}

/** Números citados num enunciado, no formato en-US (1,234.50); "3/8" conta como 3 e 8. */
function numerosDe(stem: string): number[] {
  return (stem.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((bruto) => Number(bruto.replace(/,/g, '')))
}

/** Limpa o ruído de ponto flutuante em 6 casas, o máximo que uma alternativa mostra. */
function c6(v: number): number {
  return Math.round(v * 1e6) / 1e6
}

function casasOk(v: number): boolean {
  return Math.abs(v * 1e6 - Math.round(v * 1e6)) < 1e-6
}

function ehInteiro(v: number): boolean {
  return Math.abs(v - Math.round(v)) < 1e-9
}

function mdc(a: number, b: number): number {
  return b === 0 ? a : mdc(b, a % b)
}
