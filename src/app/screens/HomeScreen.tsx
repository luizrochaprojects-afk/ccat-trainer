import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { composeExam } from '../../core/session/compose'
import { createExam, remainingMs, type SessionState } from '../../core/session/engine'
import { EXAM_QUESTION_COUNT, TIPO_LABEL, type Tipo } from '../../core/taxonomy'
import { loadFullBank } from '../../data/bank'
import { clearActiveSession, listSessions, loadActiveSession, seenQuestionIds } from '../../data/db'
import type { StoredSession } from '../../data/db'
import { useLocale } from '../LocaleContext'
import { formatClock, formatDate, formatPercentile } from '../format'

/**
 * Home.
 *
 * Hierarquia deliberada: quem abre este app veio fazer uma prova. A simulação
 * é uma ação dominante, não um cartão entre iguais — treino e teoria vivem
 * abaixo dela, subordinados, na mesma lista de regras.
 */
export function HomeScreen({ onStart }: { onStart: (s: SessionState) => void }) {
  const navigate = useNavigate()
  const { t, tx, locale } = useLocale()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [emAndamento, setEmAndamento] = useState<SessionState | null>(null)
  const [historico, setHistorico] = useState<StoredSession[]>([])

  useEffect(() => {
    void (async () => {
      const [ativa, sessoes] = await Promise.all([loadActiveSession(), listSessions(5)])
      // Uma prova cujo relógio já venceu não deve ser oferecida como retomável:
      // retomar só para ver "00:00" e ir direto ao resultado é pior que nada.
      setEmAndamento(ativa && remainingMs(ativa, Date.now()) > 0 ? ativa : null)
      if (ativa && remainingMs(ativa, Date.now()) <= 0) await clearActiveSession()
      setHistorico(sessoes)
    })()
  }, [])

  const iniciarSimulacao = async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [banco, vistas] = await Promise.all([loadFullBank(), seenQuestionIds()])
      onStart(createExam(composeExam(banco, { seen: vistas }), Date.now()))
      navigate('/sessao')
    } catch (e) {
      setErro((e as Error).message)
      setCarregando(false)
    }
  }

  const retomar = () => {
    if (!emAndamento) return
    onStart(emAndamento)
    navigate('/sessao')
  }

  return (
    <>
      <h1>{t('home.title')}</h1>
      <p className="lead">{t('home.lead')}</p>

      <p className="formato">
        <b>50</b> <span>{t('home.format.questions')}</span>
        <b>15:00</b> <span>{t('home.format.total')}</span>
        <b>18s</b> <span>{t('home.format.each')}</span>
      </p>

      {emAndamento && (
        <div className="nota-bloco">
          <span className="micro">{t('home.resume.label')}</span>
          <p>{t('home.resume.body', { time: formatClock(remainingMs(emAndamento, Date.now())) })}</p>
          <div className="btn-linha" style={{ marginTop: 18 }}>
            <button className="btn" type="button" onClick={retomar}>
              {t('home.resume.action')}
            </button>
            <button
              className="btn secundario"
              type="button"
              onClick={() => {
                void clearActiveSession()
                setEmAndamento(null)
              }}
            >
              {t('home.resume.discard')}
            </button>
          </div>
        </div>
      )}

      <button className="ato" type="button" onClick={iniciarSimulacao} disabled={carregando}>
        <span className="seta" aria-hidden="true">
          →
        </span>
        <h2>{carregando ? t('home.exam.loading') : t('home.exam.title')}</h2>
        <p>{t('home.exam.body', { count: EXAM_QUESTION_COUNT })}</p>
      </button>

      <Link className="ato" to="/treinar">
        <span className="seta" aria-hidden="true">
          →
        </span>
        <h2>{t('home.drill.title')}</h2>
        <p>{t('home.drill.body')}</p>
      </Link>

      <Link className="ato" to="/teoria">
        <span className="seta" aria-hidden="true">
          →
        </span>
        <h2>{t('home.theory.title')}</h2>
        <p>{t('home.theory.body')}</p>
      </Link>

      {erro && (
        <div className="nota-bloco">
          <span className="micro">{t('home.error.label')}</span>
          <p>{t('home.error.body', { message: erro })}</p>
        </div>
      )}

      {historico.length > 0 && (
        <>
          <h2>{t('home.recent')}</h2>
          <table>
            <thead>
              <tr>
                <th>{t('home.recent.when')}</th>
                <th>{t('home.recent.what')}</th>
                <th className="n">{t('home.recent.correct')}</th>
                <th className="n">{t('home.recent.percentile')}</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.finishedAt, locale)}</td>
                  <td>
                    {s.mode === 'exam'
                      ? t('home.recent.exam')
                      : t('home.recent.drill', {
                          tipo: s.tipo ? tx(TIPO_LABEL[s.tipo as Tipo]) : '—',
                        })}
                  </td>
                  <td className="n">
                    {s.score.raw}/{s.score.reached}
                  </td>
                  <td className="n">
                    {/* Percentil de prova interrompida nao compara com a norma. */}
                    {(s.score.completeRun ?? true) ? formatPercentile(s.score.percentile) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="rodape-teoria">
            <Link to="/progresso">{t('home.recent.all')}</Link>
          </p>
        </>
      )}
    </>
  )
}
