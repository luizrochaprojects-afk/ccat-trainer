import { CCAT_NORMS, EXAM_QUESTION_COUNT } from '../../core/taxonomy'

/**
 * A distribuição da CCAT com a sua posição marcada.
 *
 * Não é enfeite: é a única coisa que torna "percentil 62" compreensível. O
 * número sozinho é abstrato; ver que a sua marca está à direita da média, e
 * quanto da área fica atrás dela, explica o percentil sem uma linha de texto.
 *
 * Também torna visível por que os extremos são imprecisos — a cauda é rasa, e
 * lá alguns acertos deslocam muito o percentil.
 */
export function DistributionCurve({ raw, percentile }: { raw: number; percentile: number }) {
  const w = 600
  const h = 150
  const base = h - 26
  const { mean, sd } = CCAT_NORMS

  const x = (score: number) => (score / EXAM_QUESTION_COUNT) * w
  const densidade = (score: number) => Math.exp(-0.5 * ((score - mean) / sd) ** 2)
  const y = (score: number) => base - densidade(score) * (base - 14)

  const passos = Array.from({ length: EXAM_QUESTION_COUNT * 2 + 1 }, (_, i) => i / 2)
  const curva = passos.map((s) => `${x(s).toFixed(1)},${y(s).toFixed(1)}`).join(' ')
  const areaAte = passos
    .filter((s) => s <= raw)
    .map((s) => `${x(s).toFixed(1)},${y(s).toFixed(1)}`)
    .join(' ')

  const marcaX = x(Math.max(0, Math.min(EXAM_QUESTION_COUNT, raw)))
  // Mantém o rótulo dentro do quadro quando o score está nas pontas.
  const ancora = marcaX < 52 ? 'start' : marcaX > w - 52 ? 'end' : 'middle'

  return (
    <svg
      className="grafico"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Sua pontuação de ${raw} acertos na distribuição da CCAT, percentil estimado ${percentile}. A média é ${mean} acertos.`}
    >
      {/* área acumulada até o seu score: é literalmente o percentil */}
      {raw > 0 && (
        <polygon
          points={`0,${base} ${areaAte} ${marcaX.toFixed(1)},${base}`}
          fill="#0d0d0c"
          opacity="0.09"
        />
      )}

      <polyline points={curva} fill="none" stroke="#b8b2a7" strokeWidth="1.5" />
      <line x1="0" y1={base} x2={w} y2={base} stroke="#0d0d0c" strokeWidth="1.5" />

      {/* média oficial */}
      <line
        x1={x(mean)}
        y1={y(mean) - 4}
        x2={x(mean)}
        y2={base}
        stroke="#6e6960"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <text
        x={x(mean)}
        y={y(mean) - 9}
        textAnchor="middle"
        fontSize="10"
        fill="#6e6960"
        fontFamily="'IBM Plex Mono', monospace"
        letterSpacing="0.06em"
      >
        MÉDIA {mean}
      </text>

      {/* sua marca */}
      <line x1={marcaX} y1={10} x2={marcaX} y2={base} stroke="#0d0d0c" strokeWidth="2" />
      <circle cx={marcaX} cy={base} r="4" fill="#0d0d0c" />
      <text
        x={marcaX}
        y={7}
        textAnchor={ancora}
        fontSize="11"
        fill="#0d0d0c"
        fontWeight="600"
        fontFamily="'IBM Plex Mono', monospace"
        letterSpacing="0.02em"
      >
        VOCÊ · {raw}
      </text>

      {[0, 10, 20, 30, 40, 50].map((s) => (
        <text
          key={s}
          x={x(s)}
          y={h - 8}
          textAnchor={s === 0 ? 'start' : s === 50 ? 'end' : 'middle'}
          fontSize="10"
          fill="#6e6960"
          fontFamily="'IBM Plex Mono', monospace"
        >
          {s}
        </text>
      ))}
    </svg>
  )
}
