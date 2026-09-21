import type { SpatialSpec } from '../schema'
import { mulberry32, type Rng } from '../rng'
import type { Difficulty } from '../taxonomy'
import {
  ANGULAR_STEPS,
  type Cell,
  type Glyph,
  isUsable,
  key,
  MAX_RADIUS,
  MIN_RADIUS,
  reflect,
  rotate,
  sameUpToRotation,
} from './glyph'
import { glyphToSpec, matrixToSpec, sequenceToSpec } from './render'
import type { LocalizedText } from '../i18n'
import {
  distanciaVisual,
  ehLegivel,
  MIN_SEPARACAO_ALTERNATIVAS,
} from './legibility'
import { optionIdAt } from '../optionIds'

/**
 * Geradores de questão espacial (PRD §4.10).
 *
 * Contrato de cada gerador: dada uma seed e um nível, devolve uma questão
 * completa **e** o gabarito, derivado da regra que construiu a figura — nunca
 * de um julgamento posterior. O gate re-executa com a mesma seed e compara.
 *
 * Invariante que todo gerador precisa garantir, e que o teste verifica em massa:
 *  (a) mesma seed → questão idêntica
 *  (b) exatamente UMA alternativa satisfaz a regra
 *  (c) nenhuma alternativa visualmente igual a outra
 */

export interface SpatialGenerated {
  subtipo: string
  /** sempre em ingles: a CCAT e aplicada em ingles */
  stem: string
  stemSpatial?: SpatialSpec
  options: { id: string; spatial: SpatialSpec }[]
  answerId: string
  explanation: LocalizedText
  /** a regra, para o gate auditar as alternativas uma a uma */
  satisfiesRule: (glyph: Glyph) => boolean
  /** figuras das alternativas, na ordem em que aparecem */
  optionGlyphs: Glyph[]
}

export type SpatialGenerator = (seed: number, difficulty: Difficulty) => SpatialGenerated

interface Params {
  cells: number
  optionCount: 4 | 5
}

/**
 * O distrator "quase certo" foi removido.
 *
 * Ele deslocava UMA celula um passo de raio. Medido, isso deixava 95% das
 * questoes de nivel 4-5 com duas alternativas a menos de 14px uma da outra:
 * nao testava raciocinio espacial, testava acuidade visual. A dificuldade dos
 * niveis altos vem do numero de vertices e de alternativas, que ja escalam.
 */

function paramsFor(difficulty: Difficulty): Params {
  switch (difficulty) {
    case 1:
      return { cells: 3, optionCount: 4 }
    case 2:
      return { cells: 4, optionCount: 4 }
    case 3:
      return { cells: 4, optionCount: 5 }
    case 4:
      return { cells: 5, optionCount: 5 }
    case 5:
      return { cells: 6, optionCount: 5 }
  }
}

/** Passos de 30 graus aplicados ao espelho: 0, +-30, +-60. */
const GIRO_DO_ESPELHO = [0, 1, 2, 10, 11]

// --- Geradores ---------------------------------------------------------------

export const gerarRotacao: SpatialGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const p = paramsFor(difficulty)
  const base = drawUsableGlyph(rng, p.cells)

  const giro = rng.pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 11])
  const correct = rotate(base, giro)
  const espelho = reflect(base)

  // Uma rotação da figura original satisfaz; o espelho nunca satisfaz, porque
  // a figura é quiral por construção.
  const satisfiesRule = (g: Glyph) => sameUpToRotation(g, base)

  const nextDistractor = () => rotate(espelho, rng.int(0, ANGULAR_STEPS - 1))

  const { options, answerId, optionGlyphs } = buildOptions(
    rng,
    correct,
    satisfiesRule,
    nextDistractor,
    p.optionCount,
  )

  return {
    subtipo: 'rotacao',
    stem: 'Which of the following is the same figure above, only rotated?',
    stemSpatial: glyphToSpec(base),
    options,
    answerId,
    explanation: {
      pt:
        `A figura correta é a original girada ${giro * 30}°. As demais são a imagem ` +
        `espelhada: por mais que você gire uma delas no papel, ela nunca se sobrepõe ` +
        `à figura do enunciado. O atalho é fixar um vértice de referência (o ponto ` +
        `preenchido) e conferir se a ordem dos outros vértices ao redor dele se mantém — ` +
        `girar preserva essa ordem, espelhar inverte.`,
      en:
        `The correct figure is the original rotated by ${giro * 30}°. The others are its ` +
        `mirror image: however far you turn one of them on the page, it never lines up ` +
        `with the figure in the prompt. The shortcut is to fix one reference vertex (the ` +
        `filled dot) and check whether the order of the remaining vertices around it ` +
        `holds — rotation preserves that order, reflection reverses it.`,
    },
    satisfiesRule,
    optionGlyphs,
  }
}

