import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { readableOn, shadeStrip, swatchLabel, type FormatId } from '../../lib/color'
import type { Swatch } from '../../lib/storage'
import { Icon } from '../Icon'
import { ColorField, Popover, useCopy } from '../ui'

type Props = {
  swatch: Swatch
  display: string
  name: string
  format: FormatId
  index: number
  count: number
  canRemove: boolean
  canInsert: boolean
  onEdit: (hex: string) => void
  onBeginEdit: () => void
  onEndEdit: () => void
  onPick: (hex: string) => void
  onLock: () => void
  onRemove: () => void
  onInsert: (index: number) => void
}

export function SwatchColumn(p: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: p.swatch.id })
  const [picker, setPicker] = useState(false)
  const [shades, setShades] = useState(false)
  const copy = useCopy()
  const fg = readableOn(p.display)
  const hex = p.swatch.hex

  useEffect(() => {
    if (!shades) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShades(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shades])

  const openPicker = () => {
    p.onBeginEdit()
    setPicker(true)
  }
  const closePicker = () => {
    setPicker(false)
    p.onEndEdit()
  }

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform && { ...transform, scaleX: 1, scaleY: 1 }),
    transition,
    background: p.display,
    color: fg,
    zIndex: isDragging ? 5 : undefined,
    ['--fg' as string]: fg,
  }

  return (
    <div ref={setNodeRef} style={style} className={`swatch ${isDragging ? 'dragging' : ''} ${p.swatch.locked ? 'is-locked' : ''}`}>
      {p.canInsert && (
        <button className="insert-btn insert-left" onClick={() => p.onInsert(p.index)} aria-label={`Insert colour before ${hex}`} title="Insert colour here">
          <Icon name="plus" size={16} />
        </button>
      )}
      {p.canInsert && p.index === p.count - 1 && (
        <button className="insert-btn insert-right" onClick={() => p.onInsert(p.count)} aria-label="Insert colour at end" title="Insert colour here">
          <Icon name="plus" size={16} />
        </button>
      )}

      {shades ? (
        <div className="shade-strip" role="listbox" aria-label={`Shades of ${hex}`}>
          {shadeStrip(hex).map((s, i) => (
            <button
              key={i}
              role="option"
              aria-selected={s.original}
              className={`shade ${s.original ? 'current' : ''}`}
              style={{ background: s.hex, color: readableOn(s.hex) }}
              onClick={() => {
                if (!s.original) p.onPick(s.hex)
                setShades(false)
              }}
            >
              <span>{s.hex.slice(1).toUpperCase()}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="swatch-tools">
            <button className="tool" onClick={p.onRemove} disabled={!p.canRemove} title="Remove colour" aria-label="Remove colour">
              <Icon name="x" />
            </button>
            <button className="tool" onClick={() => setShades(true)} title="View shades" aria-label="View shades">
              <Icon name="grid" />
            </button>
            <button className="tool drag" ref={setActivatorNodeRef} {...attributes} {...listeners} title="Drag to reorder" aria-label="Drag to reorder">
              <Icon name="drag" />
            </button>
            <button className="tool" onClick={() => copy(hex.toUpperCase())} title="Copy HEX" aria-label="Copy HEX">
              <Icon name="copy" />
            </button>
            <Link className="tool" to={`/color/${hex.slice(1)}`} title="Colour details" aria-label="Colour details">
              <Icon name="info" />
            </Link>
            <button className={`tool lock ${p.swatch.locked ? 'on' : ''}`} onClick={p.onLock} title={p.swatch.locked ? 'Unlock' : 'Lock'} aria-label={p.swatch.locked ? 'Unlock colour' : 'Lock colour'} aria-pressed={p.swatch.locked}>
              <Icon name={p.swatch.locked ? 'lock' : 'unlock'} />
            </button>
          </div>

          <div className="swatch-info">
            <button className="swatch-hex" onClick={openPicker} title="Edit colour">
              {swatchLabel(hex, p.format)}
            </button>
            <div className="swatch-name">{p.name || ' '}</div>
            {p.display !== hex && <div className="swatch-sim">shown as {p.display.toUpperCase()}</div>}
          </div>

          {picker && (
            <Popover onClose={closePicker} className="swatch-picker">
              <ColorField value={hex} onChange={p.onEdit} />
              <button className="btn btn-primary btn-block" onClick={closePicker}>
                Done
              </button>
            </Popover>
          )}
        </>
      )}
    </div>
  )
}
