import type { SpatialSpec } from '../schema'
import { LADO } from './figuras/contrato'

/**
 * Empilha figuras de uma família numa sequência ou numa matriz 3×3.
 *
 * Agnóstico de família de propósito: recebe `SpatialSpec` já renderizados e só
 * os posiciona. É o que permite a mesma matriz 3×3 servir arcos, ponteiros ou
 * formas aninhadas sem uma linha de código por combinação.
 */

export const CAIXA = LADO
const VAO = 14
const CINZA_MOLDURA = '#c9c9c9'
const TINTA = '#111111'

/** Desloca um spec inteiro, sem tocar nas coordenadas de cada shape. */
function posicionar(spec: SpatialSpec, ox: number, oy: number): SpatialSpec['shapes'] {
  return spec.shapes.map((s) => ({ ...s, dx: (s.dx ?? 0) + ox, dy: (s.dy ?? 0) + oy }))
}

/** Uma linha de figuras; `null` vira a célula com "?". */
export function sequenciaParaSpec(celulas: readonly (SpatialSpec | null)[]): SpatialSpec {
  const width = celulas.length * CAIXA + (celulas.length - 1) * VAO
  const shapes: SpatialSpec['shapes'] = []

  celulas.forEach((celula, i) => {
    const ox = i * (CAIXA + VAO)
    shapes.push(...moldura(ox, 0))
    shapes.push(...(celula ? posicionar(celula, ox, 0) : interrogacao(ox, 0)))
  })

  return { width, height: CAIXA, shapes }
}

/** Matriz 3×3; `null` marca a célula que falta. */
export function matrizParaSpec(celulas: readonly (SpatialSpec | null)[]): SpatialSpec {
  if (celulas.length !== 9) throw new Error('matrizParaSpec espera 9 células')
  const lado = 3 * CAIXA + 2 * VAO
  const shapes: SpatialSpec['shapes'] = []

  celulas.forEach((celula, i) => {
    const ox = (i % 3) * (CAIXA + VAO)
    const oy = Math.floor(i / 3) * (CAIXA + VAO)
    shapes.push(...moldura(ox, oy))
    shapes.push(...(celula ? posicionar(celula, ox, oy) : interrogacao(ox, oy)))
  })

  return { width: lado, height: lado, shapes }
}

function moldura(ox: number, oy: number): SpatialSpec['shapes'] {
  return [
    {
      kind: 'rect',
      x: ox + 1,
      y: oy + 1,
      w: CAIXA - 2,
      h: CAIXA - 2,
      fill: 'none',
      stroke: CINZA_MOLDURA,
      strokeWidth: 1.5,
    },
  ]
}

function interrogacao(ox: number, oy: number): SpatialSpec['shapes'] {
  const cx = ox + CAIXA / 2
  const cy = oy + CAIXA / 2
  return [
    {
      kind: 'path',
      d: `M ${cx - 12} ${cy - 14} q 12 -16 24 0 q 0 12 -12 16 v 8 M ${cx + 0.5} ${cy + 22} v 3`,
      fill: 'none',
      stroke: TINTA,
      strokeWidth: 5,
    },
  ]
}