export const gerarReflexao: SpatialGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const p = paramsFor(difficulty)
  const base = drawUsableGlyph(rng, p.cells)

  const espelho = reflect(base)
  // Giro extra PEQUENO (ate 60 graus), nao aleatorio entre 0 e 330.
  //
  // Girar o espelho a esmo obriga a normalizar a orientacao E detectar a
  // lateralidade ao mesmo tempo: nenhuma alternativa se parece com um "vira de
  // lado" do enunciado, e a questao deixa de ser respondivel em 18 segundos.
  // Um giro curto mantem a exigencia sem torna-la impossivel. Alargue esta
  // lista para deixar a reflexao mais dura.
  const correct = rotate(espelho, rng.pick(GIRO_DO_ESPELHO))
  const satisfiesRule = (g: Glyph) => sameUpToRotation(g, espelho)

  const nextDistractor = () => rotate(base, rng.int(0, ANGULAR_STEPS - 1))

  const { options, answerId, optionGlyphs } = buildOptions(
    rng,
    correct,
    satisfiesRule,
    nextDistractor,
    p.optionCount,
  )

  return {
    subtipo: 'reflexao',
    stem: 'Which of the following is the mirror image of the figure above?',
    stemSpatial: glyphToSpec(base),
    options,
    answerId,
    explanation: {
      pt:
        `A alternativa correta é o espelho da figura do enunciado (podendo estar ` +
        `girada). As outras são apenas rotações da figura original. Teste rápido: ` +
        `percorra os vértices a partir do ponto preenchido. Se no enunciado a ordem ` +
        `é horária e na alternativa é anti-horária, é espelho.`,
      en:
        `The correct option is the mirror of the figure in the prompt (it may also be ` +
        `rotated). The others are plain rotations of the original. Quick test: walk the ` +
        `vertices starting from the filled dot. If the prompt runs clockwise and the ` +
        `option runs counter-clockwise, that option is the mirror.`,
    },
    satisfiesRule,
    optionGlyphs,
  }
}

export const gerarOddOneOut: SpatialGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const p = paramsFor(difficulty)
  const base = drawUsableGlyph(rng, p.cells)

  // A intrusa é o espelho: todas as outras são a mesma figura girada.
  const correct = rotate(reflect(base), rng.int(0, ANGULAR_STEPS - 1))
  const satisfiesRule = (g: Glyph) => !sameUpToRotation(g, base)

  const nextDistractor = () => rotate(base, rng.int(0, ANGULAR_STEPS - 1))

  const { options, answerId, optionGlyphs } = buildOptions(
    rng,
    correct,
    satisfiesRule,
    nextDistractor,
    p.optionCount,
  )

  return {
    subtipo: 'odd_one_out',
    stem: `${p.optionCount - 1} of the figures below are the same figure, only rotated. Which one does not belong?`,
    options,
    answerId,
    explanation: {
      pt:
        `Todas as figuras do grupo são a mesma, em rotações diferentes — exceto uma, ` +
        `que é a imagem espelhada. Rotação nunca troca a "mão" da figura; espelho sim. ` +
        `Em vez de comparar as figuras duas a duas, escolha um detalhe assimétrico e ` +
        `veja em qual alternativa ele aparece do lado oposto.`,
      en:
        `Every figure in the group is the same shape at a different rotation — except ` +
        `one, which is the mirror image. Rotation never changes the handedness of a ` +
        `figure; reflection does. Instead of comparing figures pairwise, pick one ` +
        `asymmetric detail and find the option where it sits on the opposite side.`,
    },
    satisfiesRule,
    optionGlyphs,
  }
}

