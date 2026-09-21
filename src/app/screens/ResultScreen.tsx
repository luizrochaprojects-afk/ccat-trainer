import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { SessionScore } from '../../core/session/score'
import { paceTargetMs } from '../../core/session/score'
import { CCAT_NORMS, EXAM_QUESTION_COUNT, TIPO_LABEL } from '../../core/taxonomy'
import { rawNeededForPercentile } from '../../core/norms'
import { formatClock, formatPercent, formatPercentile, formatSeconds } from '../format'

/**
 * Tela de resultado (PRD §4.17–4.19).
 *
 * A hierarquia é deliberada: acertos primeiro, percentil depois, ritmo em
 * seguida. "Alcançadas" ganha destaque próprio porque na CCAT a maioria não
 * termina as 50 — e não separar "errei" de "nem cheguei lá" esconde se o
 * problema é precisão ou velocidade.
 */
export function ResultScreen() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { score?: SessionScore } | null }
  const score = state?.score

  if (!score) {
    return (
      <div className="vazio">
        <p>Nenhum resultado para mostrar.</p>
        <div className="btn-linha" style={{ justifyContent: 'center' }}>
          <Link className="btn" to="/">
            Início
          </Link>
        </div>
      </div>
    )
  }

  const exam = score.mode === 'exam'
  const ritmoAlvo = paceTargetMs()
  const ritmoOk = score.avgMs !== null && score.avgMs <= ritmoAlvo

  return (
    <>
      <h1>{exam ? 'Simulação concluída' : 'Treino concluído'}</h1>
      <p className="lead">
        {exam
          ? `Você respondeu ${score.reached} das ${score.total} questões em ${formatClock(score.durationMs)}.`
          : `${score.reached} questões em ${formatClock(score.durationMs)}.`}
      </p>

      <div className="placar">
        <div className="stat">
          <span className="valor">{score.raw}</span>
          <span className="rotulo">Acertos</span>
          {exam && <span className="nota">média da CCAT: {CCAT_NORMS.mean}</span>}
        </div>

        <div className="stat">
          <span className="valor">
            {score.reached}
            <span style={{ color: 'var(--tinta-tenue)' }}>/{score.total}</span>
          </span>
          <span className="rotulo">Alcançadas</span>
          {score.timedOut > 0 && <span className="nota">{score.timedOut} por tempo</span>}
        </div>

        <div className="stat">
          <span className="valor">{formatPercent(score.accuracy)}</span>
          <span className="rotulo">Acurácia</span>
          <span className="nota">sobre as alcançadas</span>
        </div>

        <div className="stat">
          <span className="valor">{formatSeconds(score.avgMs)}</span>
          <span className="rotulo">Por questão</span>
          <span className="nota">
            {ritmoOk ? 'dentro do ritmo' : `alvo ${formatSeconds(ritmoAlvo)}`}
          </span>
        </div>
      </div>

      {exam && score.percentile !== null && (
        <>
          <h2>Contra a norma da CCAT</h2>
          <div className="placar">
            <div className="stat">
              <span className="valor">{formatPercentile(score.percentile)}</span>
              <span className="rotulo">Percentil estimado</span>
              <span className="nota">
                acima de ~{score.percentile}% dos candidatos
              </span>
            </div>
            <div className="stat">
              <span className="valor">{rawNeededForPercentile(80)}</span>
              <span className="rotulo">Acertos para o p80</span>
              <span className="nota">
                {score.raw >= rawNeededForPercentile(80)
                  ? 'já alcançado'
                  : `faltam ${rawNeededForPercentile(80) - score.raw}`}
              </span>
            </div>
          </div>

          <div className="aviso">
            <strong>O percentil é uma estimativa.</strong> Ele vem da norma oficial da CCAT
            (média {CCAT_NORMS.mean}, desvio-padrão {CCAT_NORMS.sd}) convertida por aproximação
            normal — a Criteria não publica a tabela de percentis. Perto dos extremos o número
            desvia do percentil oficial. Use como orientação de trajetória, não como
            nota de corte.
          </div>
        </>
      )}

      <h2>Por tipo</h2>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th className="n">Acertos</th>
            <th className="n">Acurácia</th>
            <th className="n">Tempo</th>
            <th style={{ width: 90 }} />
          </tr>
        </thead>
        <tbody>
          {score.byTipo.map((b) => (
            <tr key={b.tipo}>
              <td>
                <Link to={`/teoria/${b.tipo}`}>{TIPO_LABEL[b.tipo]}</Link>
              </td>
              <td className="n">
                {b.correct}/{b.reached}
              </td>
              <td className="n">{formatPercent(b.accuracy)}</td>
              <td className="n">{formatSeconds(b.avgMs)}</td>
              <td>
                <span className="medidor">
                  <i style={{ width: `${(b.accuracy ?? 0) * 100}%` }} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {score.weakestTipo ? (
        <p className="rodape-teoria">
          Ponto mais fraco desta sessão: <strong>{TIPO_LABEL[score.weakestTipo]}</strong>.{' '}
          <Link to={`/teoria/${score.weakestTipo}`}>Rever a teoria</Link> ou{' '}
          <Link to={`/treinar?tipo=${score.weakestTipo}`}>treinar só esse tipo</Link>.
        </p>
      ) : (
        <p className="rodape-teoria">
          Desempenho parelho entre os tipos — não dá para eleger um ponto fraco nesta sessão.
        </p>
      )}

      {exam && score.reached < EXAM_QUESTION_COUNT && (
        <div className="aviso">
          {score.endedByTimeout ? (
            <>
              O relógio cortou a prova em {score.reached} questões. Na CCAT isso é comum — mas
              cada questão não alcançada é um acerto que você não teve chance de marcar. Treine
              o ritmo: o alvo é {formatSeconds(ritmoAlvo)} por questão.
            </>
          ) : (
            <>
              Você encerrou antes do tempo, em {score.reached} de {EXAM_QUESTION_COUNT} questões.
              O score e o percentil acima valem para o que foi respondido — para medir onde você
              está de verdade, vale fazer a prova inteira.
            </>
          )}
        </div>
      )}

      <div className="btn-linha">
        <button className="btn" type="button" onClick={() => navigate('/')}>
          Início
        </button>
        <Link className="btn secundario" to="/progresso">
          Ver evolução
        </Link>
      </div>
    </>
  )
}
