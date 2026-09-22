import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TIPOS, TIPO_LABEL, type Tipo } from '../../core/taxonomy'
import { armazenamentoIndisponivel, listSessions, type StoredSession } from '../../data/db'
import { Esqueleto } from '../components/Esqueleto'
import { ScoreChart } from '../components/ScoreChart'
import { useLocale } from '../LocaleContext'
import { formatDate, formatPercent, formatPercentile, formatSeconds } from '../format'

/**
 * Evolução ao longo das sessões (PRD §4.19, §4.20).
 *
 * O benchmark é sempre a norma da CCAT, nunca outros usuários — comparar-se com
 * estranhos não informa nada sobre estar ou não pronto para a prova.
 */
export function ProgressScreen() {
  const { t, tx, locale } = useLocale()
  const [sessoes, setSessoes] = useState<StoredSession[] | null>(null)

  useEffect(() => {
    void listSessions(200).then(setSessoes)
  }, [])

  const simulacoes = useMemo(
    () =>
      (sessoes ?? []).filter((s) => s.mode === 'exam').sort((a, b) => a.finishedAt - b.finishedAt),
    [sessoes],
  )

  /**
   * Só simulações completas entram na tendência. Uma prova encerrada no meio
   * não tem score comparável à norma — plotá-la junto criaria uma queda que
   * não corresponde a piora nenhuma.
   *
   * `?? true` cobre sessões gravadas antes deste campo existir.
   */
  const completas = useMemo(
    () => simulacoes.filter((s) => s.score.completeRun ?? true),
    [simulacoes],
  )
  const parciais = simulacoes.length - completas.length

  const porTipo = useMemo(() => agregarPorTipo(sessoes ?? []), [sessoes])

  if (!sessoes) {
    return (
      <>
        <h1>{t('progress.title')}</h1>
        <Esqueleto variante="manchete" />
        <Esqueleto variante="tabela" />
      </>
    )
  }

  if (sessoes.length === 0) {
    return (
      <>
        <h1>{t('progress.title')}</h1>
        {/* Vazio e indisponível são estados diferentes que pareciam o mesmo:
            com IndexedDB bloqueado, `listSessions` devolve [] e esta tela
            dizia "nenhuma prova ainda" para quem tinha acabado de fazer cinco. */}
        {armazenamentoIndisponivel() && (
          <div className="nota-bloco">
            <span className="micro">{t('storage.blocked.label')}</span>
            <p>{t('storage.blocked.body')}</p>
          </div>
        )}
        <div className="vazio">
          <p>{t('progress.empty')}</p>
          <div className="btn-linha">
            <Link className="btn" to="/">
              {t('progress.empty.action')}
            </Link>
          </div>
        </div>
      </>
    )
  }

  const ultima = completas.at(-1)
  const primeira = completas[0]
  const delta =
    ultima && primeira && completas.length > 1 ? ultima.score.raw - primeira.score.raw : null
  const treinos = sessoes.length - simulacoes.length

  return (
    <>
      <h1>{t('progress.title')}</h1>
      <p className="lead">
        {t('progress.lead', {
          exams: t(
            simulacoes.length === 1 ? 'progress.lead.exams.one' : 'progress.lead.exams.other',
            { count: simulacoes.length },
          ),
          drills: t(treinos === 1 ? 'progress.lead.drills.one' : 'progress.lead.drills.other', {
            count: treinos,
          }),
        })}
      </p>

      {completas.length > 0 && (
        <>
          <div className="manchete">
            <span className="score">{ultima!.score.raw}</span>
            <p className="frase">
              {t('progress.headline', {
                percentile: formatPercentile(ultima!.score.percentile),
              })}
              {delta !== null &&
                t(delta >= 0 ? 'progress.headline.delta.up' : 'progress.headline.delta.down', {
                  count: Math.abs(delta),
                })}
            </p>
          </div>

          <h2>{t('progress.chart')}</h2>
          <ScoreChart valores={completas.map((s) => s.score.raw)} />
          <p className="legenda">
            {t('progress.chart.legend')}
            {parciais > 0 && ` ${t('progress.partial.note', { count: parciais })}`}
          </p>

          <table>
            <thead>
              <tr>
                <th>{t('progress.table.when')}</th>
                <th className="n">{t('progress.table.correct')}</th>
                <th className="n">{t('progress.table.reached')}</th>
                <th className="n">{t('progress.table.percentile')}</th>
                <th className="n">{t('progress.table.perQuestion')}</th>
              </tr>
            </thead>
            <tbody>
              {[...simulacoes].reverse().map((s) => (
                <tr key={s.id}>
                  <td>
                    {formatDate(s.finishedAt, locale)}
                    {(s.score.completeRun ?? true) ? null : (
                      <span className="marca-parcial"> {t('progress.partial')}</span>
                    )}
                  </td>
                  <td className="n">{s.score.raw}</td>
                  <td className="n">
                    {s.score.reached}/{s.score.total}
                  </td>
                  <td className="n">
                    {(s.score.completeRun ?? true) ? formatPercentile(s.score.percentile) : '—'}
                  </td>
                  <td className="n">{formatSeconds(s.score.avgMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>{t('progress.byType')}</h2>
      <p className="legenda" style={{ marginBottom: 12 }}>
        {t('progress.byType.legend')}
      </p>
      <table>
        <thead>
          <tr>
            <th>{t('result.table.type')}</th>
            <th className="n">{t('progress.table.questions')}</th>
            <th className="n">{t('result.table.accuracy')}</th>
            <th className="n">{t('result.table.time')}</th>
            <th style={{ width: 72 }} aria-label={t('result.table.bar')} />
          </tr>
        </thead>
        <tbody>
          {porTipo.map((item) => (
            <tr key={item.tipo}>
              <td>
                <Link to={`/teoria/${item.tipo}`}>{tx(TIPO_LABEL[item.tipo])}</Link>
              </td>
              <td className="n">{item.reached}</td>
              <td className="n">{formatPercent(item.accuracy)}</td>
              <td className="n">{formatSeconds(item.avgMs)}</td>
              <td>
                <span className="medidor">
                  <i style={{ width: `${(item.accuracy ?? 0) * 100}%` }} />
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
  const { t, tx } = useLocale()
  const elegiveis = porTipo.filter((item) => item.reached >= MINIMO_PARA_DIAGNOSTICO)

  if (elegiveis.length < 2) {
    return <p className="rodape-teoria">{t('progress.weak.notEnough')}</p>
  }

  const pior = elegiveis.reduce((p, item) => ((item.accuracy ?? 1) < (p.accuracy ?? 1) ? item : p))
  const melhor = elegiveis.reduce((m, item) => ((item.accuracy ?? 0) > (m.accuracy ?? 0) ? item : m))
  if (pior.accuracy === melhor.accuracy) {
    return <p className="rodape-teoria">{t('progress.weak.even')}</p>
  }

  return (
    <p className="rodape-teoria">
      {t('progress.weak.body', {
        tipo: tx(TIPO_LABEL[pior.tipo]),
        accuracy: formatPercent(pior.accuracy),
        count: pior.reached,
      })}{' '}
      <Link to={`/treinar?tipo=${pior.tipo}`}>{t('progress.weak.drill')}</Link>
      {' · '}
      <Link to={`/teoria/${pior.tipo}`}>{t('progress.weak.theory')}</Link>.
    </p>
  )
}

// --- gráfico -----------------------------------------------------------------
