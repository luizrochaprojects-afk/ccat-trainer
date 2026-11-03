import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { OptionId } from '../../core/optionIds'
import { restanteMs } from '../../core/quickmath/sessao'
import { SUBSKILL_LABEL } from '../../core/quickmath/taxonomia'
import { Confirmacao } from '../components/Confirmacao'
import { formatClock } from '../format'
import { tocar } from '../haptics'
import { useLocale } from '../LocaleContext'
import { useGuardaDeSaida } from '../useBotaoVoltar'
import { useQuickMath } from '../useQuickMath'
import { useOptionHotkeys } from '../useSession'

const LETRAS = 'ABCDE'
const ROTAS = { sessao: '/quickmath/sessao', resultado: '/quickmath/resultado' }

/**
 * Tela da sessão de Quick Math.
 *
 * Usa as mesmas quatro faixas da sessão da CCAT (relógio, régua, questão,
 * ação) e as mesmas classes, para caber na dobra do mesmo jeito. Duas
 * diferenças de comportamento:
 *  - o relógio do topo é o da sessão inteira (15 min); a régua mede a questão
 *    contra o tempo-alvo e fica vermelha ao passar dele, mas não estoura;
 *  - o feedback mostra o atalho da conta e, no erro, qual escorregão aquela
 *    alternativa representa.
 */
export function QuickMathSessionScreen() {
  const navigate = useNavigate()
  const { t, tx } = useLocale()
  const qm = useQuickMath()
  const guarda = useGuardaDeSaida(qm.encerrar, ROTAS)
  const feedbackRef = useRef<HTMLDivElement>(null)

  const s = qm.sessao
  const q = s?.atual
  const revelada = s?.revelada ?? null

  useEffect(() => {
    if (qm.resumo) navigate(ROTAS.resultado, { replace: true, state: { resumo: qm.resumo } })
  }, [qm.resumo])

  const optionIds = useMemo(() => q?.opcoes.map((o) => o.id) ?? [], [q?.id])

  const escolher = useCallback(
    (id: string) => {
      if (!q || revelada) return
      qm.responder(id as OptionId)
      void tocar(id === q.answerId ? 'acerto' : 'erro')
    },
    [q?.id, revelada, qm.responder],
  )

  useOptionHotkeys(optionIds, escolher, Boolean(q) && !revelada && s?.status === 'rodando')

  // Enter / espaço avançam depois do feedback.
  useEffect(() => {
    if (!revelada) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      qm.avancar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [revelada, qm.avancar])

  useEffect(() => {
    if (!revelada) return
    const suave = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    feedbackRef.current?.scrollIntoView?.({ behavior: suave ? 'smooth' : 'auto', block: 'nearest' })
  }, [revelada])

  if (!s || !q || s.status === 'encerrada') {
    return (
      <div className="apurando">
        <h1>{t('qm.loading')}</h1>
      </div>
    )
  }

  const restante = restanteMs(s, qm.agora)
  const gasto = revelada ? revelada.elapsedMs : Math.max(0, qm.agora - s.questaoIniciadaEm)
  const passou = gasto > q.alvoMs
  const decorrido = Math.min(100, (gasto / q.alvoMs) * 100)
  const escolhida = revelada?.chosenId ?? null
  const opcaoEscolhida = q.opcoes.find((o) => o.id === escolhida)
  const rotulo = s.bloco ? tx(SUBSKILL_LABEL[q.subskill]) : t('qm.warmup')

  return (
    <>
      <div className="barra-sessao">
        <span
          className="relogio"
          role="timer"
          aria-live="off"
          aria-label={t('qm.timeLeft', { time: formatClock(restante) })}
        >
          {formatClock(restante)}
        </span>
        <span className="contador">{rotulo}</span>
        <button className="encerrar" onClick={guarda.pedir} type="button">
          {t('qm.finish')}
        </button>
      </div>

      <div className={`progresso${passou ? ' urgente' : ''}`} aria-hidden="true">
        <i style={{ width: `${decorrido}%` }} />
      </div>

      <div className="questao" key={q.id}>
        <p
          id="enunciado"
          data-testid="qm-enunciado"
          className={`enunciado${tx(q.enunciado).length > 80 ? ' longo' : ''}`}
        >
          {tx(q.enunciado)}
        </p>

        <div className="opcoes curtas" role="radiogroup" aria-labelledby="enunciado">
          {q.opcoes.map((o, i) => {
            const letra = LETRAS[i] ?? ''
            const certa = o.id === q.answerId
            const marcada = o.id === escolhida
            const classe = revelada ? (certa ? ' certa' : marcada ? ' errada' : '') : ''
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                className={`opcao${classe}`}
                onClick={() => escolher(o.id)}
                disabled={Boolean(revelada)}
                aria-checked={marcada}
                aria-keyshortcuts={`${letra} ${i + 1}`}
              >
                <span className="tecla" aria-hidden="true">
                  {letra}
                </span>
                <span className="rotulo">{tx(o.texto)}</span>
              </button>
            )
          })}
        </div>

        {revelada && (
          <div className="feedback" ref={feedbackRef}>
            <p
              className={`veredito ${revelada.correta ? 'acerto' : 'erro'}`}
              role="status"
              aria-live="assertive"
              aria-atomic="true"
            >
              {revelada.correta ? t('qm.correct') : t('qm.incorrect')}
            </p>
            {!revelada.correta && opcaoEscolhida?.erro && (
              <p>{t('qm.slip', { erro: tx(opcaoEscolhida.erro) })}</p>
            )}
            <p>{tx(q.atalho)}</p>
          </div>
        )}
      </div>

      <div className="barra-acao">
        {revelada ? (
          <button className="btn bloco" type="button" onClick={qm.avancar} autoFocus>
            {t('qm.next')}
          </button>
        ) : (
          <button className="btn fantasma bloco" type="button" onClick={() => qm.responder(null)}>
            {t('qm.skip')}
          </button>
        )}
      </div>

      <Confirmacao
        aberto={guarda.pedindo}
        titulo={t('qm.confirm.title')}
        corpo={t('qm.confirm.body')}
        confirmar={t('qm.confirm.yes')}
        cancelar={t('qm.confirm.no')}
        tom="perigo"
        onConfirmar={guarda.confirmar}
        onCancelar={guarda.cancelar}
      />
    </>
  )
}
