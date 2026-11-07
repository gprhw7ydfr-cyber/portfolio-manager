import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the production build works when served from a
  // subpath (e.g. GitHub Pages project sites serve from /<repo>/, not /).
  base: './',
  plugins: [
    react(),
    // Makes the browser build installable on phones ("Install app" on Android Chrome,
    // "Add to Home Screen" on iPhone Safari) and usable offline. Registration happens in
    // main.tsx, where it is skipped inside the Tauri desktop shell.
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Portfolio Manager',
        short_name: 'Portfolio',
        description: 'Model, analyse and optimise your property portfolio — fully offline.',
        id: './',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f4f7f4',
        theme_color: '#1e624a',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
})
