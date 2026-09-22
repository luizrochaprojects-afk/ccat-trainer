import { useEffect, useRef } from 'react'

/**
 * Confirmação destrutiva sobre o `<dialog>` nativo.
 *
 * `window.confirm` está fora de questão: numa WebView ele bloqueia a thread e
 * congela o relógio na tela — exatamente no momento em que a pessoa está
 * decidindo se abandona uma prova cronometrada.
 *
 * O `<dialog>` com `showModal()` traz de graça o que uma implementação caseira
 * erraria: armadilha de foco, `Esc`, `::backdrop` e inertização do fundo.
 */
export function Confirmacao({
  aberto,
  titulo,
  corpo,
  confirmar,
  cancelar,
  tom = 'neutro',
  onConfirmar,
  onCancelar,
}: {
  aberto: boolean
  titulo: string
  corpo: string
  confirmar: string
  cancelar: string
  tom?: 'neutro' | 'perigo'
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const recuar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (aberto && !d.open) {
      d.showModal()
      // `showModal` dá o foco ao primeiro elemento focável, que aqui é a ação
      // destrutiva — um toque apressado no lugar errado encerraria a prova.
      // O `autoFocus` do React não resolve: ele só age na montagem, e o
      // diálogo já estava montado, fechado. Então o foco é movido à mão.
      recuar.current?.focus()
    }
    if (!aberto && d.open) d.close()
  }, [aberto])

  // `Esc` fecha o diálogo por conta do browser; o evento `cancel` é o único
  // lugar onde isso dá para observar, e sem ele o estado do React ficaria
  // dizendo "aberto" com a tela já fechada.
  useEffect(() => {
    const d = ref.current
    if (!d) return
    const aoCancelar = (e: Event) => {
      e.preventDefault()
      onCancelar()
    }
    d.addEventListener('cancel', aoCancelar)
    return () => d.removeEventListener('cancel', aoCancelar)
  }, [onCancelar])

  return (
    <dialog className="confirmacao" ref={ref} aria-labelledby="confirmacao-titulo">
      <h2 id="confirmacao-titulo">{titulo}</h2>
      <p>{corpo}</p>
      <div className="btn-linha">
        <button
          className={`btn${tom === 'perigo' ? ' perigo' : ''}`}
          type="button"
          onClick={onConfirmar}
        >
          {confirmar}
        </button>
        {/* O botão de recuar leva o foco inicial: numa ação destrutiva, o
            default de um toque apressado tem de ser não fazer nada. */}
        <button className="btn secundario" type="button" onClick={onCancelar} ref={recuar}>
          {cancelar}
        </button>
      </div>
    </dialog>
  )
}
