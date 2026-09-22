import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
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

/**
 * Ajustes que só existem dentro do app nativo.
 *
 * A splash não se esconde sozinha (`launchAutoHide: false`) porque o banco de
 * questões é um chunk grande: com auto-hide a WebView pisca branco entre a
 * splash sumir e a primeira tela existir. Escondê-la depois do render troca o
 * piscar por continuidade.
 */
if (Capacitor.isNativePlatform()) {
  void (async () => {
    const [{ SplashScreen }, { StatusBar, Style }] = await Promise.all([
      import('@capacitor/splash-screen'),
      import('@capacitor/status-bar'),
    ])
    // Tema claro é fixo no app, então a barra de status é determinada: fundo
    // papel, ícones escuros.
    await StatusBar.setStyle({ style: Style.Light }).catch(() => {})
    await StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {})
    await SplashScreen.hide().catch(() => {})
  })()
} else if ('serviceWorker' in navigator) {
  /**
   * O service worker é só da web.
   *
   * Dentro do Capacitor os assets já vêm no APK; um SW ali acrescentaria uma
   * camada de cache capaz de servir a versão antiga depois de uma atualização
   * pela Play Store — um bug difícil de diagnosticar em troca de nada.
   */
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
