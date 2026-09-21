import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Question } from '../../core/schema'
import { composeDrill } from '../../core/session/compose'
import { createDrill, type SessionState } from '../../core/session/engine'
import {
  DRILL_PER_QUESTION_MS,
  SUBTIPO_LABEL,
  TIPOS,
  TIPO_LABEL,
  type AnySubtipo,
  type Tipo,
} from '../../core/taxonomy'
import { loadFullBank, subtiposDisponiveis } from '../../data/bank'
import { seenQuestionIds } from '../../data/db'

const QUANTIDADES = [10, 15, 20, 30]

export function DrillSetupScreen({ onStart }: { onStart: (s: SessionState, meta: { tipo: string; subtipo?: string }) => void }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [banco, setBanco] = useState<Question[] | null>(null)
  const [tipo, setTipo] = useState<Tipo>((params.get('tipo') as Tipo) ?? 'spatial')
  const [subtipo, setSubtipo] = useState<string>('')
  const [quantidade, setQuantidade] = useState(15)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    void loadFullBank()
      .then(setBanco)
      .catch((e: Error) => setErro(e.message))
  }, [])

  // Trocar de tipo invalida o subtipo escolhido.
  useEffect(() => setSubtipo(''), [tipo])

  if (erro) return <div className="aviso">Não consegui carregar o banco: {erro}</div>
  if (!banco) return <p className="legenda">Carregando o banco de questões…</p>

  const subtipos = subtiposDisponiveis(banco, tipo)
  const disponiveis = banco.filter(
    (q) => q.tipo === tipo && (!subtipo || q.subtipo === subtipo),
  ).length

  const comecar = async () => {
    const vistas = await seenQuestionIds()
    const fila = composeDrill(banco, {
      tipo,
      ...(subtipo ? { subtipo } : {}),
      count: Math.min(quantidade, disponiveis),
      seen: vistas,
    })
    if (fila.length === 0) {
      setErro('Não há questões suficientes para essa combinação.')
      return
    }
    onStart(createDrill(fila, Date.now()), { tipo, ...(subtipo ? { subtipo } : {}) })
    navigate('/sessao')
  }

  return (
    <>
      <h1>Prática por tipo</h1>
      <p className="lead">
        Cronômetro de {DRILL_PER_QUESTION_MS / 1000} segundos por questão — o ritmo real da prova.
        Estourou, a questão conta como não respondida e o treino segue. Feedback e explicação
        logo após cada resposta.
      </p>

      <label className="campo">
        <span>Tipo</span>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {TIPO_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <div className="campo">
        <span>Subtipo</span>
        <div className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={subtipo === ''}
            onClick={() => setSubtipo('')}
          >
            Todos
          </button>
          {subtipos.map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              aria-pressed={subtipo === s}
              onClick={() => setSubtipo(s)}
            >
              {SUBTIPO_LABEL[s as AnySubtipo] ?? s}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span>Quantas questões</span>
        <div className="chips">
          {QUANTIDADES.map((n) => (
            <button
              key={n}
              type="button"
              className="chip"
              aria-pressed={quantidade === n}
              onClick={() => setQuantidade(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <p className="legenda">
        {disponiveis} questões disponíveis nessa combinação
        {disponiveis < quantidade && ` — o treino terá ${disponiveis}`}.
      </p>

      <div className="btn-linha">
        <button className="btn" type="button" onClick={() => void comecar()} disabled={disponiveis === 0}>
          Começar treino
        </button>
      </div>
    </>
  )
}
