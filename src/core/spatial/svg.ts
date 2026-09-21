import type { SpatialSpec } from '../schema'

/**
 * SpatialSpec → markup SVG.
 *
 * Fica no core (sem DOM) porque tanto o componente React quanto os scripts de
 * preview/auditoria precisam do MESMO desenho — se o preview renderizar
 * diferente do app, a auditoria visual não prova nada.
 *
 * Segurança: todos os valores vêm dos geradores (números e enums validados pelo
 * zod), nunca de entrada do usuário. Ainda assim, cada campo é escapado/coerido
 * abaixo em vez de interpolado cru.
 */
export function specToSvgString(spec: SpatialSpec, opts: { label?: string } = {}): string {
  const body = spec.shapes.map(shapeToSvg).join('')
  const label = opts.label ? `<title>${escapeXml(opts.label)}</title>` : ''
  return (
    `<svg viewBox="0 0 ${num(spec.width)} ${num(spec.height)}" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" ` +
    `preserveAspectRatio="xMidYMid meet">${label}${body}</svg>`
  )
}

function shapeToSvg(shape: SpatialSpec['shapes'][number]): string {
  const attrs =
    ` fill="${escapeXml(shape.fill ?? 'none')}"` +
    ` stroke="${escapeXml(shape.stroke ?? '#111111')}"` +
    ` stroke-width="${num(shape.strokeWidth ?? 2)}"` +
    ' stroke-linejoin="round" stroke-linecap="round"' +
    (shape.dx || shape.dy ? ` transform="translate(${num(shape.dx ?? 0)} ${num(shape.dy ?? 0)})"` : '')

  switch (shape.kind) {
    case 'polygon':
      return `<polygon points="${(shape.points ?? []).map(num).join(' ')}"${attrs}/>`
    case 'circle':
      return `<circle cx="${num(shape.cx)}" cy="${num(shape.cy)}" r="${num(shape.r)}"${attrs}/>`
    case 'rect':
      return `<rect x="${num(shape.x)}" y="${num(shape.y)}" width="${num(shape.w)}" height="${num(shape.h)}"${attrs}/>`
    case 'line':
      return `<line x1="${num(shape.x)}" y1="${num(shape.y)}" x2="${num(shape.w)}" y2="${num(shape.h)}"${attrs}/>`
    case 'path':
      return `<path d="${escapeXml(shape.d ?? '')}"${attrs}/>`
  }
}

function num(v: number | undefined): number {
  return Number.isFinite(v) ? (v as number) : 0
}

function escapeXml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
