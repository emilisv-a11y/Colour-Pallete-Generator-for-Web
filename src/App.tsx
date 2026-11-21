import { useEffect } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { Icon } from './components/Icon'
import { ToastProvider } from './components/ui'
import { getTheme, setTheme, useStorageVersion, type ThemePref } from './lib/storage'
import ColorPage from './pages/ColorPage'
import ContrastPage from './pages/ContrastPage'
import GeneratorPage from './pages/GeneratorPage'
import LibraryPage from './pages/LibraryPage'
import { GeneratorProvider } from './state/GeneratorContext'

const THEMES: { id: ThemePref; icon: 'monitor' | 'sun' | 'moon'; label: string }[] = [
  { id: 'system', icon: 'monitor', label: 'System theme' },
  { id: 'light', icon: 'sun', label: 'Light theme' },
  { id: 'dark', icon: 'moon', label: 'Dark theme' },
]

function Header() {
  useStorageVersion()
  const theme = getTheme()
  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  const next = THEMES[(THEMES.findIndex((t) => t.id === theme) + 1) % THEMES.length]
  const current = THEMES.find((t) => t.id === theme)!
  return (
    <header className="app-header">
      <NavLink to="/generate" className="brand" aria-label="D5 WebTool home">
        <span className="brand-mark" aria-hidden="true">
          <i /> <i /> <i />
        </span>
        <span className="brand-name">
          D5 <b>WebTool</b>
        </span>
      </NavLink>
      <nav className="main-nav" aria-label="Main">
        <NavLink to="/generate">Generator</NavLink>
        <NavLink to="/color">Colours</NavLink>
        <NavLink to="/contrast">Contrast</NavLink>
        <NavLink to="/library">Library</NavLink>
      </nav>
      <button className="icon-btn" onClick={() => setTheme(next.id)} title={`${current.label} (switch to ${next.label.toLowerCase()})`} aria-label={`Switch to ${next.label}`}>
        <Icon name={current.icon} />
      </button>
    </header>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <GeneratorProvider>
          <div className="app">
            <Header />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Navigate to="/generate" replace />} />
                <Route path="/generate/:colors?" element={<GeneratorPage />} />
                <Route path="/color/:hex?" element={<ColorPage />} />
                <Route path="/contrast/:fg?/:bg?" element={<ContrastPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="*" element={<Navigate to="/generate" replace />} />
              </Routes>
            </main>
          </div>
        </GeneratorProvider>
      </ToastProvider>
    </HashRouter>
  )
}
