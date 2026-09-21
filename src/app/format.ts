import type { Locale } from '../core/i18n'

/** Formatação compartilhada pelas telas. */

/** mm:ss — o formato do cronômetro da prova. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const min = Math.floor(total / 60)
  const seg = total % 60
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`
}

/** Segundos com uma casa — para tempo médio por questão. */
export function formatSeconds(ms: number | null): string {
  if (ms === null) return '—'
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatPercent(fracao: number | null): string {
  if (fracao === null) return '—'
  return `${Math.round(fracao * 100)}%`
}

export function formatDate(epoch: number, locale: Locale): string {
  return new Date(epoch).toLocaleDateString(locale === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Ordinal de percentil em português ("percentil 84").
 * A palavra "estimado" não é enfeite: a conversão usa aproximação normal sobre
 * a norma oficial, não a tabela da Criteria, que não é pública.
 */
export function formatPercentile(p: number | null): string {
  if (p === null) return '—'
  return `p${p}`
}
