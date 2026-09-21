import { CCAT_NORMS, EXAM_QUESTION_COUNT } from '../../core/taxonomy'

/**
 * Score por simulação ao longo do tempo.
 *
 * Gráfico de verdade, com eixo rotulado e a média oficial marcada — não uma
 * sparkline decorativa. A pergunta que ele responde é "estou melhorando, e já
 * passei da média?", e sem escala nem referência nenhum traço responde isso.
 */
export function ScoreChart({ valores }: { valores: number[] }) {
  if (valores.length === 0) return null

  const w = 600
  const h = 190
  const padE = 30
  const padD = 8
  const padT = 14
  const base = h - 26

  const maxEscala = Math.max(EXAM_QUESTION_COUNT * 0.6, ...valores)
  const teto = Math.min(EXAM_QUESTION_COUNT, Math.ceil((maxEscala + 4) / 10) * 10)

  const x = (i: number) =>
    valores.length === 1 ? (w - padE - padD) / 2 + padE : padE + (i / (valores.length - 1)) * (w - padE - padD)
  const y = (v: number) => base - (v / teto) * (base - padT)

  const linha = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const marcas = [0, Math.round(teto / 2), teto]

  return (
    <svg
      className="grafico"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Acertos por simulação, da mais antiga à mais recente: ${valores.join(', ')}. Média oficial da CCAT: ${CCAT_NORMS.mean}.`}
    >
      {marcas.map((m) => (
        <g key={m}>
          <line x1={padE} y1={y(m)} x2={w - padD} y2={y(m)} stroke="#ddd9d1" strokeWidth="1" />
          <text
            x={padE - 8}
            y={y(m) + 3.5}
            textAnchor="end"
            fontSize="10"
            fill="#6e6960"
            fontFamily="'IBM Plex Mono', monospace"
          >
            {m}
          </text>
        </g>
      ))}

      {/* média oficial da CCAT: a referência que define "estou pronto?" */}
      <line
        x1={padE}
        y1={y(CCAT_NORMS.mean)}
        x2={w - padD}
        y2={y(CCAT_NORMS.mean)}
        stroke="#6e6960"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <text
        x={w - padD}
        y={y(CCAT_NORMS.mean) - 6}
        textAnchor="end"
        fontSize="10"
        fill="#6e6960"
        fontFamily="'IBM Plex Mono', monospace"
        letterSpacing="0.06em"
      >
        MÉDIA CCAT {CCAT_NORMS.mean}
      </text>

      {valores.length > 1 && (
        <polyline points={linha} fill="none" stroke="#0d0d0c" strokeWidth="2" strokeLinejoin="round" />
      )}

      {valores.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="3.5" fill="#0d0d0c" />
          {(i === valores.length - 1 || valores.length <= 6) && (
            <text
              x={x(i)}
              y={y(v) - 10}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#0d0d0c"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {v}
            </text>
          )}
        </g>
      ))}

      <line x1={padE} y1={base} x2={w - padD} y2={base} stroke="#0d0d0c" strokeWidth="1.5" />
      <text x={padE} y={h - 8} fontSize="10" fill="#6e6960" fontFamily="'IBM Plex Mono', monospace">
        1ª
      </text>
      {valores.length > 1 && (
        <text
          x={w - padD}
          y={h - 8}
          textAnchor="end"
          fontSize="10"
          fill="#6e6960"
          fontFamily="'IBM Plex Mono', monospace"
        >
          {valores.length}ª
        </text>
      )}
    </svg>
  )
}
