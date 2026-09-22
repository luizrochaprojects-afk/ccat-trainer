import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Carregamento assíncrono como união discriminada.
 *
 * O ponto não é o hook: é o tipo. Antes cada tela tinha um par
 * `useState<X | null>` + `useState<erro>`, e nada impedia o estado ilegítimo
 * "carregando E com erro" — nem obrigava a tela a tratar o caso vazio. Com uma
 * união, `strict` transforma "esqueci um estado" em erro de compilação.
 */
export type Recurso<T> =
  | { fase: 'carregando' }
  | { fase: 'pronto'; dado: T }
  | { fase: 'vazio' }
  | { fase: 'erro'; erro: Error }

export interface UsoRecurso<T> {
  estado: Recurso<T>
  recarregar: () => void
}

export function useRecurso<T>(
  carregar: () => Promise<T>,
  opcoes: { vazioSe?: (dado: T) => boolean } = {},
): UsoRecurso<T> {
  const [estado, setEstado] = useState<Recurso<T>>({ fase: 'carregando' })
  const [tentativa, setTentativa] = useState(0)

  // Guardadas em ref para que uma função inline no corpo do componente não
  // recarregue o recurso a cada render.
  const carregarRef = useRef(carregar)
  carregarRef.current = carregar
  const vazioSeRef = useRef(opcoes.vazioSe)
  vazioSeRef.current = opcoes.vazioSe

  useEffect(() => {
    let vivo = true
    setEstado({ fase: 'carregando' })

    void carregarRef.current().then(
      (dado) => {
        if (!vivo) return
        const vazio = vazioSeRef.current?.(dado) ?? false
        setEstado(vazio ? { fase: 'vazio' } : { fase: 'pronto', dado })
      },
      (e: unknown) => {
        if (!vivo) return
        setEstado({ fase: 'erro', erro: e instanceof Error ? e : new Error(String(e)) })
      },
    )

    return () => {
      vivo = false
    }
  }, [tentativa])

  const recarregar = useCallback(() => setTentativa((n) => n + 1), [])

  return { estado, recarregar }
}
