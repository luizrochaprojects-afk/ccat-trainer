import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDrill, createExam } from '../../core/session/engine'
import { LocaleProvider } from '../LocaleContext'
import { SessaoProvider } from '../SessionContext'
import { questoesFalsas } from '../test-fixtures'
import { SessionScreen } from './SessionScreen'

// O IndexedDB não existe no jsdom e não é o objeto deste teste: o que importa
// aqui é o que a tela mostra e responde, não o que ela grava.
vi.mock('../../data/db', () => ({
  saveActiveSession: vi.fn(async () => {}),
  clearActiveSession: vi.fn(async () => {}),
  saveSession: vi.fn(async () => 'id-falso'),
}))

function montar(modo: 'drill' | 'exam' = 'drill') {
  const questoes = questoesFalsas(3)
  const inicial =
    modo === 'drill' ? createDrill(questoes, Date.now()) : createExam(questoes, Date.now())

  const router = createMemoryRouter(
    [
      { path: '/sessao', element: <SessionScreen inicial={inicial} /> },
      { path: '/resultado', element: <p>resultado</p> },
      { path: '/', element: <p>home</p> },
    ],
    { initialEntries: ['/sessao'] },
  )

  return render(
    <LocaleProvider>
      <SessaoProvider>
        <RouterProvider router={router} />
      </SessaoProvider>
    </LocaleProvider>,
  )
}

describe('SessionScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('apresenta as alternativas como um grupo de rádio, não como botões soltos', () => {
    montar()
    // `aria-pressed` dizia "botão que fica ligado"; o que existe aqui é uma
    // escolha entre cinco, e é isso que o leitor de tela precisa ouvir.
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('associa o grupo ao enunciado', () => {
    montar()
    expect(screen.getByRole('radiogroup')).toHaveAccessibleName('Pergunta 1')
  })

  it('responde pelo atalho de teclado e marca a alternativa escolhida', async () => {
    const user = userEvent.setup()
    montar()

    await user.keyboard('c')

    const alternativas = screen.getAllByRole('radio')
    expect(alternativas[2]).toHaveAttribute('aria-checked', 'true')
    expect(alternativas[0]).toHaveAttribute('aria-checked', 'false')
  })

  it('no treino revela o veredito e NÃO avança sozinho', async () => {
    const user = userEvent.setup()
    montar('drill')

    await user.click(screen.getAllByRole('radio')[0]!)

    // assertive: com 18 segundos por questão, um anúncio educado seria engolido
    // pela questão seguinte.
    const veredito = screen.getByText('Incorrect')
    expect(veredito).toHaveAttribute('role', 'status')
    expect(veredito).toHaveAttribute('aria-live', 'assertive')

    // continua na mesma questão, esperando o comando de avançar
    expect(screen.getByText('Pergunta 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('no simulado responder avança direto, sem feedback', async () => {
    const user = userEvent.setup()
    montar('exam')

    await user.click(screen.getAllByRole('radio')[0]!)

    expect(screen.getByText('Pergunta 2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('o cronômetro não é uma região que fala sozinha', () => {
    montar()
    // O mostrador muda quatro vezes por segundo; anunciá-lo tornaria o app
    // inutilizável com leitor de tela. Quem fala é a região de marcos.
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off')
  })

  it('encerrar pede confirmação em vez de abandonar a prova em silêncio', async () => {
    const user = userEvent.setup()
    const { container } = montar('exam')

    // Consultado pelo elemento, não pelo papel: um <dialog> fechado não expõe
    // role="dialog", então `getByRole` não serve para afirmar que ele começa
    // fechado — que é justamente metade do que este teste garante.
    const dialogo = container.querySelector('dialog')!
    expect(dialogo).not.toHaveAttribute('open')

    await user.click(screen.getByRole('button', { name: 'End' }))

    expect(dialogo).toHaveAttribute('open')
    // A pessoa precisa saber que o relógio não pausou enquanto ela decide.
    expect(dialogo).toHaveTextContent(/clock keeps running/i)
    // E, acima de tudo: continua na prova. Antes, este clique a encerrava.
    expect(screen.getByText('Pergunta 1')).toBeInTheDocument()
  })

  it('cancelar a confirmação devolve a pessoa à prova', async () => {
    const user = userEvent.setup()
    const { container } = montar('exam')

    await user.click(screen.getByRole('button', { name: 'End' }))
    await user.click(screen.getByRole('button', { name: 'Keep going' }))

    expect(container.querySelector('dialog')).not.toHaveAttribute('open')
    expect(screen.getByText('Pergunta 1')).toBeInTheDocument()
  })
})
