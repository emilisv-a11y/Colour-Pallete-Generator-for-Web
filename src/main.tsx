import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureProjects } from './lib/projects'

// Before anything reads saved data: make sure there is an active project (moves existing work into the first one).
ensureProjects()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
