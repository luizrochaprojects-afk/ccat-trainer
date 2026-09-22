import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useGuardaDeSaida } from './useBotaoVoltar'

function Sessao({ aoSair }: { aoSair: () => void }) {
  const guarda = useGuardaDeSaida(aoSair)
  return (
    <>
      <p>prova em andamento</p>
      <Link to="/">sair pela navegação</Link>
      <button type="button" onClick={guarda.pedir}>
        encerrar
      </button>
      {guarda.pedindo && (
        <div role="alertdialog">
          <button type="button" onClick={guarda.confirmar}>
            confirmar
          </button>
          <button type="button" onClick={guarda.cancelar}>
            voltar à prova
          </button>
        </div>
      )}
    </>
  )
}

function montar(aoSair = vi.fn()) {
  const router = createMemoryRouter(
    [
      { path: '/sessao', element: <Sessao aoSair={aoSair} /> },
      { path: '/', element: <p>home</p> },
      { path: '/resultado', element: <p>resultado</p> },
    ],
    { initialEntries: ['/sessao'] },
  )
  render(<RouterProvider router={router} />)
  return { aoSair, router }
}

describe('useGuardaDeSaida', () => {
  it('intercepta a navegação para fora da prova', async () => {
    const user = userEvent.setup()
    const { aoSair } = montar()

    await user.click(screen.getByRole('link', { name: 'sair pela navegação' }))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('prova em andamento')).toBeInTheDocument()
    expect(aoSair).not.toHaveBeenCalled()
  })

  it('cancelar devolve a pessoa à prova', async () => {
    const user = userEvent.setup()
    const { aoSair } = montar()

    await user.click(screen.getByRole('link', { name: 'sair pela navegação' }))
    await user.click(screen.getByRole('button', { name: 'voltar à prova' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('prova em andamento')).toBeInTheDocument()
    expect(aoSair).not.toHaveBeenCalled()
  })

  /**
   * Confirmar encerra a prova — não leva a pessoa para onde ela ia. Quem
   * encerra uma simulação quer a nota do que respondeu, e é a própria sessão
   * que navega para /resultado.
   */
  it('confirmar encerra a prova', async () => {
    const user = userEvent.setup()
    const { aoSair } = montar()

    await user.click(screen.getByRole('link', { name: 'sair pela navegação' }))
    await user.click(screen.getByRole('button', { name: 'confirmar' }))

    expect(aoSair).toHaveBeenCalledTimes(1)
  })

  it('não interfere no caminho normal para o resultado', async () => {
    const { router } = montar()

    await router.navigate('/resultado')

    expect(await screen.findByText('resultado')).toBeInTheDocument()
  })

  it('o botão de encerrar pede confirmação sem navegar', async () => {
    const user = userEvent.setup()
    const { aoSair } = montar()

    await user.click(screen.getByRole('button', { name: 'encerrar' }))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(aoSair).not.toHaveBeenCalled()
  })
})
