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
  // A sessão vive aqui, acima das rotas: navegar para /sessao não pode
  // recompor a prova nem reiniciar o relógio.
  const [sessao, setSessao] = useState<SessaoPendente | null>(null)

  return (
    <BrowserRouter>
      <div className="shell">
        <Cabecalho />
        <main>
          <Routes>
            <Route
              path="/"
              element={
                <HomeScreen onStart={(state) => setSessao({ state, meta: {} })} />
              }
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
    </BrowserRouter>
  )
}

function Cabecalho() {
  const { pathname } = useLocation()

  // Durante a sessão o cabeçalho some: qualquer link visível é um convite a
  // abandonar a prova no meio, e a barra do cronômetro já ancora a tela.
  if (pathname === '/sessao') return null

  return (
    <header className="topo">
      <Link className="marca" to="/">
        CCAT Trainer
      </Link>
      <nav className="nav">
        <NavLink to="/">Início</NavLink>
        <NavLink to="/treinar">Treinar</NavLink>
        <NavLink to="/progresso">Evolução</NavLink>
        <NavLink to="/teoria">Teoria</NavLink>
      </nav>
    </header>
  )
}

function NaoEncontrado() {
  return (
    <>
      <h1>Página não encontrada</h1>
      <p className="lead">O endereço que você abriu não existe neste app.</p>
      <Link className="btn" to="/">
        Voltar ao início
      </Link>
    </>
  )
}
