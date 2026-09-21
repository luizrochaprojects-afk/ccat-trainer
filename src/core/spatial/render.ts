import type { SpatialSpec } from '../schema'
import { type Glyph, toPoints } from './glyph'

/**
 * Tradução de figura → SpatialSpec (a descrição que o componente React vira SVG).
 *
 * Tema claro, alto contraste (PRD §6): traço preto sobre fundo branco, sem cor
 * carregando informação — quem é daltônico enxerga a mesma questão.
 */

export const FIGURE_BOX = 100
const STROKE = '#111111'
const FILL = '#111111'

/** Uma figura sozinha, numa caixa quadrada. */
export function glyphToSpec(glyph: Glyph): SpatialSpec {
  return {
    width: FIGURE_BOX,
    height: FIGURE_BOX,
    shapes: figureShapes(glyph, 0, 0, FIGURE_BOX),
  }
}

/** Várias figuras lado a lado, com "?" opcional no lugar de uma célula vazia. */
export function sequenceToSpec(glyphs: readonly (Glyph | null)[]): SpatialSpec {
  const gap = 14
  const width = glyphs.length * FIGURE_BOX + (glyphs.length - 1) * gap
  const shapes: SpatialSpec['shapes'] = []

  glyphs.forEach((glyph, i) => {
    const ox = i * (FIGURE_BOX + gap)
    shapes.push(...cellFrame(ox, 0))
    if (glyph) shapes.push(...figureShapes(glyph, ox, 0, FIGURE_BOX))
    else shapes.push(...questionMark(ox, 0))
  })

  return { width, height: FIGURE_BOX, shapes }
}

/** Matriz 3×3; `null` marca a célula que falta. */
export function matrixToSpec(cells: readonly (Glyph | null)[]): SpatialSpec {
  if (cells.length !== 9) throw new Error('matrixToSpec espera 9 células')
  const gap = 14
  const side = 3 * FIGURE_BOX + 2 * gap
  const shapes: SpatialSpec['shapes'] = []

  cells.forEach((glyph, i) => {
    const ox = (i % 3) * (FIGURE_BOX + gap)
    const oy = Math.floor(i / 3) * (FIGURE_BOX + gap)
    shapes.push(...cellFrame(ox, oy))
    if (glyph) shapes.push(...figureShapes(glyph, ox, oy, FIGURE_BOX))
    else shapes.push(...questionMark(ox, oy))
  })

  return { width: side, height: side, shapes }
}

// --- Primitivas --------------------------------------------------------------

function figureShapes(
  glyph: Glyph,
  ox: number,
  oy: number,
  box: number,
): SpatialSpec['shapes'] {
  const { points, markerIndex } = toPoints(glyph, box * 0.78, ox + box / 2, oy + box / 2)

  return [
    {
      kind: 'polygon',
      points: points.flatMap((p) => [p.x, p.y]),
      fill: 'none',
      stroke: STROKE,
      strokeWidth: 2.5,
    },
    // O vértice preenchido é o mesmo vértice material em todas as orientações
    // da figura — é o ponto de referência que a explicação manda acompanhar.
    ...points.map((p, i) => ({
      kind: 'circle' as const,
      cx: p.x,
      cy: p.y,
      r: i === markerIndex ? 5 : 3,
      fill: i === markerIndex ? FILL : '#ffffff',
      stroke: STROKE,
      strokeWidth: 2,
    })),
  ]
}

function cellFrame(ox: number, oy: number): SpatialSpec['shapes'] {
  return [
    {
      kind: 'rect',
      x: ox + 1,
      y: oy + 1,
      w: FIGURE_BOX - 2,
      h: FIGURE_BOX - 2,
      fill: 'none',
      stroke: '#c9c9c9',
      strokeWidth: 1.5,
    },
  ]
}

function questionMark(ox: number, oy: number): SpatialSpec['shapes'] {
  const cx = ox + FIGURE_BOX / 2
  const cy = oy + FIGURE_BOX / 2
  return [
    {
      kind: 'path',
      d: `M ${cx - 12} ${cy - 14} q 12 -16 24 0 q 0 12 -12 16 v 8 M ${cx + 0.5} ${cy + 22} v 3`,
      fill: 'none',
      stroke: STROKE,
      strokeWidth: 5,
    },
  ]
}
