import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Empacotamento Android.
 *
 * ATENÇÃO — `appId` é IMUTÁVEL depois do primeiro envio à Google Play. O valor
 * abaixo é um provisório: trocar agora custa três linhas, trocar depois custa a
 * listagem inteira.
 *
 * O roteador do app é de hash (ver `src/app/App.tsx`): a WebView serve de um
 * servidor local, e uma recarga em rota profunda daria 404 — tela branca no
 * meio de uma prova.
 */
const config: CapacitorConfig = {
  appId: 'com.ccattrainer.app',
  appName: 'CCAT Trainer',
  webDir: 'dist',
  android: {
    // Nada de conteúdo em http dentro da WebView: o app é inteiramente local.
    allowMixedContent: false,
    backgroundColor: '#ffffff',
  },
  plugins: {
    SplashScreen: {
      // Escondida por código depois do primeiro render (ver src/main.tsx).
      // Com auto-hide a WebView pisca branco enquanto o banco de questões,
      // que é um chunk de alguns megabytes, ainda está resolvendo.
      launchAutoHide: false,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      // Tema claro é fixo no app, então a barra de status é determinada.
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    },
  },
}

export default config
