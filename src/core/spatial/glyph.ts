/**
 * Modelo de figura espacial em rede polar inteira.
 *
 * Toda figura é um conjunto de células (ângulo, raio) sobre uma rede de 12
 * passos angulares. A consequência importante: rotação é `(a + k) mod 12` e
 * reflexão é `(-a) mod 12` — **aritmética inteira**. Comparar duas figuras "a
 * menos de rotação" é comparação exata de string, sem tolerância de ponto
 * flutuante.
 *
 * É isso que permite provar o gabarito por construção (PRD §4.10): o gate
 * re-executa o gerador com a mesma seed e confere que exatamente uma
 * alternativa satisfaz a regra.
 */

export const ANGULAR_STEPS = 12
export const MIN_RADIUS = 1
export const MAX_RADIUS = 3

export interface Cell {
  /** índice angular 0..11 (passos de 30°) */
  readonly a: number
  /** índice de raio 1..3 */
  readonly r: number
}

export type Glyph = readonly Cell[]

/** Chave canônica de uma figura numa orientação específica. */
export function key(glyph: Glyph): string {
  return [...glyph]
    .sort((x, y) => x.a - y.a || x.r - y.r)
    .map((c) => `${c.a}:${c.r}`)
    .join('|')
}

export function rotate(glyph: Glyph, k: number): Glyph {
  const shift = ((k % ANGULAR_STEPS) + ANGULAR_STEPS) % ANGULAR_STEPS
  return glyph.map((c) => ({ a: (c.a + shift) % ANGULAR_STEPS, r: c.r }))
}

/** Espelhamento em torno do eixo vertical (ângulo 0). */
export function reflect(glyph: Glyph): Glyph {
  return glyph.map((c) => ({ a: (ANGULAR_STEPS - c.a) % ANGULAR_STEPS, r: c.r }))
}

/** Menor chave entre as 12 rotações — invariante de rotação. */
export function rotationCanonical(glyph: Glyph): string {
  let best: string | undefined
  for (let k = 0; k < ANGULAR_STEPS; k++) {
    const candidate = key(rotate(glyph, k))
    if (best === undefined || candidate < best) best = candidate
  }
  return best as string
}

/** Duas figuras são a mesma a menos de rotação? */
export function sameUpToRotation(a: Glyph, b: Glyph): boolean {
  return rotationCanonical(a) === rotationCanonical(b)
}

/**
 * Quiral = a imagem espelhada NÃO é alcançável por rotação.
 * Só figuras quirais servem: numa figura aquiral, o espelho vira um duplicado
 * da resposta certa e a questão passa a ter duas alternativas corretas.
 */
export function isChiral(glyph: Glyph): boolean {
  return rotationCanonical(glyph) !== rotationCanonical(reflect(glyph))
}

/**
 * Quantas das 12 rotações produzem figuras distintas.
 * Precisa ser 12: com simetria rotacional, girar não muda nada e as
 * alternativas colidem entre si.
 */
export function rotationOrbitSize(glyph: Glyph): number {
  const vistos = new Set<string>()
  for (let k = 0; k < ANGULAR_STEPS; k++) vistos.add(key(rotate(glyph, k)))
  return vistos.size
}

/** Uma figura só é utilizável se for quiral e sem simetria rotacional. */
export function isUsable(glyph: Glyph): boolean {
  return glyph.length >= 3 && isChiral(glyph) && rotationOrbitSize(glyph) === ANGULAR_STEPS
}

// --- Geometria de renderização ----------------------------------------------

export interface Point {
  x: number
  y: number
}

export interface GlyphPoints {
  /** vértices em ordem angular, para fechar um polígono que não se cruza */
  points: Point[]
  /** posição, dentro de `points`, do vértice de referência (célula 0 da figura) */
  markerIndex: number
}

/**
 * Converte células em pontos cartesianos dentro de uma caixa quadrada de lado
 * `box`, centrada em (cx, cy). Ângulo 0 aponta para cima.
 *
 * O polígono é desenhado em ordem angular, mas o vértice de referência é
 * SEMPRE a célula 0 da figura — que `rotate` e `reflect` preservam, porque
 * ambos mapeiam o array mantendo a ordem. Sem isso, a marca pularia de vértice
 * a cada rotação e duas figuras que são a mesma apareceriam marcadas em pontos
 * diferentes, invalidando a dica de "fixe um vértice e acompanhe".
 */
export function toPoints(glyph: Glyph, box: number, cx: number, cy: number): GlyphPoints {
  const unit = box / 2 / (MAX_RADIUS + 0.35)

  const indexadas = glyph
    .map((c, origem) => ({ c, origem }))
    .sort((p, q) => p.c.a - q.c.a || p.c.r - q.c.r || p.origem - q.origem)

  const points = indexadas.map(({ c }) => {
    const theta = (c.a / ANGULAR_STEPS) * Math.PI * 2
    return {
      x: round(cx + c.r * unit * Math.sin(theta)),
      y: round(cy - c.r * unit * Math.cos(theta)),
    }
  })

  return { points, markerIndex: indexadas.findIndex((e) => e.origem === 0) }
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}
