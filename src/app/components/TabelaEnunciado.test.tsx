import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Question, StemTable } from '../../core/schema'
import { createDrill } from '../../core/session/engine'
import { LocaleProvider } from '../LocaleContext'
import { SessaoProvider } from '../SessionContext'
import { SessionScreen } from '../screens/SessionScreen'
import { questaoFalsa } from '../test-fixtures'
import { TabelaEnunciado } from './TabelaEnunciado'

vi.mock('../../data/db', () => ({
  saveActiveSession: vi.fn(async () => {}),
  clearActiveSession: vi.fn(async () => {}),
  saveSession: vi.fn(async () => 'id-falso'),
}))

const DADOS: StemTable = {
  layout: 'dados',
  caption: 'Monthly sales by store',
  columns: ['Store', 'Employees', 'Sales ($)'],
  rows: [
    ['Oakville', '12', '21,000'],
    ['Westgate', '40', '16,000'],
    ['Bayside', '15', '13,000'],
  ],
}

const COMPARACAO: StemTable = {
  layout: 'comparacao',
  caption: 'Ticket codes',
  columns: ['Row', 'Original', 'Copy'],
  rows: [
    ['1', 'QX7-40B1', 'QX7-4OB1'],
    ['2', 'TKT-48213', 'TKT-48213'],
  ],
}

describe('TabelaEnunciado', () => {
  it('é uma tabela de verdade, nomeada pela legenda', () => {
    render(<TabelaEnunciado tabela={DADOS} />)
    const tabela = screen.getByRole('table', { name: 'Monthly sales by store' })
    expect(tabela.querySelector('caption')).toHaveTextContent('Monthly sales by store')
  })

  it('cabeçalhos de coluna e de linha têm escopo, para o leitor de tela cruzar as células', () => {
    render(<TabelaEnunciado tabela={DADOS} />)
    const colunas = screen.getAllByRole('columnheader')
    expect(colunas.map((c) => c.textContent)).toEqual(['Store', 'Employees', 'Sales ($)'])
    for (const c of colunas) expect(c).toHaveAttribute('scope', 'col')

    const linhas = screen.getAllByRole('rowheader')
    expect(linhas.map((c) => c.textContent)).toEqual(['Oakville', 'Westgate', 'Bayside'])
    for (const l of linhas) expect(l).toHaveAttribute('scope', 'row')
  })

  it('na tabela de dados os números saem alinhados à direita (classe n)', () => {
    render(<TabelaEnunciado tabela={DADOS} />)
    const celula = screen.getByRole('cell', { name: '21,000' })
    expect(celula).toHaveClass('n')
    expect(screen.getByRole('columnheader', { name: 'Sales ($)' })).toHaveClass('n')
  })

  it('na comparação as células mostram o texto exato, sem alinhamento numérico', () => {
    const { container } = render(<TabelaEnunciado tabela={COMPARACAO} />)
    expect(container.firstElementChild).toHaveClass('tabela-enunciado', 'comparacao')
    const linha1 = screen.getAllByRole('row')[1]!
    const [original, copia] = within(linha1).getAllByRole('cell')
    expect(original).toHaveTextContent('QX7-40B1')
    expect(copia).toHaveTextContent('QX7-4OB1')
    expect(original).not.toHaveClass('n')
    expect(within(linha1).getByRole('rowheader')).toHaveTextContent('1')
  })
})

describe('SessionScreen com tabela no enunciado', () => {
  function montar(questoes: Question[]) {
    const router = createMemoryRouter(
      [
        { path: '/sessao', element: <SessionScreen inicial={createDrill(questoes, Date.now())} /> },
        { path: '/resultado', element: <p>resultado</p> },
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

  it('mostra a tabela ANTES da pergunta e as alternativas curtas em grade', () => {
    const q: Question = {
      ...questaoFalsa(1),
      tipo: 'math_word',
      subtipo: 'tabela',
      stem: 'Which store had the highest sales per employee?',
      stemTable: DADOS,
      options: DADOS.rows.map((r, i) => ({ id: `o${i}`, text: r[0]! })).concat(
        { id: 'o3', text: 'Lakeview' },
        { id: 'o4', text: 'Fairview' },
      ),
      answerId: 'o0',
    }
    const { container } = montar([q])

    const tabela = screen.getByRole('table', { name: 'Monthly sales by store' })
    const enunciado = container.querySelector('#enunciado')!
    expect(enunciado).toHaveTextContent('highest sales per employee')
    expect(tabela.compareDocumentPosition(enunciado) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    expect(screen.getByRole('radiogroup')).toHaveClass('curtas')
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('sem tabela, nada muda: nem tabela, nem grade', () => {
    montar([questaoFalsa(1)])
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup')).not.toHaveClass('curtas')
  })
})
