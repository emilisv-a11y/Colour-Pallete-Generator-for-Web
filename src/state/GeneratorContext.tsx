import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { FormatId, VisionId } from '../lib/color'
import type { ModeId } from '../lib/generate'
import { getCurrent, setCurrent, type GeneratorSnapshot } from '../lib/storage'
import { initialState, paletteReducer, type PaletteAction, type PaletteState } from './palette'

type Ctx = {
  state: PaletteState
  dispatch: React.Dispatch<PaletteAction>
  mode: ModeId
  setMode: (m: ModeId) => void
  format: FormatId
  setFormat: (f: FormatId) => void
  vision: VisionId
  setVision: (v: VisionId) => void
  snapshot: () => GeneratorSnapshot
  loadSnapshot: (s: GeneratorSnapshot) => void
}

const GeneratorCtx = createContext<Ctx | null>(null)

export function GeneratorProvider({ children }: { children: ReactNode }) {
  const saved = useMemo(() => getCurrent(), [])
  const [state, dispatch] = useReducer(paletteReducer, undefined, () =>
    saved?.present?.length ? { present: saved.present, past: saved.past ?? [], future: saved.future ?? [], editing: false } : initialState(),
  )
  const [mode, setMode] = useState<ModeId>(saved?.mode ?? 'auto')
  const [format, setFormat] = useState<FormatId>(saved?.format ?? 'hex')
  const [vision, setVision] = useState<VisionId>(saved?.vision ?? 'normal')

  // Autosave the working state so a reload (or closing the tab) never loses work.
  useEffect(() => {
    if (state.editing) return
    const t = setTimeout(() => setCurrent({ present: state.present, past: state.past, future: state.future, mode, format, vision }), 300)
    return () => clearTimeout(t)
  }, [state, mode, format, vision])

  const value = useMemo<Ctx>(
    () => ({
      state,
      dispatch,
      mode,
      setMode,
      format,
      setFormat,
      vision,
      setVision,
      snapshot: () => ({ present: state.present, past: state.past, future: state.future, mode, format, vision }),
      loadSnapshot: (s) => {
        dispatch({ type: 'restore', state: { present: s.present, past: s.past ?? [], future: s.future ?? [] } })
        setMode(s.mode ?? 'auto')
        setFormat(s.format ?? 'hex')
        setVision(s.vision ?? 'normal')
      },
    }),
    [state, mode, format, vision],
  )

  return <GeneratorCtx.Provider value={value}>{children}</GeneratorCtx.Provider>
}

export function useGenerator() {
  const ctx = useContext(GeneratorCtx)
  if (!ctx) throw new Error('useGenerator must be used inside GeneratorProvider')
  return ctx
}
