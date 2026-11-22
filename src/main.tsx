import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureProjects } from './lib/projects'
import './lib/versions' // automatic design-system versions

// Before anything reads saved data: make sure there is an active project (moves existing work into the first one).
ensureProjects()

// Installable app + offline use (production builds only, so development always shows fresh code)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
// Remember the browser's install prompt so the command palette can offer "Install as an app"
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as unknown as { d5InstallPrompt?: Event }).d5InstallPrompt = e
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