export const gerarSerieFormas: SpatialGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const p = paramsFor(difficulty)
  const base = drawUsableGlyph(rng, p.cells)

  // Passos que mantêm as 4 figuras exibidas + a resposta todas distintas.
  const passo = rng.pick([1, 2, 5, 7, 10, 11])
  const mostradas = [0, 1, 2, 3].map((i) => rotate(base, i * passo))
  const correct = rotate(base, 4 * passo)

  // Aqui a regra é a orientação exata, não "alguma rotação".
  const alvo = key(correct)
  const satisfiesRule = (g: Glyph) => key(g) === alvo

  const nextDistractor = () => rotate(base, rng.int(0, ANGULAR_STEPS - 1))

  const { options, answerId, optionGlyphs } = buildOptions(
    rng,
    correct,
    satisfiesRule,
    nextDistractor,
    p.optionCount,
  )

  return {
    subtipo: 'serie_formas',
    stem: 'Which figure completes the sequence?',
    stemSpatial: sequenceToSpec([...mostradas, null]),
    options,
    answerId,
    explanation: {
      pt:
        `A cada passo a figura gira ${passo * 30}° no sentido horário. Da quarta para ` +
        `a quinta posição o giro acumulado chega a ${(4 * passo * 30) % 360}° em ` +
        `relação à primeira. Não tente enxergar a figura inteira girando: acompanhe ` +
        `um único vértice e conte de quantos passos ele anda a cada quadro.`,
      en:
        `Each step turns the figure ${passo * 30}° clockwise. By the fifth position the ` +
        `accumulated rotation reaches ${(4 * passo * 30) % 360}° relative to the first. ` +
        `Do not try to rotate the whole figure in your head: track a single vertex and ` +
        `count how many steps it moves between frames.`,
    },
    satisfiesRule,
    optionGlyphs,
  }
}

export const gerarMatriz: SpatialGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const p = paramsFor(difficulty)
  const base = drawUsableGlyph(rng, p.cells)

  // Unidades mod 12: garantem que as 9 posições da matriz sejam distintas.
  const passo = rng.pick([1, 5, 7, 11])
  const celulas = Array.from({ length: 9 }, (_, i) => rotate(base, i * passo))
  const correct = celulas[8] as Glyph
  const grade: (Glyph | null)[] = [...celulas.slice(0, 8), null]

  const alvo = key(correct)
  const satisfiesRule = (g: Glyph) => key(g) === alvo

  const nextDistractor = () => rotate(base, rng.int(0, ANGULAR_STEPS - 1))

  const { options, answerId, optionGlyphs } = buildOptions(
    rng,
    correct,
    satisfiesRule,
    nextDistractor,
    p.optionCount,
  )

  return {
    subtipo: 'matriz',
    stem: 'Which figure completes the matrix?',
    stemSpatial: matrixToSpec(grade),
    options,
    answerId,
    explanation: {
      pt:
        `A matriz é lida da esquerda para a direita, linha a linha: cada casa gira ` +
        `${passo * 30}° em relação à anterior. A casa que falta é a nona, ou seja, ` +
        `${passo * 8} passos depois da primeira. Confira pela coluna também — se o ` +
        `padrão fecha nos dois sentidos, você achou a regra certa.`,
      en:
        `Read the matrix left to right, row by row: each cell turns ${passo * 30}° ` +
        `relative to the previous one. The missing cell is the ninth, that is, ` +
        `${passo * 8} steps after the first. Check down the columns too — if the pattern ` +
        `holds both ways, you have the right rule.`,
    },
    satisfiesRule,
    optionGlyphs,
  }
}

