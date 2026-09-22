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

/**
 * O marco de tempo em que o relógio está, ou `null` se nenhum foi cruzado.
 *
 * Existe por acessibilidade: `role="timer"` com rótulo mudando quatro vezes por
 * segundo faz alguns leitores de tela falarem sem parar, e um cronômetro que
 * nunca é anunciado é pior ainda. A saída daqui alimenta uma região `aria-live`
 * que só muda de conteúdo ao cruzar um marco.
 *
 * O treino tem 18 segundos de orçamento: marcos de minuto não existiriam nele,
 * então abaixo de um minuto os marcos passam a ser fração do orçamento.
 *
 * Função pura, e é por isso que mora aqui — dá para testá-la sem DOM.
 */
const MARCOS_LONGOS_MS = [300_000, 120_000, 60_000, 30_000, 10_000]

export function marcoDoRelogio(restanteMs: number, orcamentoMs: number): number | null {
  if (orcamentoMs <= 0) return null

  const marcos =
    orcamentoMs > 60_000
      ? MARCOS_LONGOS_MS.filter((m) => m < orcamentoMs)
      : [orcamentoMs * 0.5, orcamentoMs * 0.25]

  // O MENOR marco já cruzado, que é o mais recente na descida. A lista vem
  // decrescente, então basta seguir enquanto o marco já foi ultrapassado —
  // devolver o primeiro que bate daria "5 minutos" pelo resto da prova.
  let atual: number | null = null
  for (const m of marcos) {
    if (restanteMs > m) break
    atual = m
  }
  return atual
}
