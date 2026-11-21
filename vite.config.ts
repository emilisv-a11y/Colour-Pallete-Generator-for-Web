import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works on GitHub Pages (sub-path), Cloudflare Pages
// and Hostinger (domain root) without changes. Routing uses the URL hash.
export default defineConfig({
  base: './',
  plugins: [react()],
  // `npm run dev` talks to a local PHP API (server/dev/start.sh) at the same /api path used in production
  server: { proxy: { '/api': 'http://127.0.0.1:8080' } },
})
