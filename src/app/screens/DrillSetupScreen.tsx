import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Question } from '../../core/schema'
import { composeDrill } from '../../core/session/compose'
import { createDrill } from '../../core/session/engine'
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
import { Esqueleto } from '../components/Esqueleto'
import { useLocale } from '../LocaleContext'
import { useSessaoPendente } from '../SessionContext'
import { useRecurso } from '../useRecurso'

const QUANTIDADES = [10, 15, 20, 30]

export function DrillSetupScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { t, tx } = useLocale()
  const { iniciar } = useSessaoPendente()

  const [tipo, setTipo] = useState<Tipo>((params.get('tipo') as Tipo) ?? 'spatial')
  const [subtipo, setSubtipo] = useState<string>('')
  const [quantidade, setQuantidade] = useState(15)
  const [erroInicio, setErroInicio] = useState<string | null>(null)

  const carregar = useCallback((): Promise<Question[]> => loadFullBank(), [])
  const { estado, recarregar } = useRecurso(carregar)

  if (estado.fase === 'carregando') {
    return (
      <>
        <p className="trilha">{t('drill.crumb')}</p>
        <h1>{t('drill.title')}</h1>
        <Esqueleto variante="chips" linhas={6} />
        <Esqueleto variante="chips" linhas={4} />
      </>
    )
  }

  if (estado.fase === 'erro' || estado.fase === 'vazio') {
    const mensagem =
      estado.fase === 'erro' ? t('drill.error', { message: estado.erro.message }) : t('drill.empty.body')
    return (
      <>
        <p className="trilha">{t('drill.crumb')}</p>
        <h1>{t('drill.empty.title')}</h1>
        <div className="nota-bloco">
          <span className="micro">{t('home.error.label')}</span>
          <p>{mensagem}</p>
          <div className="btn-linha">
            <button className="btn" type="button" onClick={recarregar}>
              {t('common.retry')}
            </button>
          </div>
        </div>
      </>
    )
  }

  const banco = estado.dado
  const subtipos = subtiposDisponiveis(banco, tipo)
  const disponiveis = banco.filter(
    (q) => q.tipo === tipo && (!subtipo || q.subtipo === subtipo),
  ).length

  // Trocar de tipo invalida o subtipo escolhido.
  const trocarTipo = (novo: Tipo) => {
    setTipo(novo)
    setSubtipo('')
    setErroInicio(null)
  }

  const comecar = async () => {
    const vistas = await seenQuestionIds()
    const fila = composeDrill(banco, {
      tipo,
      ...(subtipo ? { subtipo } : {}),
      count: Math.min(quantidade, disponiveis),
      seen: vistas,
    })
    if (fila.length === 0) {
      setErroInicio(t('drill.notEnough'))
      return
    }
    iniciar(createDrill(fila, Date.now()), { tipo, ...(subtipo ? { subtipo } : {}) })
    navigate('/sessao')
  }

  return (
    <>
      <p className="trilha">{t('drill.crumb')}</p>
      <h1>{t('drill.title')}</h1>
      <p className="lead">{t('drill.lead', { seconds: DRILL_PER_QUESTION_MS / 1000 })}</p>

      <label className="campo">
        <span>{t('drill.type')}</span>
        <select value={tipo} onChange={(e) => trocarTipo(e.target.value as Tipo)}>
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

      {disponiveis === 0 && (
        <div className="nota-bloco">
          <span className="micro">{t('drill.empty.title')}</span>
          <p>{t('drill.empty.body')}</p>
        </div>
      )}

      {erroInicio && (
        <div className="nota-bloco">
          <span className="micro">{t('home.error.label')}</span>
          <p>{erroInicio}</p>
        </div>
      )}

      {/* A disponibilidade mora DENTRO da barra de ação: é a informação que
          decide o clique, e no celular ela ficava acima da dobra enquanto o
          botão ficava abaixo. */}
      <div className="barra-acao">
        <p className="legenda">
          {t('drill.available', { count: disponiveis })}
          {disponiveis < quantidade && t('drill.availableShort', { count: disponiveis })}.
        </p>
        <button
          className="btn bloco"
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
