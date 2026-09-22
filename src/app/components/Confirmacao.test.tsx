import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Confirmacao } from './Confirmacao'

function Palco({
  onConfirmar = vi.fn(),
  onCancelar = vi.fn(),
}: {
  onConfirmar?: () => void
  onCancelar?: () => void
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}>
        abrir
      </button>
      <Confirmacao
        aberto={aberto}
        titulo="Encerrar a prova?"
        corpo="O relógio continua correndo."
        confirmar="Encerrar"
        cancelar="Continuar"
        tom="perigo"
        onConfirmar={() => {
          setAberto(false)
          onConfirmar()
        }}
        onCancelar={() => {
          setAberto(false)
          onCancelar()
        }}
      />
    </>
  )
}

describe('Confirmacao', () => {
  it('nasce fechada e abre sob comando', async () => {
    const user = userEvent.setup()
    const { container } = render(<Palco />)
    const dialogo = container.querySelector('dialog')!

    expect(dialogo).not.toHaveAttribute('open')
    await user.click(screen.getByRole('button', { name: 'abrir' }))
    expect(dialogo).toHaveAttribute('open')
  })

  /**
   * A regressão que este teste tranca: `showModal` dá o foco ao primeiro
   * elemento focável, que é a ação destrutiva. Num diálogo que pergunta se
   * pode destruir algo, o default de um Enter apressado tem de ser NÃO.
   */
  it('põe o foco em recuar, nunca na ação destrutiva', async () => {
    const user = userEvent.setup()
    render(<Palco />)

    await user.click(screen.getByRole('button', { name: 'abrir' }))

    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Encerrar' })).not.toHaveFocus()
  })

  it('confirmar e cancelar chamam o que devem', async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    const onCancelar = vi.fn()
    render(<Palco onConfirmar={onConfirmar} onCancelar={onCancelar} />)

    await user.click(screen.getByRole('button', { name: 'abrir' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(onCancelar).toHaveBeenCalledTimes(1)
    expect(onConfirmar).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'abrir' }))
    await user.click(screen.getByRole('button', { name: 'Encerrar' }))
    expect(onConfirmar).toHaveBeenCalledTimes(1)
  })

  it('anuncia o próprio título', async () => {
    const user = userEvent.setup()
    render(<Palco />)

    await user.click(screen.getByRole('button', { name: 'abrir' }))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Encerrar a prova?')
  })
})
