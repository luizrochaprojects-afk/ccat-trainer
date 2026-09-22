import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { remainingMs, type SessionState } from '../../core/session/engine'
import { EXAM_QUESTION_COUNT, TIPO_LABEL, type Tipo } from '../../core/taxonomy'
import {
  armazenamentoIndisponivel,
  clearActiveSession,
  listSessions,
  loadActiveSession,
} from '../../data/db'
import type { StoredSession } from '../../data/db'
import { Confirmacao } from '../components/Confirmacao'
import { Esqueleto } from '../components/Esqueleto'
import { useLocale } from '../LocaleContext'
import { useSessaoPendente } from '../SessionContext'
import { useIniciarSimulado } from '../useIniciarSimulado'
import { useRecurso } from '../useRecurso'
import { formatClock, formatDate, formatPercentile } from '../format'

interface DadosHome {
  ativa: SessionState | null
  historico: StoredSession[]
}

/**
 * Home.
 *
 * Hierarquia deliberada: quem abre este app veio fazer uma prova. A simulação
 * é uma ação dominante, não um cartão entre iguais — treino e teoria vivem
 * abaixo dela, subordinados.
 *
 * Com uma prova em andamento a hierarquia inverte: retomar é a coisa mais
 * urgente que pode existir nesta tela, então o aviso sobe para ANTES do título
 * e o simulado novo recua para ação secundária. Um relógio correndo não espera
 * a pessoa ler o parágrafo de apresentação.
 */
export function HomeScreen() {
  const navigate = useNavigate()
  const { iniciar } = useSessaoPendente()
  const { t, tx, locale } = useLocale()

  const simulado = useIniciarSimulado()
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false)
  const [descartada, setDescartada] = useState(false)

  const carregar = useCallback(async (): Promise<DadosHome> => {
    const [ativa, historico] = await Promise.all([loadActiveSession(), listSessions(5)])
    // Uma prova cujo relógio já venceu não deve ser oferecida como retomável:
    // retomar só para ver "00:00" e ir direto ao resultado é pior que nada.
    if (ativa && remainingMs(ativa, Date.now()) <= 0) {
      await clearActiveSession()
      return { ativa: null, historico }
    }
    return { ativa, historico }
  }, [])

  const { estado, recarregar } = useRecurso(carregar)

  const dados = estado.fase === 'pronto' ? estado.dado : null
  const emAndamento = descartada ? null : (dados?.ativa ?? null)
  const historico = dados?.historico ?? []


  const retomar = () => {
    if (!emAndamento) return
    iniciar(emAndamento)
    navigate('/sessao')
  }

  const descartar = () => {
    void clearActiveSession()
    setDescartada(true)
    setConfirmandoDescarte(false)
  }

  return (
    <>
      {emAndamento && (
        <div className="nota-bloco urgente">
          <span className="micro">{t('home.resume.label')}</span>
          <p>
            {t('home.resume.body', {
              time: formatClock(remainingMs(emAndamento, Date.now())),
            })}
          </p>
          <div className="btn-linha">
            <button className="btn" type="button" onClick={retomar}>
              {t('home.resume.action')}
            </button>
            <button
              className="btn secundario"
              type="button"
              onClick={() => setConfirmandoDescarte(true)}
            >
              {t('home.resume.discard')}
            </button>
          </div>
        </div>
      )}

      <h1>{t('home.title')}</h1>
      <p className="lead">{t('home.lead')}</p>

      <p className="formato">
        <b>50</b> <span>{t('home.format.questions')}</span>
        <b>15:00</b> <span>{t('home.format.total')}</span>
        <b>18s</b> <span>{t('home.format.each')}</span>
      </p>

      <button
        className={`ato${emAndamento ? '' : ' primario'}`}
        type="button"
        onClick={simulado.comecar}
        disabled={simulado.iniciando}
        aria-busy={simulado.iniciando}
      >
        <span className="seta" aria-hidden="true">
          →
        </span>
        <h2>{simulado.iniciando ? t('home.exam.loading') : t('home.exam.title')}</h2>
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

      {simulado.erro && (
        <div className="nota-bloco">
          <span className="micro">{t('home.error.label')}</span>
          <p>{t('home.error.body', { message: simulado.erro })}</p>
          {/* Erro sem saída é beco. O banco falha por rede ou memória, e tentar
              de novo costuma bastar — antes a tela só informava e parava. */}
          <div className="btn-linha">
            <button className="btn" type="button" onClick={simulado.comecar}>
              {t('common.retry')}
            </button>
          </div>
        </div>
      )}

      {armazenamentoIndisponivel() && (
        <div className="nota-bloco">
          <span className="micro">{t('storage.blocked.label')}</span>
          <p>{t('storage.blocked.body')}</p>
        </div>
      )}

      {estado.fase === 'carregando' && (
        <>
          <h2>{t('home.recent')}</h2>
          <Esqueleto variante="tabela" />
        </>
      )}

      {estado.fase === 'erro' && (
        <div className="nota-bloco">
          <span className="micro">{t('home.error.label')}</span>
          <p>{t('progress.error', { message: estado.erro.message })}</p>
          <div className="btn-linha">
            <button className="btn secundario" type="button" onClick={recarregar}>
              {t('common.retry')}
            </button>
          </div>
        </div>
      )}

      {historico.length > 0 && (
        <>
          <h2>{t('home.recent')}</h2>
          {/* `data-rotulo` alimenta o modo-lista da tabela no celular: quatro
              colunas não cabem em 375px, e rolagem horizontal dentro da página
              é pior que reempilhar. */}
          <table className="lista-mobile">
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
                  <td data-rotulo={t('home.recent.when')}>{formatDate(s.finishedAt, locale)}</td>
                  <td data-rotulo={t('home.recent.what')}>
                    {s.mode === 'exam'
                      ? t('home.recent.exam')
                      : t('home.recent.drill', {
                          tipo: s.tipo ? tx(TIPO_LABEL[s.tipo as Tipo]) : '—',
                        })}
                  </td>
                  <td className="n" data-rotulo={t('home.recent.correct')}>
                    {s.score.raw}/{s.score.reached}
                  </td>
                  <td className="n" data-rotulo={t('home.recent.percentile')}>
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

      <Confirmacao
        aberto={confirmandoDescarte}
        titulo={t('confirm.discard.title')}
        corpo={t('confirm.discard.body')}
        confirmar={t('confirm.discard.yes')}
        cancelar={t('confirm.discard.no')}
        tom="perigo"
        onConfirmar={descartar}
        onCancelar={() => setConfirmandoDescarte(false)}
      />
    </>
  )
}
