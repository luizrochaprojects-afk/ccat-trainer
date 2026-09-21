import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CCAT_NORMS, TIPOS, TIPO_LABEL, type Tipo } from '../../core/taxonomy'
import { listSessions, type StoredSession } from '../../data/db'
import { formatDate, formatPercent, formatPercentile, formatSeconds } from '../format'

/**
 * Evolução ao longo das sessões (PRD §4.19, §4.20).
 *
 * O benchmark é sempre a norma da CCAT, nunca outros usuários — comparar-se com
 * estranhos não informa nada sobre estar ou não pronto para a prova.
 */
export function ProgressScreen() {
  const [sessoes, setSessoes] = useState<StoredSession[] | null>(null)

  useEffect(() => {
    void listSessions(200).then(setSessoes)
  }, [])

  const simulacoes = useMemo(
    () => (sessoes ?? []).filter((s) => s.mode === 'exam').sort((a, b) => a.finishedAt - b.finishedAt),
    [sessoes],
  )

  const porTipo = useMemo(() => agregarPorTipo(sessoes ?? []), [sessoes])

  if (!sessoes) return <p className="legenda">Carregando histórico…</p>

  if (sessoes.length === 0) {
    return (
      <>
        <h1>Evolução</h1>
        <div className="vazio">
          <p>Nenhuma sessão registrada ainda.</p>
          <div className="btn-linha" style={{ justifyContent: 'center' }}>
            <Link className="btn" to="/">
              Fazer a primeira simulação
            </Link>
          </div>
        </div>
      </>
    )
  }

  const ultima = simulacoes.at(-1)
  const primeira = simulacoes[0]
  const delta =
    ultima && primeira && simulacoes.length > 1 ? ultima.score.raw - primeira.score.raw : null

  return (
    <>
      <h1>Evolução</h1>
      <p className="lead">
        {simulacoes.length === 0
          ? 'Você ainda não fez uma simulação completa — só ela produz percentil.'
          : `${simulacoes.length} ${simulacoes.length === 1 ? 'simulação' : 'simulações'} e ${
              sessoes.length - simulacoes.length
            } treinos registrados.`}
      </p>

      {simulacoes.length > 0 && (
        <>
          <div className="placar">
            <div className="stat">
              <span className="valor">{ultima!.score.raw}</span>
              <span className="rotulo">Último score</span>
              <span className="nota">média da CCAT: {CCAT_NORMS.mean}</span>
            </div>
            <div className="stat">
              <span className="valor">{formatPercentile(ultima!.score.percentile)}</span>
              <span className="rotulo">Percentil estimado</span>
            </div>
            <div className="stat">
              <span className="valor">
                {delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta}`}
              </span>
              <span className="rotulo">Desde a primeira</span>
              <span className="nota">em acertos</span>
            </div>
          </div>

          <h2>Score por simulação</h2>
          <Sparkline
            valores={simulacoes.map((s) => s.score.raw)}
            referencia={CCAT_NORMS.mean}
            maximo={50}
          />
          <p className="legenda">
            A linha tracejada é a média oficial da CCAT ({CCAT_NORMS.mean} acertos). Percentis são
            estimados por aproximação normal — veja a ressalva na tela de resultado.
          </p>

          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th className="n">Acertos</th>
                <th className="n">Alcançadas</th>
                <th className="n">Percentil</th>
                <th className="n">Por questão</th>
              </tr>
            </thead>
            <tbody>
              {[...simulacoes].reverse().map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.finishedAt)}</td>
                  <td className="n">{s.score.raw}</td>
                  <td className="n">
                    {s.score.reached}/{s.score.total}
                  </td>
                  <td className="n">{formatPercentile(s.score.percentile)}</td>
                  <td className="n">{formatSeconds(s.score.avgMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Acurácia por tipo</h2>
      <p className="legenda" style={{ marginBottom: 12 }}>
        Acumulado de todas as sessões — simulações e treinos.
      </p>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th className="n">Questões</th>
            <th className="n">Acurácia</th>
            <th className="n">Tempo</th>
            <th style={{ width: 90 }} />
          </tr>
        </thead>
        <tbody>
          {porTipo.map((t) => (
            <tr key={t.tipo}>
              <td>
                <Link to={`/teoria/${t.tipo}`}>{TIPO_LABEL[t.tipo]}</Link>
              </td>
              <td className="n">{t.reached}</td>
              <td className="n">{formatPercent(t.accuracy)}</td>
              <td className="n">{formatSeconds(t.avgMs)}</td>
              <td>
                <span className="medidor">
                  <i style={{ width: `${(t.accuracy ?? 0) * 100}%` }} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {porTipo.length > 0 && <PontoFraco porTipo={porTipo} />}
    </>
  )
}

// --- agregação ---------------------------------------------------------------

interface AgregadoTipo {
  tipo: Tipo
  reached: number
  correct: number
  accuracy: number | null
  avgMs: number | null
}

function agregarPorTipo(sessoes: StoredSession[]): AgregadoTipo[] {
  const acc = new Map<Tipo, { reached: number; correct: number; somaMs: number }>()

  for (const s of sessoes) {
    for (const b of s.score.byTipo) {
      const atual = acc.get(b.tipo) ?? { reached: 0, correct: 0, somaMs: 0 }
      atual.reached += b.reached
      atual.correct += b.correct
      atual.somaMs += (b.avgMs ?? 0) * b.reached
      acc.set(b.tipo, atual)
    }
  }

  return TIPOS.filter((t) => acc.has(t)).map((tipo) => {
    const a = acc.get(tipo)!
    return {
      tipo,
      reached: a.reached,
      correct: a.correct,
      accuracy: a.reached > 0 ? a.correct / a.reached : null,
      avgMs: a.reached > 0 ? a.somaMs / a.reached : null,
    }
  })
}

/** Mesma regra da tela de resultado: só aponta se houver diferença real. */
const MINIMO_PARA_DIAGNOSTICO = 8

function PontoFraco({ porTipo }: { porTipo: AgregadoTipo[] }) {
  const elegiveis = porTipo.filter((t) => t.reached >= MINIMO_PARA_DIAGNOSTICO)
  if (elegiveis.length < 2) {
    return (
      <p className="rodape-teoria">
        Faça mais algumas sessões para o diagnóstico por tipo ficar confiável — com poucas
        questões, uma acurácia baixa é ruído.
      </p>
    )
  }

  const pior = elegiveis.reduce((p, t) => ((t.accuracy ?? 1) < (p.accuracy ?? 1) ? t : p))
  const melhor = elegiveis.reduce((m, t) => ((t.accuracy ?? 0) > (m.accuracy ?? 0) ? t : m))
  if (pior.accuracy === melhor.accuracy) {
    return <p className="rodape-teoria">Desempenho parelho entre os tipos.</p>
  }

  return (
    <p className="rodape-teoria">
      Seu tipo mais fraco é <strong>{TIPO_LABEL[pior.tipo]}</strong> (
      {formatPercent(pior.accuracy)} em {pior.reached} questões).{' '}
      <Link to={`/treinar?tipo=${pior.tipo}`}>Treinar só esse tipo</Link> ou{' '}
      <Link to={`/teoria/${pior.tipo}`}>rever a teoria</Link>.
    </p>
  )
}

// --- gráfico -----------------------------------------------------------------

function Sparkline({
  valores,
  referencia,
  maximo,
}: {
  valores: number[]
  referencia: number
  maximo: number
}) {
  if (valores.length === 0) return null

  const w = 100
  const h = 34
  const pad = 2
  const x = (i: number) =>
    valores.length === 1 ? w / 2 : pad + (i / (valores.length - 1)) * (w - pad * 2)
  const y = (v: number) => h - pad - (v / maximo) * (h - pad * 2)

  const linha = valores.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(' ')

  // `vectorEffect="non-scaling-stroke"` mede a espessura em pixels de tela, não
  // em unidades do viewBox: com 0,4 a linha da média da CCAT sumia no
  // antialiasing e o gráfico ficava sem referência nenhuma.

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Score das simulações: ${valores.join(', ')}`}
    >
      <line
        x1={0}
        x2={w}
        y1={y(referencia)}
        y2={y(referencia)}
        stroke="#8a8a8a"
        strokeWidth={1}
        strokeDasharray="4 4"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={linha}
        fill="none"
        stroke="#111111"
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      {valores.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={0.9} fill="#111111" />
      ))}
    </svg>
  )
}
