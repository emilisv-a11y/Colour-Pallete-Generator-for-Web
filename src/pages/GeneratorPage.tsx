import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { AdjustPanel, applyAdjust, ExportModal, HistoryPopover, SaveModal, SessionsModal, ShortcutsModal } from '../components/generator/Panels'
import { SwatchColumn } from '../components/generator/SwatchColumn'
import { adjustColor, FORMATS, NO_ADJUSTMENTS, normalizeHex, simulateVision, VISIONS, type Adjustments, type FormatId, type VisionId } from '../lib/color'
import { paletteSlug } from '../lib/exports'
import { MODES, type ModeId } from '../lib/generate'
import { useColorNames } from '../lib/names'
import { getActiveSessionId, getSessions, useStorageVersion } from '../lib/storage'
import { useGenerator } from '../state/GeneratorContext'
import { MAX_COLORS, MIN_COLORS } from '../state/palette'

type Dialog = null | 'export' | 'save' | 'sessions' | 'shortcuts'

function useIsNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 760px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)')
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

export default function GeneratorPage() {
  const { colors } = useParams()
  const navigate = useNavigate()
  const { state, dispatch, mode, setMode, format, setFormat, vision, setVision } = useGenerator()
  const { name } = useColorNames()
  useStorageVersion()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [adjust, setAdjust] = useState<Adjustments | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const narrow = useIsNarrow()
  const present = state.present
  const hexes = present.map((s) => s.hex)

  // Two-way sync between the palette and the URL (#/generate/aabbcc-...).
  const urlHexes = colors?.split('-').map((c) => normalizeHex(c)).filter((c): c is string => !!c)
  const urlSlug = urlHexes && urlHexes.length >= MIN_COLORS ? paletteSlug(urlHexes.slice(0, MAX_COLORS)) : null
  const lastSynced = useRef<string | null>(null)
  // URL -> palette (arriving from a shared link, the Library, or editing the address bar)
  useEffect(() => {
    if (urlSlug && urlHexes && urlSlug !== paletteSlug(hexes) && urlSlug !== lastSynced.current) {
      dispatch({ type: 'set', hexes: urlHexes.slice(0, MAX_COLORS) })
    }
  }, [urlSlug])
  // palette -> URL
  useEffect(() => {
    const slug = paletteSlug(hexes)
    if (urlSlug && urlSlug !== slug && urlSlug !== lastSynced.current) return // a new URL palette is being applied
    lastSynced.current = slug
    if (slug !== colors) navigate(`/generate/${slug}`, { replace: true })
  }, [present])

  const generate = useCallback(() => {
    if (adjust) return
    dispatch({ type: 'generate', mode })
  }, [dispatch, mode, adjust])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else stageRef.current?.requestFullscreen?.()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if (document.querySelector('.modal-backdrop, .popover')) return
      const mod = e.ctrlKey || e.metaKey
      if (e.code === 'Space' && !mod) {
        e.preventDefault()
        generate()
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        dispatch({ type: 'redo' })
      } else if (!mod && !e.altKey) {
        const k = e.key.toLowerCase()
        if (k === 'a') setAdjust((a) => (a ? null : NO_ADJUSTMENTS))
        else if (k === 'e') setDialog('export')
        else if (k === 's') setDialog('save')
        else if (k === 'f') toggleFullscreen()
        else if (e.key === '?') setDialog('shortcuts')
        else if (k === 'escape') setAdjust(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [generate, dispatch])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = present.findIndex((s) => s.id === e.active.id)
    const to = present.findIndex((s) => s.id === e.over!.id)
    dispatch({ type: 'move', from, to })
  }

  const displayOf = (hex: string) => simulateVision(adjust ? adjustColor(hex, adjust) : hex, vision)
  const activeSession = getSessions().find((s) => s.id === getActiveSessionId())
  const sessionDirty = !!activeSession && paletteSlug(activeSession.generator.present.map((s) => s.hex)) !== paletteSlug(hexes)

  return (
    <div className="generator">
      <div className="toolbar">
        <div className="toolbar-group">
          <button className="btn btn-primary" onClick={generate} disabled={!!adjust} title="Generate (Space)">
            <Icon name="wand" size={16} /> Generate
          </button>
          <span className="hint hide-narrow">
            or press <kbd>Space</kbd>
          </span>
          <label className="select-wrap" title="Generation method">
            <span className="sr-only">Generation method</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as ModeId)}>
              {MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="toolbar-group">
          <button className="icon-btn" onClick={() => dispatch({ type: 'undo' })} disabled={!state.past.length} title="Undo (Ctrl+Z)" aria-label="Undo">
            <Icon name="undo" />
          </button>
          <button className="icon-btn" onClick={() => dispatch({ type: 'redo' })} disabled={!state.future.length} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
            <Icon name="redo" />
          </button>
          <div className="pop-anchor">
            <button className="icon-btn" onClick={() => setHistoryOpen((o) => !o)} title="History" aria-label="History" aria-expanded={historyOpen}>
              <Icon name="history" />
            </button>
            {historyOpen && <HistoryPopover past={state.past} onJump={(i) => dispatch({ type: 'jump', pastIndex: i })} onClose={() => setHistoryOpen(false)} />}
          </div>
          <button className="icon-btn" onClick={() => dispatch({ type: 'insert', index: present.length })} disabled={present.length >= MAX_COLORS || !!adjust} title="Add a colour" aria-label="Add a colour">
            <Icon name="plus" />
          </button>
          <span className="divider" />
          <button className={`icon-btn ${adjust ? 'on' : ''}`} onClick={() => setAdjust((a) => (a ? null : NO_ADJUSTMENTS))} title="Adjust palette (A)" aria-label="Adjust palette" aria-pressed={!!adjust}>
            <Icon name="sliders" />
          </button>
          <label className={`select-wrap icon-select ${vision !== 'normal' ? 'on' : ''}`} title="Colour blindness simulation">
            <Icon name="eye" />
            <span className="sr-only">Colour blindness simulation</span>
            <select value={vision} onChange={(e) => setVision(e.target.value as VisionId)}>
              {VISIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                  {v.note ? ` (${v.note})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="select-wrap" title="Colour notation">
            <span className="sr-only">Colour notation</span>
            <select value={format} onChange={(e) => setFormat(e.target.value as FormatId)}>
              {FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <span className="divider" />
          <Link className="icon-btn" to="/visualize" title="View on sample designs" aria-label="Visualize palette">
            <Icon name="layout" />
          </Link>
          <button className="icon-btn" onClick={toggleFullscreen} title="Fullscreen (F)" aria-label="Fullscreen">
            <Icon name="maximize" />
          </button>
          <button className="icon-btn hide-narrow" onClick={() => setDialog('shortcuts')} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
            <Icon name="keyboard" />
          </button>
          <button className="btn" onClick={() => setDialog('sessions')} title={sessionDirty ? "Session has unsaved changes" : "Save or load a session"}>
            <Icon name="folder" size={16} /> <span className="hide-narrow">{activeSession ? activeSession.name : 'Sessions'}</span>
            {sessionDirty && <span className="dirty-dot" title="Unsaved changes in this session" />}
          </button>
          <button className="btn" onClick={() => setDialog('save')} title="Save palette to Library (S)">
            <Icon name="save" size={16} /> <span className="hide-narrow">Save</span>
          </button>
          <button className="btn btn-dark" onClick={() => setDialog('export')} title="Export (E)">
            <Icon name="share" size={16} /> <span className="hide-narrow">Export</span>
          </button>
        </div>
      </div>

      {vision !== 'normal' && (
        <div className="banner">
          Simulating <strong>{VISIONS.find((v) => v.id === vision)?.label}</strong>. Your actual colours are unchanged.
          <button className="btn btn-small" onClick={() => setVision('normal')}>
            Turn off
          </button>
        </div>
      )}

      <div className="stage" ref={stageRef}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={present.map((s) => s.id)} strategy={narrow ? verticalListSortingStrategy : horizontalListSortingStrategy}>
            <div className="swatches">
              {present.map((s, i) => (
                <SwatchColumn
                  key={s.id}
                  swatch={s}
                  display={displayOf(s.hex)}
                  name={name(s.hex)}
                  format={format}
                  index={i}
                  count={present.length}
                  canRemove={present.length > MIN_COLORS}
                  canInsert={present.length < MAX_COLORS && !adjust}
                  onEdit={(hex) => dispatch({ type: 'edit', id: s.id, hex })}
                  onBeginEdit={() => dispatch({ type: 'beginEdit' })}
                  onEndEdit={() => dispatch({ type: 'endEdit' })}
                  onPick={(hex) => dispatch({ type: 'edit', id: s.id, hex })}
                  onLock={() => dispatch({ type: 'toggleLock', id: s.id })}
                  onRemove={() => dispatch({ type: 'remove', id: s.id })}
                  onInsert={(index) => dispatch({ type: 'insert', index })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {adjust && (
          <AdjustPanel
            value={adjust}
            onChange={setAdjust}
            onCancel={() => setAdjust(null)}
            onApply={() => {
              dispatch({ type: 'replace', swatches: applyAdjust(present, adjust) })
              setAdjust(null)
            }}
          />
        )}
      </div>

      {dialog === 'export' && <ExportModal hexes={hexes} onClose={() => setDialog(null)} />}
      {dialog === 'save' && <SaveModal hexes={hexes} onClose={() => setDialog(null)} />}
      {dialog === 'sessions' && <SessionsModal onClose={() => setDialog(null)} />}
      {dialog === 'shortcuts' && <ShortcutsModal onClose={() => setDialog(null)} />}
    </div>
  )
}
