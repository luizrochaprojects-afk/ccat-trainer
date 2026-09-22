import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { composeExam } from '../core/session/compose'
import { createExam } from '../core/session/engine'
import { loadFullBank } from '../data/bank'
import { seenQuestionIds } from '../data/db'
import { useSessaoPendente } from './SessionContext'

/**
 * Compor e começar um simulado completo.
 *
 * Vive fora das telas porque duas delas oferecem essa ação: a Home e o
 * resultado — quem acabou de terminar uma prova quer outra, não voltar ao
 * início. Duplicar a composição em dois lugares seria duplicar também a
 * chance de esquecer o filtro de questões já vistas.
 */
export function useIniciarSimulado(): {
  iniciando: boolean
  erro: string | null
  comecar: () => void
} {
  const navigate = useNavigate()
  const { iniciar } = useSessaoPendente()
  const [iniciando, setIniciando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const comecar = useCallback(() => {
    setIniciando(true)
    setErro(null)
    void (async () => {
      try {
        const [banco, vistas] = await Promise.all([loadFullBank(), seenQuestionIds()])
        iniciar(createExam(composeExam(banco, { seen: vistas }), Date.now()))
        navigate('/sessao')
      } catch (e) {
        setErro((e as Error).message)
        setIniciando(false)
      }
    })()
  }, [iniciar, navigate])

  return { iniciando, erro, comecar }
}
