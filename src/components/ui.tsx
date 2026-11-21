import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { HexColorPicker } from 'react-colorful'
import { normalizeHex } from '../lib/color'
import { Icon } from './Icon'

/* ---------- Toasts ---------- */

const ToastCtx = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])
  const show = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-2), { id, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <Icon name="check" size={16} /> {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

export function useCopy() {
  const toast = useToast()
  return useCallback(
    async (text: string, label?: string) => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
      toast(`Copied ${label ?? text}`)
    },
    [toast],
  )
}

/* ---------- Modal ---------- */

export function Modal({
  title,
  onClose,
  children,
  wide,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.modal-close)')?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

/* ---------- Popover (click-outside to close) ---------- */

export function Popover({
  onClose,
  children,
  className = '',
  style,
}: {
  onClose: () => void
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    // defer so the click that opened the popover doesn't close it
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  return (
    <div ref={ref} className={`popover ${className}`} style={style} onKeyDown={(e) => e.stopPropagation()}>
      {children}
    </div>
  )
}

/* ---------- Colour input: picker + text field ---------- */

export function ColorField({ value, onChange, label }: { value: string; onChange: (hex: string) => void; label?: string }) {
  const [text, setText] = useState(value.toUpperCase())
  const [focused, setFocused] = useState(false)
  // keep text in sync when value changes externally (but not while typing)
  const shown = focused ? text : value.toUpperCase()
  return (
    <div className="color-field">
      <HexColorPicker color={value} onChange={(h) => onChange(h.toLowerCase())} />
      <label className="field">
        {label && <span className="field-label">{label}</span>}
        <span className="color-text">
          <span className="chip" style={{ background: value }} />
          <input
            value={shown}
            spellCheck={false}
            aria-label={label ?? 'Colour value'}
            onFocus={() => {
              setText(value.toUpperCase())
              setFocused(true)
            }}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setText(e.target.value)
              const hex = normalizeHex(e.target.value)
              if (hex) onChange(hex)
            }}
          />
        </span>
      </label>
    </div>
  )
}

/* ---------- Code block ---------- */

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const copy = useCopy()
  return (
    <div className="code-block">
      <button className="btn btn-small code-copy" onClick={() => copy(code, label ?? 'code')}>
        <Icon name="copy" size={14} /> Copy
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
