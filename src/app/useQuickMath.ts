import { useCallback, useEffect, useRef, useState } from 'react'
import type { OptionId } from '../core/optionIds'
import {
  avancar as avancarSessao,
  criarSessao,
  encerrar as encerrarSessao,
  responder as responderSessao,
  resumir,
  type QmResumoLinha,
  type QmSessao,
} from '../core/quickmath/sessao'
import {
  carregarHistorico,
  carregarNiveis,
  salvarNiveis,
  salvarResposta,
  salvarSessaoQm,
} from '../data/quickmath'

/**
 * Cola o reducer da sessão de Quick Math na UI: carrega histórico e níveis,
 * roda o relógio e grava o que sai.
 *
 * As gravações vivem em efeitos, não nos callbacks: o updater do `setState`
 * pode rodar duas vezes no StrictMode, e uma resposta gravada em dobro
 * distorceria a seleção adaptativa.
 */
export interface UseQuickMath {
  sessao: QmSessao | null
  agora: number
  /** preenchido quando a sessão encerra e o resumo está gravado */
  resumo: QmResumoLinha[] | null
  responder: (id: OptionId | null) => void
  avancar: () => void
  encerrar: () => void
}

const CADENCIA_RELOGIO_MS = 250

export function useQuickMath(): UseQuickMath {
  const [sessao, setSessao] = useState<QmSessao | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [resumo, setResumo] = useState<QmResumoLinha[] | null>(null)

  // --- montagem --------------------------------------------------------------
  useEffect(() => {
    let vivo = true
    void (async () => {
      const [historico, niveis] = await Promise.all([carregarHistorico(), carregarNiveis()])
      if (!vivo) return
      const t = Date.now()
      setAgora(t)
      setSessao(criarSessao({ seed: t >>> 0, agora: t, niveis, historico }))
    })()
    return () => {
      vivo = false
    }
  }, [])

  // --- relógio ---------------------------------------------------------------
  const status = sessao?.status
  useEffect(() => {
    if (status !== 'rodando') return
    const id = window.setInterval(() => setAgora(Date.now()), CADENCIA_RELOGIO_MS)
    return () => window.clearInterval(id)
  }, [status])

  // --- gravação das respostas, uma a uma ---------------------------------------
  const gravadas = useRef(0)
  const respostas = sessao?.respostas
  useEffect(() => {
    if (!respostas) return
    for (const r of respostas.slice(gravadas.current)) void salvarResposta(r)
    gravadas.current = respostas.length
  }, [respostas])

  // --- níveis: grava quando um bloco fecha e muda algum ------------------------
  const niveisGravados = useRef<string | null>(null)
  const niveis = sessao?.niveis
  useEffect(() => {
    if (!niveis) return
    const chave = JSON.stringify(niveis)
    if (niveisGravados.current !== null && niveisGravados.current !== chave) void salvarNiveis(niveis)
    niveisGravados.current = chave
  }, [niveis])

  // --- encerramento ------------------------------------------------------------
  useEffect(() => {
    if (!sessao || sessao.status !== 'encerrada' || resumo) return
    const linhas = resumir(sessao)
    void (async () => {
      await salvarSessaoQm({
        id: sessao.id,
        startedAt: sessao.startedAt,
        encerradaEm: sessao.encerradaEm ?? Date.now(),
        resumo: linhas,
      })
      setResumo(linhas)
    })()
  }, [status])

  const responder = useCallback((id: OptionId | null) => {
    setSessao((s) => (s ? responderSessao(s, id, Date.now()) : s))
  }, [])

  const avancar = useCallback(() => {
    const t = Date.now()
    setAgora(t)
    setSessao((s) => (s ? avancarSessao(s, t) : s))
  }, [])

  const encerrar = useCallback(() => {
    setSessao((s) => (s ? encerrarSessao(s, Date.now()) : s))
  }, [])

  return { sessao, agora, resumo, responder, avancar, encerrar }
}
