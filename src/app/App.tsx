import { useState } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import type { SessionState } from '../core/session/engine'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { LocaleProvider, useLocale } from './LocaleContext'
import { DrillSetupScreen } from './screens/DrillSetupScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { ResultScreen } from './screens/ResultScreen'
import { SessionScreen } from './screens/SessionScreen'
import { TheoryIndexScreen, TheoryTipoScreen } from './screens/TheoryScreen'

interface SessaoPendente {
  state: SessionState
  meta: { tipo?: string; subtipo?: string }
}

export function App() {
  return (
    <LocaleProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </LocaleProvider>
  )
}

function Shell() {
  // A sessão vive aqui, acima das rotas: navegar para /sessao não pode
  // recompor a prova nem reiniciar o relógio.
  const [sessao, setSessao] = useState<SessaoPendente | null>(null)

  return (
    <div className="shell">
      <Cabecalho />
      <main>
        <Routes>
          <Route
            path="/"
            element={<HomeScreen onStart={(state) => setSessao({ state, meta: {} })} />}
          />
          <Route
            path="/treinar"
            element={<DrillSetupScreen onStart={(state, meta) => setSessao({ state, meta })} />}
          />
          <Route
            path="/sessao"
            element={
              sessao ? (
                <SessionScreen
                  key={sessao.state.config.startedAt}
                  inicial={sessao.state}
                  meta={sessao.meta}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="/resultado" element={<ResultScreen />} />
          <Route path="/progresso" element={<ProgressScreen />} />
          <Route path="/teoria" element={<TheoryIndexScreen />} />
          <Route path="/teoria/:tipo" element={<TheoryTipoScreen />} />
          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </main>
    </div>
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
