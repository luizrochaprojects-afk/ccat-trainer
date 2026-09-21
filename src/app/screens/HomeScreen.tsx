import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { composeExam } from '../../core/session/compose'
import { createExam, remainingMs, type SessionState } from '../../core/session/engine'
import { EXAM_QUESTION_COUNT, TIPO_LABEL } from '../../core/taxonomy'
import { loadFullBank } from '../../data/bank'
import { clearActiveSession, listSessions, loadActiveSession, seenQuestionIds } from '../../data/db'
import type { StoredSession } from '../../data/db'
import { formatClock, formatDate, formatPercentile } from '../format'

export function HomeScreen({ onStart }: { onStart: (s: SessionState) => void }) {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [emAndamento, setEmAndamento] = useState<SessionState | null>(null)
  const [historico, setHistorico] = useState<StoredSession[]>([])

  useEffect(() => {
    void (async () => {
      const [ativa, sessoes] = await Promise.all([loadActiveSession(), listSessions(5)])
      // Uma prova cujo relógio já venceu não deve ser oferecida como retomável:
      // retomar só para ver "00:00" e ir direto ao resultado é pior que nada.
      setEmAndamento(ativa && remainingMs(ativa, Date.now()) > 0 ? ativa : null)
      if (ativa && remainingMs(ativa, Date.now()) <= 0) await clearActiveSession()
      setHistorico(sessoes)
    })()
  }, [])

  const iniciarSimulacao = async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [banco, vistas] = await Promise.all([loadFullBank(), seenQuestionIds()])
      const fila = composeExam(banco, { seen: vistas })
      onStart(createExam(fila, Date.now()))
      navigate('/sessao')
    } catch (e) {
      setErro((e as Error).message)
      setCarregando(false)
    }
  }

  const retomar = () => {
    if (!emAndamento) return
    onStart(emAndamento)
    navigate('/sessao')
  }

  return (
    <>
      <h1>Treino para a CCAT</h1>
      <p className="lead">
        50 questões em 15 minutos. Cerca de 18 segundos por questão, e a maioria dos candidatos
        não termina — por isso todo treino aqui é cronometrado.
      </p>

      {emAndamento && (
        <div className="aviso">
          <strong>Você tem uma simulação em andamento.</strong> Restam{' '}
          <span className="num">{formatClock(remainingMs(emAndamento, Date.now()))}</span> — o
          relógio não parou enquanto o app esteve fechado.
          <div className="btn-linha">
            <button className="btn" type="button" onClick={retomar}>
              Retomar
            </button>
            <button
              className="btn secundario"
              type="button"
              onClick={() => {
                void clearActiveSession()
                setEmAndamento(null)
              }}
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <button
        className="cartao"
        type="button"
        onClick={iniciarSimulacao}
        disabled={carregando}
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
      >
        <h2>Simulação completa</h2>
        <p>
          {EXAM_QUESTION_COUNT} questões em 15 minutos, tipos intercalados, dificuldade crescente.
          Sem feedback e sem voltar, como na prova. No fim, score e percentil contra a norma
          oficial.
        </p>
      </button>

      <Link className="cartao" to="/treinar">
        <h2>Prática por tipo</h2>
        <p>
          Escolha um tipo e martele só ele, no ritmo de 18 segundos por questão, com explicação
          logo após cada resposta.
        </p>
      </Link>

      <Link className="cartao" to="/teoria">
        <h2>Teoria e macetes</h2>
        <p>O método de cada tipo e a armadilha que a prova usa para derrubar você.</p>
      </Link>

      {carregando && <p className="legenda">Montando a prova…</p>}
      {erro && <div className="aviso">Não consegui carregar o banco de questões: {erro}</div>}

      {historico.length > 0 && (
        <>
          <h2>Últimas sessões</h2>
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Tipo</th>
                <th className="n">Acertos</th>
                <th className="n">Percentil</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.finishedAt)}</td>
                  <td>
                    {s.mode === 'exam'
                      ? 'Simulação'
                      : `Treino · ${TIPO_LABEL[s.tipo as keyof typeof TIPO_LABEL] ?? s.tipo}`}
                  </td>
                  <td className="n">
                    {s.score.raw}/{s.score.reached}
                  </td>
                  <td className="n">{formatPercentile(s.score.percentile)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="rodape-teoria">
            <Link to="/progresso">Ver a evolução completa</Link>
          </p>
        </>
      )}
    </>
  )
}
