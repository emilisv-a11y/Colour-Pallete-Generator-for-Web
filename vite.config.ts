import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works on GitHub Pages (sub-path), Cloudflare Pages
// and Hostinger (domain root) without changes. Routing uses the URL hash.
export default defineConfig({
  base: './',
  plugins: [react()],
})
