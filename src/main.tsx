import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

// Fontes auto-hospedadas (nada de CDN: o app tem de funcionar offline e a
// primeira renderização não pode depender de terceiro).
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/inter-tight'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'

import './app/styles.css'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('#root não encontrado')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
