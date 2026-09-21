import { Link, useParams } from 'react-router-dom'
import { ALL_THEORY, theoryFor } from '../../core/theory'
import { TIPOS, type Tipo } from '../../core/taxonomy'

/** Índice da teoria — "a cola" do PRD §4.16. */
export function TheoryIndexScreen() {
  return (
    <>
      <h1>Teoria e macetes</h1>
      <p className="lead">
        O método de cada tipo e a armadilha que a prova usa. Tudo escrito para ser lido em um
        minuto, não em uma tarde.
      </p>

      {ALL_THEORY.map((t) => (
        <Link key={t.tipo} className="cartao" to={`/teoria/${t.tipo}`}>
          <h2>{t.titulo}</h2>
          <p>{t.resumo}</p>
        </Link>
      ))}
    </>
  )
}

export function TheoryTipoScreen() {
  const { tipo } = useParams<{ tipo: string }>()

  if (!tipo || !(TIPOS as readonly string[]).includes(tipo)) {
    return (
      <>
        <h1>Tipo não encontrado</h1>
        <p className="lead">O endereço aponta para um tipo que não existe.</p>
        <Link className="btn" to="/teoria">
          Ver todos os tipos
        </Link>
      </>
    )
  }

  const t = theoryFor(tipo as Tipo)

  return (
    <>
      <p className="legenda">
        <Link to="/teoria">Teoria</Link> · {t.titulo}
      </p>
      <h1>{t.titulo}</h1>
      <p className="lead">{t.resumo}</p>

      <div className="aviso">
        <strong>Ritmo.</strong> {t.ritmo}
      </div>

      {t.subtipos.map((s) => (
        <section key={s.subtipo} id={s.subtipo}>
          <h2>{s.titulo}</h2>
          <p>{s.oQuePede}</p>

          <h3>Método</h3>
          <ul className="metodo">
            {s.metodo.map((passo, i) => (
              <li key={i}>{passo}</li>
            ))}
          </ul>

          <h3>A armadilha</h3>
          <p>{s.armadilha}</p>
        </section>
      ))}

      <div className="btn-linha">
        <Link className="btn" to={`/treinar?tipo=${t.tipo}`}>
          Treinar {t.titulo.toLowerCase()}
        </Link>
        <Link className="btn secundario" to="/teoria">
          Outros tipos
        </Link>
      </div>
    </>
  )
}
