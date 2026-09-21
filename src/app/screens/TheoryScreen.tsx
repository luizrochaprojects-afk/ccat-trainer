import { Link, useParams } from 'react-router-dom'
import { ALL_THEORY, theoryFor } from '../../core/theory'
import { TIPOS, type Tipo } from '../../core/taxonomy'
import { useLocale } from '../LocaleContext'

/** Índice da teoria — "a cola" do PRD §4.16. */
export function TheoryIndexScreen() {
  const { t, tx } = useLocale()

  return (
    <>
      <p className="trilha">{t('theory.crumb')}</p>
      <h1>{t('theory.title')}</h1>
      <p className="lead">{t('theory.lead')}</p>

      {ALL_THEORY.map((item) => (
        <Link key={item.tipo} className="ato" to={`/teoria/${item.tipo}`}>
          <span className="seta" aria-hidden="true">
            →
          </span>
          <h2>{tx(item.titulo)}</h2>
          <p>{tx(item.resumo)}</p>
        </Link>
      ))}
    </>
  )
}

export function TheoryTipoScreen() {
  const { tipo } = useParams<{ tipo: string }>()
  const { t: s, tx, locale } = useLocale()

  if (!tipo || !(TIPOS as readonly string[]).includes(tipo)) {
    return (
      <>
        <h1>{s('theory.notFound')}</h1>
        <p className="lead">{s('theory.notFound.lead')}</p>
        <Link className="btn" to="/teoria">
          {s('theory.seeAll')}
        </Link>
      </>
    )
  }

  const item = theoryFor(tipo as Tipo)

  return (
    <>
      <p className="trilha">
        <Link to="/teoria">{s('theory.crumb')}</Link> · {tx(item.titulo)}
      </p>
      <h1>{tx(item.titulo)}</h1>
      <p className="lead">{tx(item.resumo)}</p>

      <div className="nota-bloco">
        <span className="micro">{s('theory.pace')}</span>
        <p>{tx(item.ritmo)}</p>
      </div>

      {item.subtipos.map((sub) => (
        <section key={sub.subtipo} id={sub.subtipo}>
          <h2>{tx(sub.titulo)}</h2>
          <p>{tx(sub.oQuePede)}</p>

          <h3>{s('theory.method')}</h3>
          <ul className="metodo">
            {sub.metodo[locale].map((passo, i) => (
              <li key={i}>{passo}</li>
            ))}
          </ul>

          <h3>{s('theory.trap')}</h3>
          <p>{tx(sub.armadilha)}</p>
        </section>
      ))}

      <div className="btn-linha">
        <Link className="btn" to={`/treinar?tipo=${item.tipo}`}>
          {s('theory.practise', { tipo: tx(item.titulo).toLowerCase() })}
        </Link>
        <Link className="btn secundario" to="/teoria">
          {s('theory.others')}
        </Link>
      </div>
    </>
  )
}
