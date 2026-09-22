import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRecurso } from './useRecurso'

describe('useRecurso', () => {
  it('começa carregando e chega a pronto', async () => {
    const { result } = renderHook(() => useRecurso(async () => [1, 2, 3]))

    expect(result.current.estado.fase).toBe('carregando')
    await waitFor(() => expect(result.current.estado.fase).toBe('pronto'))
    expect(result.current.estado).toEqual({ fase: 'pronto', dado: [1, 2, 3] })
  })

  it('distingue vazio de pronto quando o chamador diz o que é vazio', async () => {
    const { result } = renderHook(() =>
      useRecurso(async () => [] as number[], { vazioSe: (d) => d.length === 0 }),
    )

    await waitFor(() => expect(result.current.estado.fase).toBe('vazio'))
  })

  it('leva a falha até o estado de erro, sem engolir a mensagem', async () => {
    const { result } = renderHook(() =>
      useRecurso(async () => {
        throw new Error('banco fora do ar')
      }),
    )

    await waitFor(() => expect(result.current.estado.fase).toBe('erro'))
    if (result.current.estado.fase !== 'erro') throw new Error('estado inesperado')
    expect(result.current.estado.erro.message).toBe('banco fora do ar')
  })

  it('embrulha rejeição que não é Error, para a tela nunca renderizar undefined', async () => {
    const { result } = renderHook(() => useRecurso(async () => Promise.reject('texto cru')))

    await waitFor(() => expect(result.current.estado.fase).toBe('erro'))
    if (result.current.estado.fase !== 'erro') throw new Error('estado inesperado')
    expect(result.current.estado.erro.message).toBe('texto cru')
  })

  it('recarregar tenta de novo — é o que tira o erro do beco sem saída', async () => {
    let tentativa = 0
    const carregar = vi.fn(async () => {
      tentativa += 1
      if (tentativa === 1) throw new Error('primeira falha')
      return 'enfim'
    })

    const { result } = renderHook(() => useRecurso(carregar))

    await waitFor(() => expect(result.current.estado.fase).toBe('erro'))
    act(() => result.current.recarregar())
    await waitFor(() => expect(result.current.estado.fase).toBe('pronto'))
    expect(carregar).toHaveBeenCalledTimes(2)
  })

  /**
   * A armadilha que o hook existe para evitar: a função de carga costuma ser
   * escrita inline no corpo do componente, com identidade nova a cada render.
   * Se ela entrasse nas dependências do efeito, o recurso recarregaria em laço.
   */
  it('não recarrega quando a função de carga muda de identidade', async () => {
    const carregar = vi.fn(async () => 'x')
    const { result, rerender } = renderHook(() => useRecurso(() => carregar()))

    await waitFor(() => expect(result.current.estado.fase).toBe('pronto'))
    rerender()
    rerender()

    expect(carregar).toHaveBeenCalledTimes(1)
  })
})
