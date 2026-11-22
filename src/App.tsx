import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Icon } from './components/Icon'
import { Popover, ToastProvider } from './components/ui'
import { getTheme, setTheme, useStorageVersion, type ThemePref } from './lib/storage'
import ColorPage from './pages/ColorPage'
import ContrastPage from './pages/ContrastPage'
import GeneratorPage from './pages/GeneratorPage'
import LibraryPage from './pages/LibraryPage'
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const ImagePage = lazy(() => import('./pages/ImagePage'))
const GradientPage = lazy(() => import('./pages/GradientPage'))
const MeshPage = lazy(() => import('./pages/MeshPage'))
const ImageTextPage = lazy(() => import('./pages/ImageTextPage'))
const LogoPage = lazy(() => import('./pages/LogoPage'))
const BrandAssetsPage = lazy(() => import('./pages/BrandAssetsPage'))
const StarterKitsPage = lazy(() => import('./pages/StarterKitsPage'))
const VisualizerPage = lazy(() => import('./pages/VisualizerPage'))
const TailwindPage = lazy(() => import('./pages/TailwindPage'))
const CollagePage = lazy(() => import('./pages/CollagePage'))
const SystemPage = lazy(() => import('./pages/SystemPage'))
const BrandKitPage = lazy(() => import('./pages/BrandKitPage'))
const DiviPage = lazy(() => import('./pages/DiviPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const ReviewPage = lazy(() => import('./pages/ReviewPage'))
import { AccountButton } from './components/account/AccountButton'
import { LoginGate } from './components/account/LoginGate'
import { SyncProvider } from './state/SyncContext'
import { ProjectSwitcher } from './components/projects/ProjectsUI'
import { getActiveProjectId } from './lib/projects'

const MORE = [
  { to: '/image', label: 'Image picker' },
  { to: '/gradient', label: 'Gradient maker' },
  { to: '/mesh', label: 'Mesh gradient' },
  { to: '/text-on-image', label: 'Text on image checker' },
  { to: '/logo', label: 'Logo checker' },
  { to: '/brand-assets', label: 'Favicon & social images' },
  { to: '/starters', label: 'Starter kits' },
  { to: '/collage', label: 'Collage & moodboard' },
  { to: '/tailwind', label: 'Tailwind colours' },
  { to: '/color', label: 'Colour details' },
]

function MoreMenu() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const active = MORE.some((m) => pathname.startsWith(m.to))
  useEffect(() => setOpen(false), [pathname])
  return (
    <div className="pop-anchor">
      <button className={`nav-more ${active ? 'active' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        Tools <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <Popover onClose={() => setOpen(false)} className="nav-menu">
          {MORE.map((m) => (
            <NavLink key={m.to} to={m.to} role="menuitem">
              {m.label}
            </NavLink>
          ))}
        </Popover>
      )}
    </div>
  )
}
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
        <NavLink to="/explore">Explore</NavLink>
        <MoreMenu />
        <NavLink to="/visualize">Visualizer</NavLink>
        <NavLink to="/system" className={({ isActive }) => (isActive || location.hash.startsWith('#/brand-kit') ? 'active' : '')}>
          Design system
        </NavLink>
        <NavLink to="/divi">Divi 5</NavLink>
        <NavLink to="/contrast">Contrast</NavLink>
        <NavLink to="/library">Library</NavLink>
      </nav>
      <ProjectSwitcher />
      <AccountButton />
      <button className="icon-btn" onClick={() => setTheme(next.id)} title={`${current.label} (switch to ${next.label.toLowerCase()})`} aria-label={`Switch to ${next.label}`}>
        <Icon name={current.icon} />
      </button>
    </header>
  )
}

/** Main area, re-mounted when the active project changes so every page reloads its data. */
function ProjectMain({ children }: { children: React.ReactNode }) {
  useStorageVersion()
  return (
    <main className="app-main" key={getActiveProjectId() ?? 'none'}>
      {children}
    </main>
  )
}

/** Client review links render on their own, without the app's navigation. */
function Shell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  if (pathname.startsWith('/review/'))
    return (
      <Suspense fallback={<div className="page muted">Loading…</div>}>
        <Routes>
          <Route path="/review/:token" element={<ReviewPage />} />
        </Routes>
      </Suspense>
    )
  return <LoginGate>{children}</LoginGate>
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <GeneratorProvider>
          <SyncProvider>
          <Shell>
          <div className="app">
            <Header />
            <ProjectMain>
              <Suspense fallback={<div className="page muted">Loading…</div>}>
              <Routes>
                <Route path="/" element={<Navigate to="/generate" replace />} />
                <Route path="/generate/:colors?" element={<GeneratorPage />} />
                <Route path="/color/:hex?" element={<ColorPage />} />
                <Route path="/contrast/:fg?/:bg?" element={<ContrastPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/image" element={<ImagePage />} />
                <Route path="/gradient" element={<GradientPage />} />
                <Route path="/mesh" element={<MeshPage />} />
                <Route path="/text-on-image" element={<ImageTextPage />} />
                <Route path="/logo" element={<LogoPage />} />
                <Route path="/brand-assets" element={<BrandAssetsPage />} />
                <Route path="/starters" element={<StarterKitsPage />} />
                <Route path="/visualize" element={<VisualizerPage />} />
                <Route path="/tailwind" element={<TailwindPage />} />
                <Route path="/collage" element={<CollagePage />} />
                <Route path="/system" element={<SystemPage />} />
                <Route path="/brand-kit" element={<BrandKitPage />} />
                <Route path="/divi" element={<DiviPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="*" element={<Navigate to="/generate" replace />} />
              </Routes>
              </Suspense>
            </ProjectMain>
          </div>
          </Shell>
          </SyncProvider>
        </GeneratorProvider>
      </ToastProvider>
    </HashRouter>
  )
}
