import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SUBSKILL_LABEL, SUBSKILLS_ATIVAS, type Nivel, type Subskill } from '../../core/quickmath/taxonomia'
import { carregarNiveis } from '../../data/quickmath'
import { useLocale } from '../LocaleContext'

/** Entrada do modo Math de case: o que é, o botão da sessão e onde você está. */
export function QuickMathScreen() {
  const { t, tx } = useLocale()
  const [niveis, setNiveis] = useState<Partial<Record<Subskill, Nivel>> | null>(null)

  useEffect(() => {
    let vivo = true
    void carregarNiveis().then((n) => vivo && setNiveis(n))
    return () => {
      vivo = false
    }
  }, [])

  return (
    <>
      <h1>{t('qm.title')}</h1>
      <p className="lead">{t('qm.lead')}</p>

      <Link className="ato primario" to="/quickmath/sessao">
        <span className="seta" aria-hidden="true">
          →
        </span>
        <h2>{t('qm.start')}</h2>
      </Link>

      <h2>{t('qm.levels')}</h2>
      <table className="lista-mobile">
        <tbody>
          {SUBSKILLS_ATIVAS.map((s) => (
            <tr key={s}>
              <td>{tx(SUBSKILL_LABEL[s])}</td>
              <td className="n">{t('qm.level', { n: niveis?.[s] ?? 1 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
