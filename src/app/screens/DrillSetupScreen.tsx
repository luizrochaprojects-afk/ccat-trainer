import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Question } from '../../core/schema'
import { composeDrill } from '../../core/session/compose'
import { createDrill, type SessionState } from '../../core/session/engine'
import {
  DRILL_PER_QUESTION_MS,
  SUBTIPO_LABEL,
  TIPOS,
  TIPO_LABEL,
  type AnySubtipo,
  type Tipo,
} from '../../core/taxonomy'
import { loadFullBank, subtiposDisponiveis } from '../../data/bank'
import { seenQuestionIds } from '../../data/db'
import { useLocale } from '../LocaleContext'

const QUANTIDADES = [10, 15, 20, 30]

export function DrillSetupScreen({
  onStart,
}: {
  onStart: (s: SessionState, meta: { tipo: string; subtipo?: string }) => void
}) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { t, tx } = useLocale()

  const [banco, setBanco] = useState<Question[] | null>(null)
  const [tipo, setTipo] = useState<Tipo>((params.get('tipo') as Tipo) ?? 'spatial')
  const [subtipo, setSubtipo] = useState<string>('')
  const [quantidade, setQuantidade] = useState(15)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    void loadFullBank()
      .then(setBanco)
      .catch((e: Error) => setErro(e.message))
  }, [])

  // Trocar de tipo invalida o subtipo escolhido.
  useEffect(() => setSubtipo(''), [tipo])

  if (erro) {
    return (
      <div className="nota-bloco">
        <span className="micro">{t('home.error.label')}</span>
        <p>{t('drill.error', { message: erro })}</p>
      </div>
    )
  }
  if (!banco) return <p className="legenda">{t('drill.loading')}</p>

  const subtipos = subtiposDisponiveis(banco, tipo)
  const disponiveis = banco.filter(
    (q) => q.tipo === tipo && (!subtipo || q.subtipo === subtipo),
  ).length

  const comecar = async () => {
    const vistas = await seenQuestionIds()
    const fila = composeDrill(banco, {
      tipo,
      ...(subtipo ? { subtipo } : {}),
      count: Math.min(quantidade, disponiveis),
      seen: vistas,
    })
    if (fila.length === 0) {
      setErro(t('drill.notEnough'))
      return
    }
    onStart(createDrill(fila, Date.now()), { tipo, ...(subtipo ? { subtipo } : {}) })
    navigate('/sessao')
  }

  return (
    <>
      <p className="trilha">{t('drill.crumb')}</p>
      <h1>{t('drill.title')}</h1>
      <p className="lead">{t('drill.lead', { seconds: DRILL_PER_QUESTION_MS / 1000 })}</p>

      <label className="campo">
        <span>{t('drill.type')}</span>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
          {TIPOS.map((item) => (
            <option key={item} value={item}>
              {tx(TIPO_LABEL[item])}
            </option>
          ))}
        </select>
      </label>

      <div className="campo">
        <span>{t('drill.subtype')}</span>
        <div className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={subtipo === ''}
            onClick={() => setSubtipo('')}
          >
            {t('drill.subtype.all')}
          </button>
          {subtipos.map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              aria-pressed={subtipo === s}
              onClick={() => setSubtipo(s)}
            >
              {tx(SUBTIPO_LABEL[s as AnySubtipo])}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span>{t('drill.count')}</span>
        <div className="chips">
          {QUANTIDADES.map((n) => (
            <button
              key={n}
              type="button"
              className="chip"
              aria-pressed={quantidade === n}
              onClick={() => setQuantidade(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <p className="legenda">
        {t('drill.available', { count: disponiveis })}
        {disponiveis < quantidade && t('drill.availableShort', { count: disponiveis })}.
      </p>

      <div className="btn-linha">
        <button
          className="btn"
          type="button"
          onClick={() => void comecar()}
          disabled={disponiveis === 0}
        >
          {t('drill.start')}
        </button>
      </div>
    </>
  )
}
