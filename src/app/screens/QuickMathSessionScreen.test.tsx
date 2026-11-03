import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../LocaleContext'
import { QuickMathSessionScreen } from './QuickMathSessionScreen'

const { salvarResposta, salvarNiveis, salvarSessaoQm } = vi.hoisted(() => ({
  salvarResposta: vi.fn(async () => {}),
  salvarNiveis: vi.fn(async () => {}),
  salvarSessaoQm: vi.fn(async () => {}),
}))

// O IndexedDB não existe no jsdom; o que se testa é o que a tela mostra e o
// que ela manda gravar.
vi.mock('../../data/quickmath', () => ({
  carregarHistorico: vi.fn(async () => []),
  carregarNiveis: vi.fn(async () => ({})),
  salvarResposta,
  salvarNiveis,
  salvarSessaoQm,
}))

function montar() {
  const router = createMemoryRouter(
    [
      { path: '/quickmath/sessao', element: <QuickMathSessionScreen /> },
      { path: '/quickmath/resultado', element: <p>resultado</p> },
      { path: '/quickmath', element: <p>quickmath</p> },
    ],
    { initialEntries: ['/quickmath/sessao'] },
  )
  return render(
    <LocaleProvider>
      <RouterProvider router={router} />
    </LocaleProvider>,
  )
}

describe('QuickMathSessionScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('mostra a questão com 5 alternativas e o relógio da sessão', async () => {
    montar()
    expect(await screen.findAllByRole('radio')).toHaveLength(5)
    expect(screen.getByRole('timer')).toHaveTextContent('15:00')
  })

  it('responder revela o feedback com o atalho e grava a resposta', async () => {
    const user = userEvent.setup()
    montar()
    await user.click((await screen.findAllByRole('radio'))[0]!)
    expect(screen.getByText(/^(Correct|Incorrect)$/)).toBeInTheDocument()
    expect(salvarResposta).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('Próxima traz outra questão', async () => {
    const user = userEvent.setup()
    montar()
    const antes = (await screen.findByTestId('qm-enunciado')).textContent
    await user.click(screen.getAllByRole('radio')[0]!)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByTestId('qm-enunciado').textContent).not.toBe(antes)
    expect(screen.queryByText(/^(Correct|Incorrect)$/)).not.toBeInTheDocument()
  })

  it('pular conta como resposta gravada', async () => {
    const user = userEvent.setup()
    montar()
    await screen.findAllByRole('radio')
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(salvarResposta).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Incorrect')).toBeInTheDocument()
  })
})
