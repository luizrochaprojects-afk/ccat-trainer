import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Confirmacao } from '../components/Confirmacao'
import { SpatialFigure } from '../components/SpatialFigure'
import { tocar } from '../haptics'
import { useGuardaDeSaida, useSalvarAoSair } from '../useBotaoVoltar'
import { useOptionHotkeys, useSession } from '../useSession'
import { useLocale } from '../LocaleContext'
import { formatClock, marcoDoRelogio } from '../format'

const LETRAS = 'ABCDE'

/**
 * Tela de questão — o pico do app.
 *
 * Restrição de projeto: ler e responder em ~18 segundos. Por isso existem
 * quatro coisas na tela e nada mais — cronômetro, contador, enunciado,
 * alternativas. O cabeçalho some durante a sessão e a régua de tempo sangra de
 * borda a borda: a passagem do tempo é o fato mais importante aqui, e é o
 * único elemento que se move sozinho.
 *
 * Estas quatro faixas são as linhas de uma grade de altura de viewport (ver
 * `.shell.em-sessao` no CSS). Só a faixa do meio rola. Antes a tela inteira
 * rolava no corpo do documento, e num celular isso significava rolar DURANTE a
 * contagem regressiva para alcançar a quinta alternativa — o momento mais caro
 * possível para pedir uma rolagem.
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
  const { state, now, score, savedId, answer, abandon, salvarAgora } = useSession(
    inicial,
    meta ?? {},
  )
  const [escolhida, setEscolhida] = useState<string | null>(null)

  const q = currentQuestion(state)
  const drill = feedbackAvailable(state)
  const revelado = drill && escolhida !== null

  const restante = remainingMs(state, now)
  const orcamento = state.config.totalMs ?? DRILL_PER_QUESTION_MS

  useSalvarAoSair(salvarAgora)

  const guarda = useGuardaDeSaida(abandon)

  // Ao trocar de questão, limpa o feedback da anterior.
  useEffect(() => setEscolhida(null), [state.index])

  // Terminou: leva para o resultado assim que ele estiver gravado.
  useEffect(() => {
    if (isFinished(state) && score) {
      navigate('/resultado', { replace: true, state: { score, savedId } })
    }
  }, [state.status, score, savedId])

  // --- anúncio de tempo para leitor de tela ----------------------------------
  // O cronômetro visual muda quatro vezes por segundo. Ler isso em voz alta
  // tornaria o app inutilizável com leitor de tela, e não ler nada esconderia a
  // única variável do jogo. A saída é anunciar só em marcos.
  const marco = marcoDoRelogio(restante, orcamento)
  const marcoAnterior = useRef<number | null>(null)
  const [anuncio, setAnuncio] = useState('')

  useEffect(() => {
    if (marco === marcoAnterior.current) return
    marcoAnterior.current = marco
    setAnuncio(marco === null ? '' : t('session.announce.time', { time: formatClock(marco) }))
  }, [marco, t])

  const optionIds = useMemo(() => q?.options.map((o) => o.id) ?? [], [q?.id])

  const escolher = useCallback(
    (id: string) => {
      if (!q || isFinished(state)) return
      if (drill) {
        // No drill o feedback é imediato: mostra o veredito e só avança no
        // comando seguinte. O háptico é do veredito, não do toque — no
        // simulado ele não existe, porque vibrar diferente para certo e errado
        // entregaria o gabarito que a prova real não dá.
        if (escolhida !== null) return
        setEscolhida(id)
        void tocar(id === q.answerId ? 'acerto' : 'erro')
        return
      }
      answer(id)
    },
    [q?.id, drill, escolhida, state.status],
  )

  useOptionHotkeys(optionIds, escolher, !revelado && !isFinished(state))

  /**
   * Traz a explicação para a vista.
   *
   * Medido em 375×667: com o veredito revelado a área da questão passa a
   * exceder a dobra em ~100–160px, e a explicação nasce fora dela. Como o
   * botão "Próxima" vive numa barra fixa, dava para atravessar o treino
   * inteiro sem nunca ler a explicação — que é a única coisa que o treino tem
   * e o simulado não.
   */
  const feedbackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!revelado) return
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    feedbackRef.current?.scrollIntoView({
      behavior: suave ? 'smooth' : 'auto',
      block: 'nearest',
    })
  }, [revelado])

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
      <div className="apurando">
        <p className="trilha">{t('session.ended')}</p>
        <h1>{t('session.scoring')}</h1>
      </div>
    )
  }

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
          aria-live="off"
          aria-label={t('session.timeLeft', { time: formatClock(restante) })}
        >
          {formatClock(restante)}
        </span>
        <span className="contador">
          {state.index + 1}/{total}
        </span>
        <button className="encerrar" onClick={guarda.pedir} type="button">
          {t('session.finish')}
        </button>
      </div>

      <div className={`progresso${urgente ? ' urgente' : ''}`} aria-hidden="true">
        <i style={{ width: `${decorrido}%` }} />
      </div>

      <div className="questao" key={q.id}>
        <p className="sr-only" role="status" aria-live="polite">
          {anuncio}
        </p>

        {q.stemSpatial && (
          <div className="figura-enunciado">
            <SpatialFigure spec={q.stemSpatial} label={t('session.figure.stem')} />
          </div>
        )}

        <p
          id="enunciado"
          className={`enunciado${q.tipo === 'math_series' ? ' serie' : ''}`}
        >
          {q.stem}
        </p>

        {/* radiogroup, não lista de botões: `aria-pressed` comunica "botão que
            fica ligado", e o que existe aqui é uma escolha entre cinco. */}
        <div
          className={`opcoes${graficas ? ' graficas' : ''}`}
          role="radiogroup"
          aria-labelledby="enunciado"
        >
          {q.options.map((o, i) => {
            const letra = LETRAS[i] ?? ''
            const certa = o.id === q.answerId
            const marcada = o.id === escolhida
            const classe = revelado ? (certa ? ' certa' : marcada ? ' errada' : '') : ''

            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                className={`opcao${classe}`}
                onClick={() => escolher(o.id)}
                disabled={revelado}
                aria-checked={marcada}
                aria-keyshortcuts={`${letra} ${i + 1}`}
              >
                <span className="tecla" aria-hidden="true">
                  {letra}
                </span>
                {o.spatial ? (
                  <SpatialFigure
                    spec={o.spatial}
                    label={t('session.figure.option', { letter: letra })}
                  />
                ) : (
                  <span className="rotulo">{o.text}</span>
                )}
              </button>
            )
          })}
        </div>

        {revelado && (
          <div className="feedback" ref={feedbackRef}>
            {/* assertive, não polite: com 18 segundos por questão, um anúncio
                educado é engolido pela questão seguinte. */}
            <p
              className={`veredito ${escolhida === q.answerId ? 'acerto' : 'erro'}`}
              role="status"
              aria-live="assertive"
              aria-atomic="true"
            >
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
          </div>
        )}
      </div>

      {/* A ação fica numa faixa fixa no rodapé: sempre no mesmo lugar, sempre
          ao alcance do polegar. No simulado não existe "Próxima" — responder
          avança —, então a barra mostra só "Pular", e isso é honesto. */}
      <div className="barra-acao">
        {revelado ? (
          <button
            className="btn bloco"
            type="button"
            onClick={() => answer(escolhida)}
            autoFocus
          >
            {t('session.next')}
          </button>
        ) : (
          <button className="btn fantasma bloco" type="button" onClick={() => answer(null)}>
            {t('session.skip')}
          </button>
        )}
      </div>

      <Confirmacao
        aberto={guarda.pedindo}
        titulo={t('confirm.abandon.title')}
        corpo={t('confirm.abandon.body')}
        confirmar={t('confirm.abandon.yes')}
        cancelar={t('confirm.abandon.no')}
        tom="perigo"
        onConfirmar={guarda.confirmar}
        onCancelar={guarda.cancelar}
      />
    </>
  )
}
