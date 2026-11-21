import { generatePalette, type ModeId } from '../lib/generate'
import { hexToOklch, oklchToHex, randomHex } from '../lib/color'
import { uid, type Swatch } from '../lib/storage'

export const MIN_COLORS = 2
export const MAX_COLORS = 10
const HISTORY_LIMIT = 100

export type PaletteState = {
  present: Swatch[]
  past: Swatch[][]
  future: Swatch[][]
  /** true while a picker/adjust edit is open: edits change `present` without new history entries */
  editing: boolean
}

export type PaletteAction =
  | { type: 'generate'; mode: ModeId }
  | { type: 'set'; hexes: string[] }
  | { type: 'replace'; swatches: Swatch[] }
  | { type: 'edit'; id: string; hex: string }
  | { type: 'beginEdit' }
  | { type: 'endEdit' }
  | { type: 'toggleLock'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'insert'; index: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'jump'; pastIndex: number }
  | { type: 'restore'; state: Pick<PaletteState, 'present' | 'past' | 'future'> }

export const swatch = (hex: string, locked = false): Swatch => ({ id: uid(), hex, locked })

export function initialState(hexes?: string[]): PaletteState {
  const present = hexes?.length ? hexes.map((h) => swatch(h)) : generatePalette(Array(5).fill(null), 'auto').map((h) => swatch(h))
  return { present, past: [], future: [], editing: false }
}

const same = (a: Swatch[], b: Swatch[]) => a.length === b.length && a.every((s, i) => s.hex === b[i].hex)

/** Push the current palette onto history and set a new one. */
function commit(state: PaletteState, next: Swatch[]): PaletteState {
  if (same(state.present, next)) return { ...state, present: next }
  return {
    ...state,
    past: [...state.past, state.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
  }
}

/** Colour between two neighbours (midpoint in OKLCH) for "insert" between swatches. */
function between(a?: string, b?: string): string {
  if (!a && !b) return randomHex()
  if (!a || !b) {
    const o = hexToOklch((a ?? b)!)
    return oklchToHex(o.l > 0.5 ? o.l - 0.15 : o.l + 0.15, o.c, o.h)
  }
  const x = hexToOklch(a),
    y = hexToOklch(b)
  let dh = y.h - x.h
  if (dh > 180) dh -= 360
  if (dh < -180) dh += 360
  return oklchToHex((x.l + y.l) / 2, (x.c + y.c) / 2, x.h + dh / 2)
}

export function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  switch (action.type) {
    case 'generate': {
      if (state.present.every((s) => s.locked)) return state
      const hexes = generatePalette(
        state.present.map((s) => (s.locked ? s.hex : null)),
        action.mode,
      )
      return commit(
        state,
        state.present.map((s, i) => (s.locked ? s : { ...s, hex: hexes[i] })),
      )
    }
    case 'set':
      return commit(
        state,
        action.hexes.slice(0, MAX_COLORS).map((h) => swatch(h)),
      )
    case 'replace':
      return commit(state, action.swatches)
    case 'beginEdit':
      if (state.editing) return state
      return { ...state, editing: true, past: [...state.past, state.present].slice(-HISTORY_LIMIT), future: [] }
    case 'endEdit': {
      if (!state.editing) return state
      const last = state.past[state.past.length - 1]
      // drop the checkpoint if nothing actually changed
      const past = last && same(last, state.present) ? state.past.slice(0, -1) : state.past
      return { ...state, editing: false, past }
    }
    case 'edit': {
      const next = state.present.map((s) => (s.id === action.id ? { ...s, hex: action.hex } : s))
      return state.editing ? { ...state, present: next } : commit(state, next)
    }
    case 'toggleLock':
      return { ...state, present: state.present.map((s) => (s.id === action.id ? { ...s, locked: !s.locked } : s)) }
    case 'remove':
      if (state.present.length <= MIN_COLORS) return state
      return commit(
        state,
        state.present.filter((s) => s.id !== action.id),
      )
    case 'insert': {
      if (state.present.length >= MAX_COLORS) return state
      const p = state.present
      const hex = between(p[action.index - 1]?.hex, p[action.index]?.hex)
      return commit(state, [...p.slice(0, action.index), swatch(hex), ...p.slice(action.index)])
    }
    case 'move': {
      const next = [...state.present]
      const [item] = next.splice(action.from, 1)
      next.splice(action.to, 0, item)
      return commit(state, next)
    }
    case 'undo': {
      if (!state.past.length) return state
      const prev = state.past[state.past.length - 1]
      return { ...state, past: state.past.slice(0, -1), present: prev, future: [state.present, ...state.future] }
    }
    case 'redo': {
      if (!state.future.length) return state
      const [next, ...rest] = state.future
      return { ...state, past: [...state.past, state.present], present: next, future: rest }
    }
    case 'jump': {
      // jump to an entry in past; everything after it (incl. present) becomes future
      const i = action.pastIndex
      if (i < 0 || i >= state.past.length) return state
      return {
        ...state,
        present: state.past[i],
        past: state.past.slice(0, i),
        future: [...state.past.slice(i + 1), state.present, ...state.future],
      }
    }
    case 'restore':
      return { ...action.state, editing: false }
  }
}

/** A brand-new generator state (random palette, default settings) for a fresh project. */
export function freshSnapshot(): import('../lib/storage').GeneratorSnapshot {
  const s = initialState()
  return { present: s.present, past: [], future: [], mode: 'auto', format: 'hex', vision: 'normal' }
}
