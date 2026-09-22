import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createExam } from '../../core/session/engine'
import { LocaleProvider } from '../LocaleContext'
import { SessaoProvider } from '../SessionContext'
import { questoesFalsas } from '../test-fixtures'
import { HomeScreen } from './HomeScreen'

const { loadFullBank, loadActiveSession, listSessions, clearActiveSession, indisponivel } =
  vi.hoisted(() => ({
    loadFullBank: vi.fn(),
    loadActiveSession: vi.fn(),
    listSessions: vi.fn(),
    clearActiveSession: vi.fn(),
    indisponivel: vi.fn(() => false),
  }))

vi.mock('../../data/bank', () => ({ loadFullBank }))
// A composição da prova tem regras próprias (cotas por tipo, dificuldade
// crescente) e testes próprios no core. Aqui ela é ruído: o que se verifica
// é o caminho da tela até a sessão.
vi.mock('../../core/session/compose', () => ({
  composeExam: (banco: unknown[]) => banco.slice(0, 50),
}))
vi.mock('../../data/db', () => ({
  loadActiveSession,
  listSessions,
  clearActiveSession,
  seenQuestionIds: vi.fn(async () => new Set<string>()),
  armazenamentoIndisponivel: indisponivel,
}))

function montar() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <HomeScreen /> },
      { path: '/sessao', element: <p>sessão</p> },
    ],
    { initialEntries: ['/'] },
  )
  return render(
    <LocaleProvider>
      <SessaoProvider>
        <RouterProvider router={router} />
      </SessaoProvider>
    </LocaleProvider>,
  )
}

describe('HomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadActiveSession.mockResolvedValue(null)
    listSessions.mockResolvedValue([])
    loadFullBank.mockResolvedValue(questoesFalsas(60))
    indisponivel.mockReturnValue(false)
  })

  it('leva ao simulado quando o banco carrega', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(screen.getByRole('button', { name: /Full mock test/ }))
    await waitFor(() => expect(screen.getByText('sessão')).toBeInTheDocument())
  })

  /**
   * A regressão que este teste tranca: antes, falhar ao carregar o banco
   * mostrava um parágrafo de erro e nada mais — a tela virava um beco, e a
   * única saída era recarregar a página no braço.
   */
  it('oferece uma saída quando o banco falha', async () => {
    const user = userEvent.setup()
    loadFullBank.mockRejectedValueOnce(new Error('rede fora'))
    montar()

    await user.click(screen.getByRole('button', { name: /Full mock test/ }))

    await screen.findByText(/rede fora/)
    const retry = screen.getByRole('button', { name: 'Try again' })

    loadFullBank.mockResolvedValue(questoesFalsas(60))
    await user.click(retry)
    await waitFor(() => expect(screen.getByText('sessão')).toBeInTheDocument())
  })

  /**
   * Com uma prova correndo, retomar é a coisa mais urgente da tela — e por isso
   * o aviso vem ANTES do título, não depois do parágrafo de apresentação.
   */
  it('põe a prova em andamento acima de tudo', async () => {
    loadActiveSession.mockResolvedValue(createExam(questoesFalsas(50), Date.now()))
    const { container } = montar()

    const aviso = await screen.findByText(/Test in progress/)
    const titulo = screen.getByRole('heading', { level: 1 })

    expect(
      aviso.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(container.querySelector('.ato.primario')).toBeNull()
  })

  it('descartar a prova em andamento exige confirmação', async () => {
    const user = userEvent.setup()
    loadActiveSession.mockResolvedValue(createExam(questoesFalsas(50), Date.now()))
    const { container } = montar()

    await user.click(await screen.findByRole('button', { name: 'Discard' }))

    expect(container.querySelector('dialog')).toHaveAttribute('open')
    expect(clearActiveSession).not.toHaveBeenCalled()

    // Há dois botões 'Discard' em cena: o do aviso e o do diálogo. O que
    // executa a ação é o do diálogo.
    const dialogo = container.querySelector('dialog')!
    await user.click(within(dialogo).getByRole('button', { name: 'Discard' }))
    expect(clearActiveSession).toHaveBeenCalled()
  })

  /**
   * Vazio e indisponível pareciam o mesmo estado: com IndexedDB bloqueado, a
   * lista volta vazia e a tela dizia "nenhuma prova ainda" para quem tinha
   * acabado de fazer cinco.
   */
  it('avisa quando o navegador está bloqueando o armazenamento', async () => {
    indisponivel.mockReturnValue(true)
    montar()

    expect(await screen.findByText(/blocking local storage/i)).toBeInTheDocument()
  })
})
