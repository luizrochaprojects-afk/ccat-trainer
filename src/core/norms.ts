import { CCAT_NORMS, EXAM_QUESTION_COUNT } from './taxonomy'

/**
 * Conversão de score bruto em percentil contra a norma oficial da CCAT
 * (PRD §4.18: média 24,2 · mediana 24 · DP 8,58).
 *
 * IMPORTANTE: isto é uma **aproximação normal**, não a tabela oficial de
 * percentis da Criteria — que não é pública. A distribuição real é levemente
 * assimétrica (média 24,2 vs mediana 24) e truncada em 0 e 50, então nas caudas
 * o número aqui desvia do percentil oficial.
 *
 * Por isso a função vive atrás de `PercentileTable`: no dia em que houver uma
 * tabela de lookup confiável, troca-se a implementação sem mexer em tela nenhuma.
 * A UI deve sempre rotular o resultado como estimativa.
 */

export interface PercentileTable {
  readonly label: string
  /** score bruto (0..50) → percentil 1..99 */
  percentileFor(raw: number): number
}

/** Φ(z) — CDF normal padrão via Abramowitz & Stegun 26.2.17 (erro < 7.5e-8). */
export function standardNormalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2

  const t = 1 / (1 + 0.3275911 * x)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x)

  return 0.5 * (1 + sign * y)
}

export const normalApproxTable: PercentileTable = {
  label: 'aproximação normal (norma oficial CCAT)',
  percentileFor(raw: number): number {
    const clamped = clampRaw(raw)
    const z = (clamped - CCAT_NORMS.mean) / CCAT_NORMS.sd
    const pct = standardNormalCdf(z) * 100
    // Percentil 0 ou 100 não existe numa norma amostral; prende em 1..99.
    return Math.min(99, Math.max(1, Math.round(pct)))
  },
}

/** Tabela ativa. Ponto único de troca quando houver dado oficial. */
export const activeTable: PercentileTable = normalApproxTable

export function rawToPercentile(raw: number): number {
  return activeTable.percentileFor(raw)
}

function clampRaw(raw: number): number {
  if (!Number.isFinite(raw)) throw new Error(`score bruto inválido: ${raw}`)
  return Math.min(EXAM_QUESTION_COUNT, Math.max(0, raw))
}

/** Distância em pontos brutos até um percentil-alvo (ex.: "faltam 6 acertos pro p80"). */
export function rawNeededForPercentile(targetPercentile: number): number {
  for (let raw = 0; raw <= EXAM_QUESTION_COUNT; raw++) {
    if (rawToPercentile(raw) >= targetPercentile) return raw
  }
  return EXAM_QUESTION_COUNT
}

/**
 * Intervalo de confiança de Wilson para uma proporção.
 *
 * Usado para dizer o quanto a acurácia observada em poucas questões pode ser
 * confiada. Com 12 acertos em 15, a acurácia pontual é 80% — mas o intervalo
 * real vai de ~55% a ~93%, e projetar a prova inteira a partir do ponto médio
 * esconde exatamente essa incerteza.
 *
 * Wilson e não a aproximação normal: com n pequeno ou p perto de 0 ou 1, a
 * normal produz intervalos que saem de [0,1] e mentem sobre a precisão.
 */
export function wilsonInterval(
  acertos: number,
  total: number,
  z = 1.96,
): { low: number; high: number } {
  if (total <= 0) return { low: 0, high: 1 }

  const p = acertos / total
  const z2 = z * z
  const denominador = 1 + z2 / total
  const centro = (p + z2 / (2 * total)) / denominador
  const margem =
    (z / denominador) * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))

  return {
    low: Math.max(0, centro - margem),
    high: Math.min(1, centro + margem),
  }
}
