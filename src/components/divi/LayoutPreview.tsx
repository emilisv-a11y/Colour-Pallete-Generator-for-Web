import { useEffect, useMemo, useRef, useState } from 'react'
import { layoutDocument } from '../../lib/layoutHtml'
import type { DesignSystem, Mode } from '../../lib/system'
import { Icon } from '../Icon'
import { Segmented } from '../ui'

const DEVICES = [
  { id: 'desktop', label: 'Desktop', w: 1280 },
  { id: 'tablet', label: 'Tablet', w: 820 },
  { id: 'phone', label: 'Phone', w: 390 },
] as const
type Device = (typeof DEVICES)[number]['id']

/**
 * Full-size preview of sections or a whole page in an iframe: real fluid sizes, hover states,
 * dark mode and phone stacking. The frame is scaled down to fit the window when it's wider.
 */
export function LayoutPreview({ sys, ids, title, onClose, onDownload, busy }: { sys: DesignSystem; ids: string[]; title: string; onClose: () => void; onDownload?: () => void; busy?: boolean }) {
  const [device, setDevice] = useState<Device>(() => (window.innerWidth < 700 ? 'phone' : 'desktop'))
  const [mode, setMode] = useState<Mode>('light')
  const [height, setHeight] = useState(800)
  const [avail, setAvail] = useState(1000)
  const stage = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const w = DEVICES.find((d) => d.id === device)!.w
  const scale = Math.min(1, avail / w)
  const doc = useMemo(() => layoutDocument(sys, ids, mode), [sys, ids, mode])

  useEffect(() => {
    const el = stage.current
    if (!el) return
    // width inside the padding
    const measure = () => {
      const cs = getComputedStyle(el)
      setAvail(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])
  // fit the frame to its content (fonts can change the height after load)
  useEffect(() => {
    const f = frame.current
    if (!f) return
    const fit = () => {
      const h = f.contentDocument?.documentElement.scrollHeight
      if (h) setHeight(h)
    }
    f.addEventListener('load', fit)
    const t = setInterval(fit, 700)
    return () => {
      f.removeEventListener('load', fit)
      clearInterval(t)
    }
  }, [doc, device])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="lpv-backdrop" role="dialog" aria-modal="true" aria-label={`Preview: ${title}`}>
      <div className="lpv">
        <header className="lpv-head">
          <strong className="lpv-title">{title}</strong>
          <Segmented label="Screen width" value={device} onChange={setDevice} options={DEVICES.map((d) => ({ id: d.id, label: d.label }))} />
          <Segmented
            label="Colour mode"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
            ]}
          />
          <span className="lpv-actions">
            {onDownload && (
              <button className="btn btn-primary btn-small" type="button" onClick={onDownload} disabled={busy}>
                <Icon name="download" size={14} /> {busy ? 'Preparing…' : 'Download'}
              </button>
            )}
            <button className="icon-btn" type="button" onClick={onClose} aria-label="Close preview">
              <Icon name="x" />
            </button>
          </span>
        </header>
        <div className="lpv-body" ref={stage}>
          <div className="lpv-device" style={{ width: w * scale, height: height * scale }}>
            <iframe ref={frame} title={`Preview of ${title}`} srcDoc={doc} style={{ width: w, height, transform: `scale(${scale})` }} />
          </div>
          <p className="muted small lpv-note">
            {w}px wide{scale < 1 ? `, shown at ${Math.round(scale * 100)}%` : ''}. Hover buttons, links and cards to see their states. Pictures and text are placeholders; fonts, colours, sizes and hover styles are your design system's.
          </p>
        </div>
      </div>
    </div>
  )
}
