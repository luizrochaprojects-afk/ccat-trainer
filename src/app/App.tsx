import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  RouterProvider,
  createHashRouter,
  useLocation,
  useRouteError,
} from 'react-router-dom'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { LocaleProvider, useLocale } from './LocaleContext'
import { SessaoProvider, useSessaoPendente } from './SessionContext'
import { DrillSetupScreen } from './screens/DrillSetupScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { ResultScreen } from './screens/ResultScreen'
import { SessionScreen } from './screens/SessionScreen'
import { TheoryIndexScreen, TheoryTipoScreen } from './screens/TheoryScreen'

/**
 * Router de HASH, e não de history, por três motivos que se somam:
 *
 *  1. Na WebView do Capacitor o app é servido por um servidor local. Navegar
 *     por pushState funciona, mas qualquer RECARGA da WebView (o Android
 *     recuperando memória, restauração de processo) aterrissa em /sessao e o
 *     servidor local devolve 404 — tela branca no meio de uma prova.
 *  2. Na web, dispensa rewrite de SPA em qualquer host.
 *  3. `useBlocker` — o guarda de "não abandone a prova" — só existe em router
 *     de dados.
 *
 * O custo é o `#` na URL e nenhum SEO. Um app offline, sem servidor e sem
 * conta, não tem o que indexar.
 */
const router = createHashRouter([
  {
    element: <Shell />,
    errorElement: <Falha />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'treinar', element: <DrillSetupScreen /> },
      { path: 'sessao', element: <RotaSessao /> },
      { path: 'resultado', element: <ResultScreen /> },
      { path: 'progresso', element: <ProgressScreen /> },
      { path: 'teoria', element: <TheoryIndexScreen /> },
      { path: 'teoria/:tipo', element: <TheoryTipoScreen /> },
      { path: '*', element: <NaoEncontrado /> },
    ],
  },
])

export function App() {
  return (
    <LocaleProvider>
      <SessaoProvider>
        <RouterProvider router={router} />
      </SessaoProvider>
    </LocaleProvider>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const emSessao = pathname === '/sessao'

  return (
    <div className={`shell${emSessao ? ' em-sessao' : ''}`}>
      <Cabecalho />
      {/* A área rolável é só esta. O <div class="shell"> é uma grade de altura
          de viewport, para que a barra de ação fique sempre alcançável e a
          prova nunca role por baixo do cronômetro. */}
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * Entrar em /sessao sem sessão composta (link direto, recarga) volta para a
 * Home — de onde a retomada é oferecida. O `key` por `startedAt` é o que
 * impede uma re-renderização de reiniciar o relógio.
 */
function RotaSessao() {
  const { sessao } = useSessaoPendente()
  if (!sessao) return <Navigate to="/" replace />
  return (
    <SessionScreen
      key={sessao.state.config.startedAt}
      inicial={sessao.state}
      meta={sessao.meta}
    />
  )
}

function Cabecalho() {
  const { pathname } = useLocation()
  const { t } = useLocale()

  // Durante a sessão o cabeçalho some: qualquer link visível é um convite a
  // abandonar a prova no meio, e a barra do cronômetro já ancora a tela.
  if (pathname === '/sessao') return null

  return (
    <header className="topo">
      <Link className="marca" to="/">
        {t('brand')}
      </Link>
      <div className="topo-direita">
        <nav className="nav">
          <NavLink to="/">{t('nav.home')}</NavLink>
          <NavLink to="/treinar">{t('nav.drill')}</NavLink>
          <NavLink to="/progresso">{t('nav.progress')}</NavLink>
          <NavLink to="/teoria">{t('nav.theory')}</NavLink>
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  )
}

function NaoEncontrado() {
  const { t } = useLocale()
  return (
    <>
      <h1>{t('notFound.title')}</h1>
      <p className="lead">{t('notFound.lead')}</p>
      <Link className="btn" to="/">
        {t('notFound.action')}
      </Link>
    </>
  )
}

/**
 * Sem isto, um erro de render deixa a tela branca e sem saída — o pior
 * desfecho possível num app que a pessoa abriu para fazer uma prova.
 * Fora do LocaleProvider não daria para traduzir; está dentro, então dá.
 */
function Falha() {
  const erro = useRouteError()
  return (
    <div className="shell">
      <main className="conteudo">
        <Recado erro={erro} />
      </main>
    </div>
  )
}

function Recado({ erro }: { erro: unknown }) {
  const { t } = useLocale()
  const mensagem = erro instanceof Error ? erro.message : String(erro)
  return (
    <>
      <h1>{t('crash.title')}</h1>
      <p className="lead">{t('crash.lead')}</p>
      <div className="nota-bloco">
        <span className="micro">{t('home.error.label')}</span>
        <p>{mensagem}</p>
      </div>
      <div className="btn-linha">
        <button className="btn" type="button" onClick={() => window.location.reload()}>
          {t('crash.action')}
        </button>
      </div>
    </>
  )
}
