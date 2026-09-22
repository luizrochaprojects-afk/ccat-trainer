import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useBlocker } from 'react-router-dom'

/**
 * Guarda de saída da prova.
 *
 * Duas portas levam para fora de uma simulação em andamento e nenhuma delas
 * avisava: o botão físico Voltar do Android e o Voltar do navegador. Sair sem
 * confirmação num app cronometrado é o defeito mais caro que existe aqui — a
 * prova não é recomeçável, o relógio já correu.
 *
 * Os dois caminhos convergem para o MESMO estado e a mesma `<Confirmacao>`,
 * então há um comportamento só para corrigir se estiver errado.
 *
 * Confirmar não significa "vá para onde você ia": significa encerrar a prova e
 * ver o resultado do que foi respondido. Por isso `aoSair` encerra e a
 * navegação bloqueada é descartada — quem encerra uma prova quer a nota, não a
 * tela anterior.
 */
export function useGuardaDeSaida(aoSair: () => void): {
  pedindo: boolean
  pedir: () => void
  confirmar: () => void
  cancelar: () => void
} {
  // A exceção para /resultado é obrigatória: é para lá que a própria sessão
  // navega ao terminar, e sem ela o guarda bloquearia o desfecho normal.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname === '/sessao' && nextLocation.pathname !== '/resultado',
  )

  const [pedido, setPedido] = useState(false)

  /**
   * O Voltar do navegador — a porta que o `useBlocker` NÃO fecha.
   *
   * Medido: com histórico de hash, o bloqueador do react-router intercepta a
   * navegação dentro do app (PUSH) mas deixa o POP passar direto; quando o
   * router fica sabendo, a saída já aconteceu. A prova era abandonada em
   * silêncio.
   *
   * A saída é uma entrada-sentinela: ao entrar na prova empilhamos uma cópia
   * da rota atual. O Voltar consome a sentinela em vez da prova, nós a
   * repomos e pedimos confirmação. O preço é uma entrada extra no histórico,
   * que ninguém percebe; o preço de não fazer isso é perder a prova.
   */
  useEffect(() => {
    history.pushState(null, '', location.href)

    const aoVoltar = () => {
      history.pushState(null, '', location.href)
      setPedido(true)
    }

    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

  /** O botão físico do Android, que não passa por `popstate`. */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let remover: (() => void) | undefined
    let cancelado = false

    void (async () => {
      const { App } = await import('@capacitor/app')
      const handle = await App.addListener('backButton', () => setPedido(true))
      if (cancelado) void handle.remove()
      else remover = () => void handle.remove()
    })()

    return () => {
      cancelado = true
      remover?.()
    }
  }, [])

  const bloqueado = blocker.state === 'blocked'

  const confirmar = useCallback(() => {
    setPedido(false)
    if (bloqueado) blocker.reset?.()
    aoSair()
  }, [bloqueado, blocker, aoSair])

  const cancelar = useCallback(() => {
    setPedido(false)
    if (bloqueado) blocker.reset?.()
  }, [bloqueado, blocker])

  const pedir = useCallback(() => setPedido(true), [])

  return { pedindo: pedido || bloqueado, pedir, confirmar, cancelar }
}

/**
 * Salva a sessão ativa quando o app sai de cena.
 *
 * `useSession` já grava a cada resposta, mas IndexedDB é assíncrono: se o
 * Android mata o processo, a última escrita pode não ter sido confirmada.
 * `pagehide` cobre a web; `appStateChange` cobre o caso em que o Android
 * encerra o processo sem passar por `visibilitychange`.
 */
export function useSalvarAoSair(salvar: () => void): void {
  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') salvar()
    }
    window.addEventListener('pagehide', salvar)
    document.addEventListener('visibilitychange', aoEsconder)

    let remover: (() => void) | undefined
    let cancelado = false

    if (Capacitor.isNativePlatform()) {
      void (async () => {
        const { App } = await import('@capacitor/app')
        const handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) salvar()
        })
        if (cancelado) void handle.remove()
        else remover = () => void handle.remove()
      })()
    }

    return () => {
      cancelado = true
      remover?.()
      window.removeEventListener('pagehide', salvar)
      document.removeEventListener('visibilitychange', aoEsconder)
    }
  }, [salvar])
}
