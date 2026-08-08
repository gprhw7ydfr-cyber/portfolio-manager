import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the production build works when served from a
  // subpath (e.g. GitHub Pages project sites serve from /<repo>/, not /).
  base: './',
  plugins: [react()],
})
