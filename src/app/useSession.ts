import { useCallback, useEffect, useRef, useState } from 'react'
import {
  answer as responder,
  finish,
  isFinished,
  tick,
  type SessionState,
} from '../core/session/engine'
import { scoreSession, type SessionScore } from '../core/session/score'
import { clearActiveSession, saveActiveSession, saveSession } from '../data/db'

/**
 * Cola o motor de sessão na UI.
 *
 * Três responsabilidades que não cabem no reducer puro:
 *  1. rodar o relógio (requestAnimationFrame);
 *  2. persistir a sessão em andamento, para o F5 não perder a prova;
 *  3. gravar o resultado quando ela termina.
 *
 * O rAF só REDESENHA. A verdade do tempo é sempre `Date.now() - startedAt`,
 * então uma aba em segundo plano (onde o rAF congela) volta já com o tempo
 * correto descontado, em vez de ganhar minutos de brinde.
 */
export interface UseSession {
  state: SessionState
  /** instante para a UI desenhar o relógio — ver a nota sobre re-render abaixo */
  now: number
  score: SessionScore | null
  savedId: string | null
  answer: (optionId: string | null) => void
  abandon: () => void
  /** força a gravação da sessão em andamento — ver `useSalvarAoSair` */
  salvarAgora: () => void
}

/**
 * Cadência de redesenho do relógio. O mostrador tem resolução de segundo;
 * redesenhar a 60fps só queimaria bateria.
 */
const CADENCIA_RELOGIO_MS = 250

export function useSession(
  inicial: SessionState,
  meta: { tipo?: string; subtipo?: string } = {},
): UseSession {
  const [state, setState] = useState<SessionState>(inicial)
  const [now, setNow] = useState(() => Date.now())
  const [savedId, setSavedId] = useState<string | null>(null)
  const gravado = useRef(false)

  // --- relógio ---------------------------------------------------------------
  useEffect(() => {
    if (isFinished(state)) return
    let vivo = true
    let frame = 0

    const bater = () => {
      const t = Date.now()

      // `tick` devolve a MESMA referência quando nada venceu — é o que mantém
      // o reducer idempotente. A consequência é que ele sozinho nunca provoca
      // re-render, e o cronômetro ficaria congelado na tela. Por isso o
      // instante de desenho é um estado separado, atualizado em cadência
      // própria.
      setState((atual) => (isFinished(atual) ? atual : tick(atual, t)))
      setNow((anterior) =>
        Math.floor(t / CADENCIA_RELOGIO_MS) !== Math.floor(anterior / CADENCIA_RELOGIO_MS)
          ? t
          : anterior,
      )
    }

    const loop = () => {
      if (!vivo) return
      bater()
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    // rAF é suspenso em aba de segundo plano. Sem este fallback, uma prova
    // deixada em outra aba só descobriria que o tempo acabou quando o usuário
    // voltasse. O `setInterval` continua rodando (o navegador o limita a ~1Hz,
    // que é exatamente a resolução de que o cronômetro precisa).
    const intervalo = window.setInterval(bater, 1000)

    // E ao voltar para a aba, bate na hora em vez de esperar o próximo tique.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') bater()
    }
    document.addEventListener('visibilitychange', aoVoltar)

    return () => {
      vivo = false
      cancelAnimationFrame(frame)
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [state.status])

  // --- persistência da sessão em andamento -----------------------------------
  useEffect(() => {
    if (isFinished(state)) return
    void saveActiveSession(state)
    // Só depende do índice: gravar a cada frame do rAF seria escrita inútil no
    // IndexedDB 60 vezes por segundo. O que muda de fato é a questão atual, e
    // o relógio é reconstruído a partir de startedAt.
  }, [state.index, state.status])

  // --- gravação do resultado -------------------------------------------------
  const [score, setScore] = useState<SessionScore | null>(null)

  useEffect(() => {
    if (!isFinished(state) || gravado.current) return
    gravado.current = true

    const apuracao = scoreSession(state, Date.now())
    setScore(apuracao)

    void (async () => {
      const id = await saveSession(state, apuracao, meta)
      await clearActiveSession()
      setSavedId(id)
    })()
  }, [state.status])

  const answer = useCallback((optionId: string | null) => {
    setState((atual) => (isFinished(atual) ? atual : responder(atual, optionId, Date.now())))
  }, [])

  // O estado mais recente, para quem precisa lê-lo fora do ciclo de render
  // (o SO avisando que vai matar o app não espera um re-render).
  const stateRef = useRef(state)
  stateRef.current = state

  const salvarAgora = useCallback(() => {
    const atual = stateRef.current
    if (!isFinished(atual)) void saveActiveSession(atual)
  }, [])

  const abandon = useCallback(() => {
    setState((atual) => finish(atual, Date.now()))
  }, [])

  return { state, now, score, savedId, answer, abandon, salvarAgora }
}

/** Atalhos de teclado A–E e 1–5 (PRD §6). */
export function useOptionHotkeys(
  optionIds: string[],
  onPick: (id: string) => void,
  ativo: boolean,
): void {
  useEffect(() => {
    if (!ativo) return

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const alvo = e.target as HTMLElement | null
      if (alvo && ['INPUT', 'SELECT', 'TEXTAREA'].includes(alvo.tagName)) return

      const tecla = e.key.toLowerCase()
      const porLetra = 'abcde'.indexOf(tecla)
      const porNumero = '12345'.indexOf(tecla)
      const indice = porLetra >= 0 ? porLetra : porNumero

      const id = indice >= 0 ? optionIds[indice] : undefined
      if (!id) return

      e.preventDefault()
      onPick(id)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [optionIds.join('|'), onPick, ativo])
}
