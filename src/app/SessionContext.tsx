import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { SessionState } from '../core/session/engine'

/**
 * A sessão pendente, acima das rotas.
 *
 * Antes isto era um `useState` no Shell, passado por prop `onStart`. Com o
 * router de dados (`createHashRouter`) as rotas viram objeto e não recebem mais
 * props por closure — então a sessão precisa de um contexto.
 *
 * A regra que não pode mudar: iniciar uma prova compõe o `SessionState` UMA
 * vez, aqui; navegar para /sessao não pode recompor a fila nem reiniciar o
 * relógio.
 */
export interface SessaoPendente {
  state: SessionState
  meta: { tipo?: string; subtipo?: string }
}

interface Contexto {
  sessao: SessaoPendente | null
  iniciar: (state: SessionState, meta?: { tipo?: string; subtipo?: string }) => void
  descartar: () => void
}

const SessaoContext = createContext<Contexto | null>(null)

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<SessaoPendente | null>(null)

  const valor = useMemo<Contexto>(
    () => ({
      sessao,
      iniciar: (state, meta = {}) => setSessao({ state, meta }),
      descartar: () => setSessao(null),
    }),
    [sessao],
  )

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>
}

export function useSessaoPendente(): Contexto {
  const ctx = useContext(SessaoContext)
  if (!ctx) throw new Error('useSessaoPendente fora de <SessaoProvider>')
  return ctx
}
