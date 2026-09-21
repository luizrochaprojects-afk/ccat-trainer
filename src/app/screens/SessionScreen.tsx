import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  currentQuestion,
  feedbackAvailable,
  isFinished,
  remainingMs,
  type SessionState,
} from '../../core/session/engine'
import { subtipoTheory } from '../../core/theory'
import { DRILL_PER_QUESTION_MS, SUBTIPO_LABEL, type AnySubtipo } from '../../core/taxonomy'
import { SpatialFigure } from '../components/SpatialFigure'
import { useOptionHotkeys, useSession } from '../useSession'
import { useLocale } from '../LocaleContext'
import { formatClock } from '../format'

/**
 * Tela de questão — o pico do app.
 *
 * Restrição de projeto: ler e responder em ~18 segundos. Por isso existem
 * quatro coisas na tela e nada mais — cronômetro, contador, enunciado,
 * alternativas. O cabeçalho some durante a sessão e a régua de tempo sangra de
 * borda a borda: a passagem do tempo é o fato mais importante aqui, e é o
 * único elemento que se move sozinho.
 */
export function SessionScreen({
  inicial,
  meta,
}: {
  inicial: SessionState
  meta?: { tipo?: string; subtipo?: string }
}) {
  const navigate = useNavigate()
  const { t, tx } = useLocale()
  const { state, now, score, savedId, answer, abandon } = useSession(inicial, meta ?? {})
  const [escolhida, setEscolhida] = useState<string | null>(null)

  const q = currentQuestion(state)
  const drill = feedbackAvailable(state)
  const revelado = drill && escolhida !== null

  // Ao trocar de questão, limpa o feedback da anterior.
  useEffect(() => setEscolhida(null), [state.index])

  // Terminou: leva para o resultado assim que ele estiver gravado.
  useEffect(() => {
    if (isFinished(state) && score) {
      navigate('/resultado', { replace: true, state: { score, savedId } })
    }
  }, [state.status, score, savedId])

  const optionIds = useMemo(() => q?.options.map((o) => o.id) ?? [], [q?.id])

  const escolher = (id: string) => {
    if (!q || isFinished(state)) return
    if (drill) {
      // No drill o feedback é imediato: mostra o veredito e só avança no
      // comando seguinte.
      if (escolhida !== null) return
      setEscolhida(id)
      return
    }
    answer(id)
  }

  useOptionHotkeys(optionIds, escolher, !revelado && !isFinished(state))

  // Enter / espaço avançam depois do feedback no drill.
  useEffect(() => {
    if (!revelado) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      answer(escolhida)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [revelado, escolhida])

  if (!q || isFinished(state)) {
    return (
      <>
        <p className="trilha">{t('session.ended')}</p>
        <h1>{t('session.scoring')}</h1>
      </>
    )
  }

  const restante = remainingMs(state, now)
  const orcamento = state.config.totalMs ?? DRILL_PER_QUESTION_MS
  // O alerta tem de ser proporcional ao orçamento. Um limiar fixo de 30s
  // deixaria o relógio vermelho o treino inteiro, já que a questão do drill
  // dura 18s — e alerta permanente não alerta nada.
  const urgente = restante <= Math.min(30_000, orcamento * 0.3)
  const total = state.config.questions.length
  const graficas = q.options.some((o) => o.spatial)
  const teoria = subtipoTheory(q.tipo, q.subtipo)
  const decorrido = Math.min(100, ((orcamento - restante) / orcamento) * 100)

  return (
    <>
      <div className="barra-sessao">
        <span
          className={`relogio${urgente ? ' urgente' : ''}`}
          role="timer"
          aria-label={t('session.timeLeft', { time: formatClock(restante) })}
        >
          {formatClock(restante)}
        </span>
        <span className="contador">
          {state.index + 1}/{total}
        </span>
        <button className="encerrar" onClick={abandon} type="button">
          {t('session.finish')}
        </button>
      </div>

      <div className={`progresso${urgente ? ' urgente' : ''}`} aria-hidden="true">
        <i style={{ width: `${decorrido}%` }} />
      </div>

      <div className="questao" key={q.id}>
        {q.stemSpatial && (
          <div className="figura-enunciado">
            <SpatialFigure spec={q.stemSpatial} label="Figura do enunciado" />
          </div>
        )}

        <p className={`enunciado${q.tipo === 'math_series' ? ' serie' : ''}`}>{q.stem}</p>

        <ul className={`opcoes${graficas ? ' graficas' : ''}`}>
          {q.options.map((o, i) => {
            const certa = o.id === q.answerId
            const marcada = o.id === escolhida
            const classe = revelado ? (certa ? ' certa' : marcada ? ' errada' : '') : ''

            return (
              <li key={o.id}>
                <button
                  type="button"
                  className={`opcao${classe}`}
                  onClick={() => escolher(o.id)}
                  disabled={revelado}
                  aria-pressed={marcada}
                >
                  <span className="tecla" aria-hidden="true">
                    {'ABCDE'[i]}
                  </span>
                  {o.spatial ? (
                    <SpatialFigure spec={o.spatial} label={`Alternativa ${'ABCDE'[i]}`} />
                  ) : (
                    <span className="rotulo">{o.text}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {!revelado && (
          <button className="pular" type="button" onClick={() => answer(null)}>
            {t('session.skip')}
          </button>
        )}

        {revelado && (
          <div className="feedback">
            <p className={`veredito ${escolhida === q.answerId ? 'acerto' : 'erro'}`}>
              {escolhida === q.answerId ? t('session.correct') : t('session.incorrect')}
            </p>
            <p>{tx(q.explanation)}</p>
            {teoria && (
              <p className="rodape-teoria">
                <Link to={`/teoria/${q.tipo}#${q.subtipo}`}>
                  {t('session.reviewTheory', {
                    subtipo: tx(SUBTIPO_LABEL[q.subtipo as AnySubtipo]),
                  })}
                </Link>
              </p>
            )}
            <div className="btn-linha" style={{ marginTop: 20 }}>
              <button className="btn" type="button" onClick={() => answer(escolhida)} autoFocus>
                {t('session.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