export const SPATIAL_GENERATORS = {
  rotacao: gerarRotacao,
  reflexao: gerarReflexao,
  odd_one_out: gerarOddOneOut,
  serie_formas: gerarSerieFormas,
  matriz: gerarMatriz,
} as const satisfies Record<string, SpatialGenerator>

export type SpatialGeneratorId = keyof typeof SPATIAL_GENERATORS

export const SPATIAL_GENERATOR_IDS = Object.keys(
  SPATIAL_GENERATORS,
) as SpatialGeneratorId[]

// --- Infra compartilhada -----------------------------------------------------

/**
 * Sorteia uma figura utilizavel E legivel.
 *
 * `isUsable` garante o que a algebra precisa: quiral, sem simetria rotacional.
 * Nao garante o que o OLHO precisa. Numa figura de tres vertices quase
 * colineares — uma reta disfarcada — o espelho e visualmente identico a uma
 * rotacao, e a questao fica impossivel de responder mesmo estando correta.
 * `ehLegivel` mede isso em pixels, na caixa em que a figura e desenhada.
 */
function drawUsableGlyph(rng: Rng, cells: number): Glyph {
  for (let tentativa = 0; tentativa < 4000; tentativa++) {
    const usadas = new Set<string>()
    const glyph: Cell[] = []
    while (glyph.length < cells) {
      const a = rng.int(0, ANGULAR_STEPS - 1)
      const r = rng.int(MIN_RADIUS, MAX_RADIUS)
      const k = `${a}:${r}`
      if (usadas.has(k)) continue
      usadas.add(k)
      glyph.push({ a, r })
    }
    if (isUsable(glyph) && ehLegivel(glyph)) return glyph
  }
  throw new Error(`não consegui sortear figura legível com ${cells} células`)
}

/**
 * Monta as alternativas. Um distrator só entra se (a) NÃO satisfizer a regra —
 * senão a questão teria duas respostas certas — e (b) não for visualmente
 * idêntico a uma alternativa já escolhida.
 */
function buildOptions(
  rng: Rng,
  correct: Glyph,
  satisfiesRule: (g: Glyph) => boolean,
  nextDistractor: () => Glyph,
  optionCount: number,
): { options: { id: string; spatial: SpatialSpec }[]; answerId: string; optionGlyphs: Glyph[] } {
  if (!satisfiesRule(correct)) {
    throw new Error('gerador inconsistente: a resposta correta não satisfaz a própria regra')
  }

  const escolhidas: Glyph[] = [correct]
  const chaves = new Set([key(correct)])

  let guard = 0
  while (escolhidas.length < optionCount) {
    if (guard++ > 800) {
      throw new Error('não consegui montar distratores suficientes sem colisão')
    }
    const cand = nextDistractor()
    if (satisfiesRule(cand)) continue
    const k = key(cand)
    if (chaves.has(k)) continue
    // Nao basta ser uma figura diferente: precisa PARECER diferente. Duas
    // alternativas a poucos pixels uma da outra transformam a questao em caca
    // ao pixel em vez de raciocinio espacial.
    if (escolhidas.some((e) => distanciaVisual(e, cand) < MIN_SEPARACAO_ALTERNATIVAS)) continue
    chaves.add(k)
    escolhidas.push(cand)
  }

  const embaralhadas = rng.shuffle(
    escolhidas.map((glyph, i) => ({ glyph, isCorrect: i === 0 })),
  )

  const options = embaralhadas.map((o, i) => ({
    id: optionIdAt(i) as string,
    spatial: glyphToSpec(o.glyph),
  }))
  const answerIndex = embaralhadas.findIndex((o) => o.isCorrect)

  return {
    options,
    answerId: optionIdAt(answerIndex) as string,
    optionGlyphs: embaralhadas.map((o) => o.glyph),
  }
}
