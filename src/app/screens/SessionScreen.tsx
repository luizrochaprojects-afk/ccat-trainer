import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  currentQuestion,
  elapsedTotalMs,
  feedbackAvailable,
  isFinished,
  remainingMs,
  type SessionState,
} from '../../core/session/engine'
import { subtipoTheory } from '../../core/theory'
import { DRILL_PER_QUESTION_MS, SUBTIPO_LABEL, type AnySubtipo } from '../../core/taxonomy'
import { SpatialFigure } from '../components/SpatialFigure'
import { useOptionHotkeys, useSession } from '../useSession'
import { formatClock } from '../format'

/**
 * Tela de questão.
 *
 * Restrição de projeto: precisa ser lida e respondida em ~18 segundos. Por isso
 * só existem quatro coisas na tela — relógio, contador, enunciado e
 * alternativas. Qualquer elemento a mais compete com o cronômetro.
 */
export function SessionScreen({
  inicial,
  meta,
}: {
  inicial: SessionState
  meta?: { tipo?: string; subtipo?: string }
}) {
  const navigate = useNavigate()
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
      <div className="vazio">
        <p>Apurando o resultado…</p>
      </div>
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

  return (
    <>
      <div className="barra-sessao">
        <span className={`relogio${urgente ? ' urgente' : ''}`}>
          {formatClock(restante)}
        </span>
        <span className="contador">
          {state.index + 1} / {total}
        </span>
        <button className="btn secundario" onClick={abandon} type="button">
          Encerrar
        </button>
      </div>

      <div className="progresso" aria-hidden="true">
        <i
          style={{
            width: `${Math.min(100, ((orcamento - restante) / orcamento) * 100)}%`,
          }}
        />
      </div>

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
          const classe = revelado
            ? certa
              ? ' certa'
              : marcada
                ? ' errada'
                : ''
            : ''

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
                  <span>{o.text}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {!revelado && (
        <div className="btn-linha">
          <button className="btn secundario" type="button" onClick={() => answer(null)}>
            Pular
          </button>
        </div>
      )}

      {revelado && (
        <div className="feedback">
          <p className={`veredito ${escolhida === q.answerId ? 'acerto' : 'erro'}`}>
            {escolhida === q.answerId ? 'Correto' : 'Incorreto'}
          </p>
          <p>{q.explanation}</p>
          {teoria && (
            <p className="rodape-teoria">
              Revisar a teoria:{' '}
              <Link to={`/teoria/${q.tipo}#${q.subtipo}`}>
                {SUBTIPO_LABEL[q.subtipo as AnySubtipo]}
              </Link>
            </p>
          )}
          <div className="btn-linha">
            <button className="btn" type="button" onClick={() => answer(escolhida)} autoFocus>
              Próxima
            </button>
          </div>
        </div>
      )}

      {state.config.mode === 'exam' && (
        <p className="legenda" style={{ marginTop: 28 }}>
          Simulação fiel: sem feedback e sem voltar até o fim.{' '}
          <span className="num">{formatClock(elapsedTotalMs(state, now))}</span> decorridos.
        </p>
      )}
    </>
  )
}
