import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../LocaleContext'
import { QuickMathSessionRoute } from './QuickMathSessionScreen'

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

/** Por padrão entra na sessão por PUSH, como o botão da tela do modo faz. */
function montar(entrada: 'push' | 'pop' = 'push') {
  const router = createMemoryRouter(
    [
      { path: '/quickmath/sessao', element: <QuickMathSessionRoute /> },
      { path: '/quickmath/resultado', element: <p>resultado</p> },
      { path: '/quickmath', element: <p>quickmath</p> },
    ],
    { initialEntries: [entrada === 'pop' ? '/quickmath/sessao' : '/quickmath'] },
  )
  const r = render(
    <LocaleProvider>
      <RouterProvider router={router} />
    </LocaleProvider>,
  )
  if (entrada === 'push') void router.navigate('/quickmath/sessao')
  return r
}

describe('QuickMathSessionScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('chegar pela história (F5, Voltar do resultado) leva à tela do modo, sem abrir sessão', async () => {
    montar('pop')
    expect(await screen.findByText('quickmath')).toBeInTheDocument()
    expect(salvarSessaoQm).not.toHaveBeenCalled()
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
