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
  stem: string
  stemSpatial?: SpatialSpec
  options: { id: string; spatial: SpatialSpec }[]
  answerId: string
  explanation: string
  /** a regra, para o gate auditar as alternativas uma a uma */
  satisfiesRule: (glyph: Glyph) => boolean
  /** figuras das alternativas, na ordem em que aparecem */
  optionGlyphs: Glyph[]
}

export type SpatialGenerator = (seed: number, difficulty: Difficulty) => SpatialGenerated

interface Params {
  cells: number
  optionCount: 4 | 5
  /** distratores "quase certos" (uma célula deslocada) entram a partir do nível 4 */
  nearMiss: boolean
}

function paramsFor(difficulty: Difficulty): Params {
  switch (difficulty) {
    case 1:
      return { cells: 3, optionCount: 4, nearMiss: false }
    case 2:
      return { cells: 4, optionCount: 4, nearMiss: false }
    case 3:
      return { cells: 4, optionCount: 5, nearMiss: false }
    case 4:
      return { cells: 5, optionCount: 5, nearMiss: true }
    case 5:
      return { cells: 6, optionCount: 5, nearMiss: true }
  }
}

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

  let n = 0
  const nextDistractor = () =>
    p.nearMiss && ++n % 3 === 0
      ? perturb(rng, correct)
      : rotate(espelho, rng.int(0, ANGULAR_STEPS - 1))

  const { options, answerId, optionGlyphs } = buildOptions(
    rng,
    correct,
    satisfiesRule,
    nextDistractor,
    p.optionCount,
  )

  return {
    subtipo: 'rotacao',
    stem: 'Qual das alternativas é a mesma figura acima, apenas girada?',
    stemSpatial: glyphToSpec(base),
    options,
    answerId,
    explanation:
      `A figura correta é a original girada ${giro * 30}°. As demais são a imagem ` +
      `espelhada: por mais que você gire uma delas no papel, ela nunca se sobrepõe ` +
      `à figura do enunciado. O atalho é fixar um vértice de referência (o ponto ` +
      `preenchido) e conferir se a ordem dos outros vértices ao redor dele se mantém — ` +
      `girar preserva essa ordem, espelhar inverte.`,
    satisfiesRule,
    optionGlyphs,
  }
}

export const gerarReflexao: SpatialGenerator = (seed, difficulty) => {
  const rng = mulberry32(seed)
  const p = paramsFor(difficulty)
  const base = drawUsableGlyph(rng, p.cells)

  const espelho = reflect(base)
  const correct = rotate(espelho, rng.int(0, ANGULAR_STEPS - 1))
  const satisfiesRule = (g: Glyph) => sameUpToRotation(g, espelho)

  let n = 0
  const nextDistractor = () =>
    p.nearMiss && ++n % 3 === 0
      ? perturb(rng, correct)
      : rotate(base, rng.int(0, ANGULAR_STEPS - 1))

  const { options, answerId, optionGlyphs } = buildOptions(
    rng,
    correct,
    satisfiesRule,
    nextDistractor,
    p.optionCount,
  )

  return {
    subtipo: 'reflexao',
    stem: 'Qual das alternativas é a imagem espelhada da figura acima?',
    stemSpatial: glyphToSpec(base),
    options,
    answerId,
    explanation:
      `A alternativa correta é o espelho da figura do enunciado (podendo estar ` +
      `girada). As outras são apenas rotações da figura original. Teste rápido: ` +
      `percorra os vértices a partir do ponto preenchido. Se no enunciado a ordem ` +
      `é horária e na alternativa é anti-horária, é espelho.`,
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
    stem: `${p.optionCount - 1} das figuras abaixo são a mesma, apenas giradas. Qual delas não pertence ao grupo?`,
    options,
    answerId,
    explanation:
      `Todas as figuras do grupo são a mesma, em rotações diferentes — exceto uma, ` +
      `que é a imagem espelhada. Rotação nunca troca a "mão" da figura; espelho sim. ` +
      `Em vez de comparar as figuras duas a duas, escolha um detalhe assimétrico e ` +
      `veja em qual alternativa ele aparece do lado oposto.`,
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

  let n = 0
  const nextDistractor = () => {
    n++
    if (p.nearMiss && n % 4 === 0) return rotate(reflect(base), 4 * passo)
    return rotate(base, rng.int(0, ANGULAR_STEPS - 1))
  }

  const { options, answerId, optionGlyphs } = buildOptions(
    rng,
    correct,
    satisfiesRule,
    nextDistractor,
    p.optionCount,
  )

  return {
    subtipo: 'serie_formas',
    stem: 'Qual figura completa a sequência?',
    stemSpatial: sequenceToSpec([...mostradas, null]),
    options,
    answerId,
    explanation:
      `A cada passo a figura gira ${passo * 30}° no sentido horário. Da quarta para ` +
      `a quinta posição o giro acumulado chega a ${((4 * passo * 30) % 360)}° em ` +
      `relação à primeira. Não tente enxergar a figura inteira girando: acompanhe ` +
      `um único vértice e conte de quantos passos ele anda a cada quadro.`,
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

  let n = 0
  const nextDistractor = () => {
    n++
    if (p.nearMiss && n % 4 === 0) return rotate(reflect(base), 8 * passo)
    return rotate(base, rng.int(0, ANGULAR_STEPS - 1))
  }

  const { options, answerId, optionGlyphs } = buildOptions(
    rng,
    correct,
    satisfiesRule,
    nextDistractor,
    p.optionCount,
  )

  return {
    subtipo: 'matriz',
    stem: 'Qual figura completa a matriz?',
    stemSpatial: matrixToSpec(grade),
    options,
    answerId,
    explanation:
      `A matriz é lida da esquerda para a direita, linha a linha: cada casa gira ` +
      `${passo * 30}° em relação à anterior. A casa que falta é a nona, ou seja, ` +
      `${passo * 8} passos depois da primeira. Confira pela coluna também — se o ` +
      `padrão fecha nos dois sentidos, você achou a regra certa.`,
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

/** Sorteia uma figura quiral e sem simetria rotacional. */
function drawUsableGlyph(rng: Rng, cells: number): Glyph {
  for (let tentativa = 0; tentativa < 500; tentativa++) {
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
    if (isUsable(glyph)) return glyph
  }
  throw new Error(`não consegui sortear figura utilizável com ${cells} células`)
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

/** Desloca uma célula — vira um distrator "quase certo" nos níveis altos. */
function perturb(rng: Rng, glyph: Glyph): Glyph {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const idx = rng.int(0, glyph.length - 1)
    const cell = glyph[idx] as Cell
    const novoR = rng.int(MIN_RADIUS, MAX_RADIUS)
    if (novoR === cell.r) continue
    const next = glyph.map((c, i) => (i === idx ? { a: c.a, r: novoR } : c))
    if (new Set(next.map((c) => `${c.a}:${c.r}`)).size === next.length) return next
  }
  return glyph // rejeitado adiante pela checagem de duplicata
}
