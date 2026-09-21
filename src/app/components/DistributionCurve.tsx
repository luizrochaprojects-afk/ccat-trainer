import { CCAT_NORMS, EXAM_QUESTION_COUNT } from '../../core/taxonomy'
import { useLocale } from '../LocaleContext'

/**
 * A distribuição da CCAT com a sua posição marcada.
 *
 * Não é enfeite: é a única coisa que torna "percentil 62" compreensível. O
 * número sozinho é abstrato; ver que a sua marca está à direita da média, e
 * quanto da área fica atrás dela, explica o percentil sem uma linha de texto.
 *
 * Numa simulação interrompida a marca vira uma FAIXA. Um traço fino ali
 * afirmaria uma precisão que 15 questões não sustentam — a largura da faixa é
 * a incerteza, e mostrá-la é parte de dizer a verdade.
 */
export function DistributionCurve({
  raw,
  percentile,
  faixa,
  rotulo,
}: {
  raw: number
  percentile: number
  /** faixa de incerteza, em acertos brutos */
  faixa?: { low: number; high: number }
  rotulo?: string
}) {
  const { t } = useLocale()
  const w = 600
  const h = 150
  const base = h - 26
  const { mean, sd } = CCAT_NORMS

  const x = (score: number) => (score / EXAM_QUESTION_COUNT) * w
  const densidade = (score: number) => Math.exp(-0.5 * ((score - mean) / sd) ** 2)
  const y = (score: number) => base - densidade(score) * (base - 14)

  const passos = Array.from({ length: EXAM_QUESTION_COUNT * 2 + 1 }, (_, i) => i / 2)
  const curva = passos.map((s) => `${x(s).toFixed(1)},${y(s).toFixed(1)}`).join(' ')

  const preso = (v: number) => Math.max(0, Math.min(EXAM_QUESTION_COUNT, v))
  const marcaX = x(preso(raw))
  const ancora = marcaX < 52 ? 'start' : marcaX > w - 52 ? 'end' : 'middle'
  const texto = rotulo ?? `${t('chart.you')} · ${raw}`

  const areaAte = passos
    .filter((s) => s <= raw)
    .map((s) => `${x(s).toFixed(1)},${y(s).toFixed(1)}`)
    .join(' ')

  const faixaPassos = faixa
    ? passos.filter((s) => s >= preso(faixa.low) && s <= preso(faixa.high))
    : []

  return (
    <svg
      className="grafico"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={
        faixa
          ? t('chart.alt.range', { low: faixa.low, high: faixa.high, mean })
          : t('chart.alt.point', { raw, percentile, mean })
      }
    >
      {/* área acumulada até o seu score: é literalmente o percentil */}
      {!faixa && raw > 0 && (
        <polygon
          points={`0,${base} ${areaAte} ${marcaX.toFixed(1)},${base}`}
          fill="#0d0d0c"
          opacity="0.09"
        />
      )}

      {/* faixa de incerteza da projeção */}
      {faixa && faixaPassos.length > 0 && (
        <polygon
          points={`${x(preso(faixa.low)).toFixed(1)},${base} ${faixaPassos
            .map((s) => `${x(s).toFixed(1)},${y(s).toFixed(1)}`)
            .join(' ')} ${x(preso(faixa.high)).toFixed(1)},${base}`}
          fill="#0d0d0c"
          opacity="0.14"
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
        {t('chart.mean')} {mean}
      </text>

      {/* limites da faixa */}
      {faixa &&
        [faixa.low, faixa.high].map((v) => (
          <line
            key={v}
            x1={x(preso(v))}
            y1={y(preso(v))}
            x2={x(preso(v))}
            y2={base}
            stroke="#0d0d0c"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        ))}

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
        {texto}
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
