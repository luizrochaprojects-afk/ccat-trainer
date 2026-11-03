import { Link, Navigate, useLocation } from 'react-router-dom'
import type { QmResumoLinha } from '../../core/quickmath/sessao'
import { SUBSKILL_LABEL } from '../../core/quickmath/taxonomia'
import { formatSeconds } from '../format'
import { useLocale } from '../LocaleContext'

/** Resumo da sessão: certas, tempo médio contra o alvo e o nível em que cada habilidade ficou. */
export function QuickMathResultScreen() {
  const { t, tx } = useLocale()
  const resumo = (useLocation().state as { resumo?: QmResumoLinha[] } | null)?.resumo
  if (!resumo) return <Navigate to="/quickmath" replace />

  const n = resumo.reduce((a, l) => a + l.n, 0)
  const certas = resumo.reduce((a, l) => a + l.certas, 0)

  return (
    <>
      <h1>{t('qm.result.title')}</h1>
      <p className="lead">{n > 0 ? t('qm.result.lead', { certas, n }) : t('qm.result.empty')}</p>

      {n > 0 && (
        <table className="lista-mobile">
          <thead>
            <tr>
              <th>{t('qm.result.skill')}</th>
              <th className="n">{t('qm.result.correct')}</th>
              <th className="n">{t('qm.result.time')}</th>
              <th className="n">{t('qm.result.level')}</th>
            </tr>
          </thead>
          <tbody>
            {resumo.map((l) => (
              <tr key={l.subskill}>
                <td data-rotulo={t('qm.result.skill')}>{tx(SUBSKILL_LABEL[l.subskill])}</td>
                <td className="n" data-rotulo={t('qm.result.correct')}>
                  {l.certas}/{l.n}
                </td>
                <td className="n" data-rotulo={t('qm.result.time')}>
                  {formatSeconds(l.tempoMedioMs)} / {formatSeconds(l.alvoMedioMs)}
                </td>
                <td className="n" data-rotulo={t('qm.result.level')}>
                  {l.nivelFinal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="btn-linha">
        <Link className="btn" to="/quickmath/sessao">
          {t('qm.result.again')}
        </Link>
        <Link className="btn secundario" to="/">
          {t('qm.result.home')}
        </Link>
      </div>
    </>
  )
}
