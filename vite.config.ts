import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relativo: o mesmo dist/ serve a raiz de um domínio, uma subpasta e a
  // WebView do Capacitor, sem rebuild e sem config de host.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'CCAT Trainer',
        short_name: 'CCAT Trainer',
        description: 'Timed practice for the Criteria Cognitive Aptitude Test.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // O banco espacial sozinho passa de 4 MB. O teto padrão do Workbox é
        // 2 MB, e ele PULA o que excede sem avisar — o app abriria offline com
        // um terço da prova faltando.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // Dois ambientes: a regra pura continua em `node`, como sempre esteve, e
    // só os testes de componente pagam o custo do jsdom.
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'jsdom',
          setupFiles: ['./src/app/test-setup.ts'],
          include: ['src/**/*.test.tsx'],
        },
      },
    ],
  },
})
