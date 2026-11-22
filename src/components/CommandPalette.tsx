import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { makeBackup, setTheme } from '../lib/storage'
import { downloadText } from '../lib/exports'
import { getActiveProjectId, getProjectList, syncActive } from '../lib/projects'
import { useGenerator } from '../state/GeneratorContext'
import { useSwitchProject } from './projects/ProjectsUI'
import { useToast } from './ui'
import { PAGES, rank, type Command } from '../lib/commands'


export function CommandPalette() {
  const navigate = useNavigate()
  const gen = useGenerator()
  const toast = useToast()
  const switchTo = useSwitchProject()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQ('')
        setI(0)
      }
    }
    const onOpen = () => (setOpen(true), setQ(''), setI(0))
    window.addEventListener('keydown', onKey)
    window.addEventListener('d5wt:command-palette', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('d5wt:command-palette', onOpen)
    }
  }, [])
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0)
  }, [open])

  const commands = useMemo<Command[]>(() => {
    if (!open) return []
    const go = (to: string) => () => navigate(to)
    const active = getActiveProjectId()
    return [
      ...PAGES.map((p) => ({ id: `go:${p.to}`, label: p.label, group: 'Go to' as const, keywords: p.keywords, run: go(p.to) })),
      {
        id: 'act:generate',
        label: 'Generate a new palette',
        group: 'Actions',
        keywords: 'random space shuffle',
        run: () => {
          navigate('/generate')
          gen.dispatch({ type: 'generate', mode: gen.mode })
        },
      },
      { id: 'act:undo', label: 'Undo last palette change', group: 'Actions', keywords: 'back', run: () => gen.dispatch({ type: 'undo' }) },
      {
        id: 'act:history',
        label: 'Design system: version history',
        group: 'Actions',
        keywords: 'restore versions save snapshot',
        run: () => {
          try {
            sessionStorage.setItem('d5wt:openHistory', '1')
          } catch {
            /* ignore */
          }
          navigate('/system')
          window.dispatchEvent(new Event('d5wt:open-history'))
        },
      },
      { id: 'act:newproject', label: 'New project…', group: 'Actions', keywords: 'client create', run: () => navigate('/projects?new=1') },
      { id: 'act:kit', label: 'Start a project from a starter kit', group: 'Actions', keywords: 'industry template', run: go('/starters') },
      {
        id: 'act:backup',
        label: 'Download a backup of everything',
        group: 'Actions',
        keywords: 'export save json',
        run: () => {
          syncActive(gen.snapshot())
          downloadText(JSON.stringify(makeBackup(), null, 2), `d5-webtool-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
          toast('Backup downloaded')
        },
      },
      ...((window as unknown as { d5InstallPrompt?: { prompt: () => void } }).d5InstallPrompt
        ? [
            {
              id: 'act:install',
              label: 'Install D5 WebTool as an app',
              group: 'Actions' as const,
              keywords: 'pwa desktop offline',
              run: () => {
                const w = window as unknown as { d5InstallPrompt?: { prompt: () => void } }
                w.d5InstallPrompt?.prompt()
                w.d5InstallPrompt = undefined
              },
            },
          ]
        : []),
      { id: 'act:light', label: 'App theme: light', group: 'Actions', keywords: 'mode appearance', run: () => setTheme('light') },
      { id: 'act:dark', label: 'App theme: dark', group: 'Actions', keywords: 'mode appearance night', run: () => setTheme('dark') },
      { id: 'act:system', label: 'App theme: follow device', group: 'Actions', keywords: 'mode appearance auto', run: () => setTheme('system') },
      ...getProjectList()
        .filter((p) => !p.archived && p.id !== active)
        .map((p) => ({ id: `proj:${p.id}`, label: `Switch to ${p.name}`, group: 'Projects' as const, keywords: `${p.client} project`, run: () => switchTo(p.id) })),
    ]
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const results = rank(commands, q).slice(0, 40)
  const run = (c: Command | undefined) => {
    if (!c) return
    setOpen(false)
    c.run()
  }
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [i])

  if (!open) return null
  return (
    <div className="cmdk-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={input}
          className="cmdk-input"
          value={q}
          placeholder="Type a tool, an action or a project…"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={results[i] ? `cmdk-${i}` : undefined}
          onChange={(e) => (setQ(e.target.value), setI(0))}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
            else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setI((x) => Math.min(results.length - 1, x + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setI((x) => Math.max(0, x - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              run(results[i])
            }
          }}
        />
        <ul className="cmdk-list" id="cmdk-list" role="listbox" ref={list}>
          {results.length === 0 && <li className="cmdk-empty muted">Nothing found</li>}
          {results.map((c, n) => {
            const head = !q && (n === 0 || results[n - 1].group !== c.group) ? c.group : null
            return (
              <li key={c.id} role="presentation">
                {head && <div className="cmdk-group">{head}</div>}
                <div id={`cmdk-${n}`} role="option" aria-selected={n === i} className={`cmdk-item ${n === i ? 'on' : ''}`} onMouseMove={() => setI(n)} onClick={() => run(c)}>
                  <span>{c.label}</span>
                  <span className="muted small">{c.group === 'Go to' ? 'Open' : c.group === 'Projects' ? 'Project' : ''}</span>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="cmdk-foot muted small">
          <span>↑ ↓ to move · Enter to open · Esc to close</span>
          <span>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + K</span>
        </div>
      </div>
    </div>
  )
}
