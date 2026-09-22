import { Link, useLocation } from 'react-router-dom'
import type { SessionScore } from '../../core/session/score'
import { paceTargetMs } from '../../core/session/score'
import { CCAT_NORMS, EXAM_QUESTION_COUNT, TIPO_LABEL } from '../../core/taxonomy'
import { rawNeededForPercentile } from '../../core/norms'
import { DistributionCurve } from '../components/DistributionCurve'
import { useLocale } from '../LocaleContext'
import { useIniciarSimulado } from '../useIniciarSimulado'
import { formatClock, formatPercent, formatPercentile, formatSeconds } from '../format'

/**
 * Tela de resultado (PRD §4.17–4.19).
 *
 * O score é manchete, não cartão de métrica: é o número pelo qual a pessoa
 * abriu esta tela. O percentil vem logo abaixo com a curva que o explica —
 * "p62" sozinho é abstrato; ver a própria marca contra a distribuição não é.
 *
 * "Alcançadas" ganha linha própria porque na CCAT a maioria não termina as 50,
 * e não separar "errei" de "nem cheguei lá" esconde se o problema é precisão
 * ou ritmo.
 */
export function ResultScreen() {
  const simulado = useIniciarSimulado()
  const { t, tx } = useLocale()
  const { state } = useLocation() as { state: { score?: SessionScore } | null }
  const score = state?.score

  if (!score) {
    return (
      <>
        <h1>{t('result.empty.title')}</h1>
        <p className="lead">{t('result.empty.lead')}</p>
        <div className="btn-linha">
          <Link className="btn" to="/">
            {t('result.home')}
          </Link>
          <Link className="btn secundario" to="/progresso">
            {t('result.progress')}
          </Link>
        </div>
      </>
    )
  }

  const exam = score.mode === 'exam'
  const ritmoAlvo = paceTargetMs()
  const ritmoOk = score.avgMs !== null && score.avgMs <= ritmoAlvo
  const faltamP80 = rawNeededForPercentile(80) - score.raw

  return (
    <>
      <p className="trilha">{exam ? t('result.crumb.exam') : t('result.crumb.drill')}</p>

      <div className="manchete">
        <span className="score">{score.raw}</span>
        <p className="frase">
          {t(exam ? 'result.headline.exam' : 'result.headline.drill', {
            reached: score.reached,
            duration: formatClock(score.durationMs),
          })}
        </p>
      </div>

      <div className="linhas">
        <div className="linha-dado">
          <span className="rotulo">{t('result.reached')}</span>
          <span className="valor">
            {score.reached}/{score.total}
            {score.timedOut > 0 && (
              <span className="nota">
                {t('result.reached.timedOut', { count: score.timedOut })}
              </span>
            )}
          </span>
        </div>
        <div className="linha-dado">
          <span className="rotulo">{t('result.accuracy')}</span>
          <span className="valor">{formatPercent(score.accuracy)}</span>
        </div>
        <div className="linha-dado">
          <span className="rotulo">{t('result.avgTime')}</span>
          <span className="valor">
            {formatSeconds(score.avgMs)}
            <span className="nota">
              {ritmoOk
                ? t('result.pace.ok')
                : t('result.pace.target', { time: formatSeconds(ritmoAlvo) })}
            </span>
          </span>
        </div>
      </div>

      {/*
        Percentil so aparece como MEDICAO quando a prova foi inteira. Comparar
        12 acertos em 4 minutos com uma norma construida sobre provas de 15
        minutos nao mede nada: o score bruto da CCAT ja embute a velocidade.
      */}
      {exam && score.completeRun && score.percentile !== null && (
        <>
          <h2>{t('result.placement')}</h2>
          <DistributionCurve raw={score.raw} percentile={score.percentile} />
          <p className="legenda">
            {t('result.placement.legend', { percentile: score.percentile })}
            {faltamP80 > 0
              ? t('result.placement.toP80', { count: faltamP80 })
              : t('result.placement.atP80')}
          </p>

          <div className="nota-bloco">
            <span className="micro">{t('result.estimate.label')}</span>
            <p>{t('result.estimate.body', { mean: CCAT_NORMS.mean, sd: CCAT_NORMS.sd })}</p>
          </div>
        </>
      )}

      {exam && !score.completeRun && score.projection && (
        <>
          <h2>{t('result.projection')}</h2>
          <p className="legenda" style={{ marginBottom: 14 }}>
            {t('result.projection.lead', {
              reached: score.reached,
              total: score.total,
            })}
          </p>

          <DistributionCurve
            raw={score.projection.projectedRaw}
            percentile={score.projection.percentile}
            faixa={{
              low: score.projection.projectedRawLow,
              high: score.projection.projectedRawHigh,
            }}
            rotulo={`${score.projection.projectedRawLow}\u2013${score.projection.projectedRawHigh}`}
          />

          <div className="linhas">
            <div className="linha-dado">
              <span className="rotulo">{t('result.projection.score')}</span>
              <span className="valor">
                {score.projection.projectedRaw}
                <span className="nota">
                  {t('result.projection.range', {
                    low: score.projection.projectedRawLow,
                    high: score.projection.projectedRawHigh,
                  })}
                </span>
              </span>
            </div>
            <div className="linha-dado">
              <span className="rotulo">{t('result.projection.percentile')}</span>
              <span className="valor">
                {formatPercentile(score.projection.percentile)}
                <span className="nota">
                  {t('result.projection.range', {
                    low: formatPercentile(score.projection.percentileLow),
                    high: formatPercentile(score.projection.percentileHigh),
                  })}
                </span>
              </span>
            </div>
            <div className="linha-dado">
              <span className="rotulo">{t('result.projection.reached')}</span>
              <span className="valor">
                {score.projection.projectedReached}
                <span className="nota">
                  {t('result.projection.reached.note', { time: formatSeconds(score.avgMs) })}
                </span>
              </span>
            </div>
          </div>

          <div className="nota-bloco">
            <span className="micro">{t('result.projection.caveat.label')}</span>
            <p>
              {t('result.projection.caveat.body', {
                reached: score.reached,
                accuracy: formatPercent(score.accuracy),
                low: formatPercent(score.projection.accuracyLow),
                high: formatPercent(score.projection.accuracyHigh),
              })}
            </p>
          </div>
        </>
      )}

      <h2>{t('result.byType')}</h2>
      <table>
        <thead>
          <tr>
            <th>{t('result.table.type')}</th>
            <th className="n">{t('result.table.correct')}</th>
            <th className="n">{t('result.table.accuracy')}</th>
            <th className="n">{t('result.table.time')}</th>
            <th style={{ width: 72 }} aria-label={t('result.table.bar')} />
          </tr>
        </thead>
        <tbody>
          {score.byTipo.map((b) => (
            <tr key={b.tipo}>
              <td>
                <Link to={`/teoria/${b.tipo}`}>{tx(TIPO_LABEL[b.tipo])}</Link>
              </td>
              <td className="n">
                {b.correct}/{b.reached}
              </td>
              <td className="n">{formatPercent(b.accuracy)}</td>
              <td className="n">{formatSeconds(b.avgMs)}</td>
              <td>
                <span className="medidor">
                  <i style={{ width: `${(b.accuracy ?? 0) * 100}%` }} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {score.weakestTipo ? (
        <p className="rodape-teoria">
          {t('result.weakest', { tipo: tx(TIPO_LABEL[score.weakestTipo]) })}{' '}
          <Link to={`/teoria/${score.weakestTipo}`}>{t('result.weakest.theory')}</Link>
          {' · '}
          <Link to={`/treinar?tipo=${score.weakestTipo}`}>{t('result.weakest.drill')}</Link>.
        </p>
      ) : (
        <p className="rodape-teoria">{t('result.even')}</p>
      )}

      {exam && score.reached < EXAM_QUESTION_COUNT && (
        <div className="nota-bloco">
          <span className="micro">
            {t(score.endedByTimeout ? 'result.timeout.label' : 'result.abandoned.label')}
          </span>
          <p>
            {score.endedByTimeout
              ? t('result.timeout.body', {
                  reached: score.reached,
                  time: formatSeconds(ritmoAlvo),
                })
              : t('result.abandoned.body', {
                  reached: score.reached,
                  total: EXAM_QUESTION_COUNT,
                })}
          </p>
        </div>
      )}

      <div className="barra-acao">
        <button
          className="btn bloco"
          type="button"
          onClick={simulado.comecar}
          disabled={simulado.iniciando}
          aria-busy={simulado.iniciando}
        >
          {simulado.iniciando ? t('home.exam.loading') : t('result.again')}
        </button>
        <Link className="btn secundario bloco" to="/progresso">
          {t('result.progress')}
        </Link>
      </div>

      {simulado.erro && (
        <div className="nota-bloco">
          <span className="micro">{t('home.error.label')}</span>
          <p>{t('home.error.body', { message: simulado.erro })}</p>
        </div>
      )}
    </>
  )
}
