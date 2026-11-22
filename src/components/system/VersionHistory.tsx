import { useState } from 'react'
import { getSystem, setSystem, useStorageVersion } from '../../lib/storage'
import { buildScales, ROLE_KEYS, type DesignSystem } from '../../lib/system'
import { deleteVersion, diffSystems, getVersions, renameVersion, saveVersion, type SystemVersion } from '../../lib/versions'
import { Icon } from '../Icon'
import { Modal, useToast } from '../ui'

const when = (at: number) => new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Strip({ sys }: { sys: DesignSystem }) {
  const sc = buildScales(sys)
  return (
    <div className="vh-strip" aria-hidden="true">
      {ROLE_KEYS.slice(0, 4).map((r) => (
        <span key={r} style={{ background: sc[r][5] }} />
      ))}
    </div>
  )
}

export function VersionHistory({ onClose }: { onClose: () => void }) {
  useStorageVersion()
  const toast = useToast()
  const current = getSystem()
  const versions = getVersions()
  const [picked, setPicked] = useState<string | null>(versions[0]?.id ?? null)
  const [label, setLabel] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const sel: SystemVersion | undefined = versions.find((v) => v.id === picked)
  const changes = current && sel ? diffSystems(sel.system, current) : []
  const areas = [...new Set(changes.map((c) => c.area))]

  if (!current) return null
  return (
    <Modal title="Version history" onClose={onClose} wide>
      <div className="stack">
        <form
          className="row wrap"
          onSubmit={(e) => {
            e.preventDefault()
            const v = saveVersion(current, label || `Version ${versions.filter((x) => !x.auto).length + 1}`)
            setLabel('')
            setPicked(v.id)
            toast('Version saved')
          }}
        >
          <input className="grow" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name this version, e.g. “Sent to client 12 May”" aria-label="Version name" />
          <button className="btn btn-primary" type="submit">
            <Icon name="save" size={16} /> Save current version
          </button>
        </form>
        <p className="muted small" style={{ margin: 0 }}>
          A version is also kept automatically before you start editing (at most every 15 minutes). Versions belong to this project and sync with it.
        </p>
        {versions.length === 0 ? (
          <p className="muted">No versions yet. Save one before big changes, or just keep working: one is made automatically.</p>
        ) : (
          <div className="vh-layout">
            <ul className="vh-list">
              {versions.map((v) => (
                <li key={v.id} className={v.id === picked ? 'on' : ''}>
                  <button type="button" className="vh-item" onClick={() => setPicked(v.id)}>
                    <Strip sys={v.system} />
                    <span className="vh-text">
                      {editing === v.id ? (
                        <input
                          autoFocus
                          defaultValue={v.label}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => (renameVersion(v.id, e.target.value || v.label), setEditing(null))}
                          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                          aria-label="Version name"
                        />
                      ) : (
                        <strong>{v.label}</strong>
                      )}
                      <span className="muted small">
                        {when(v.at)}
                        {v.auto ? ' · automatic' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="vh-detail">
              {sel && (
                <>
                  <div className="row wrap space-between">
                    <div>
                      <strong>{sel.label}</strong>
                      <div className="muted small">{when(sel.at)}</div>
                    </div>
                    <div className="row wrap">
                      <button className="btn btn-small" type="button" onClick={() => setEditing(sel.id)}>
                        Rename
                      </button>
                      <button
                        className="btn btn-small"
                        type="button"
                        onClick={() => {
                          if (!confirm(`Delete “${sel.label}”?`)) return
                          deleteVersion(sel.id)
                          setPicked(versions.find((v) => v.id !== sel.id)?.id ?? null)
                        }}
                      >
                        Delete
                      </button>
                      <button
                        className="btn btn-primary btn-small"
                        type="button"
                        disabled={!changes.length}
                        onClick={() => {
                          if (!confirm(`Restore “${sel.label}”? The current design system is saved as a version first, so you can switch back.`)) return
                          saveVersion(current, `Before restoring “${sel.label}”`)
                          setSystem(structuredClone(sel.system))
                          toast(`Restored “${sel.label}”`)
                          onClose()
                        }}
                      >
                        <Icon name="undo" size={14} /> Restore this version
                      </button>
                    </div>
                  </div>
                  {changes.length === 0 ? (
                    <p className="muted">Same as the current design system.</p>
                  ) : (
                    <>
                      <p className="muted small" style={{ margin: 0 }}>
                        {changes.length} difference{changes.length === 1 ? '' : 's'} between this version (left) and now (right):
                      </p>
                      {areas.map((a) => (
                        <div key={a} className="vh-area">
                          <span className="field-label">{a}</span>
                          <ul className="vh-changes">
                            {changes
                              .filter((c) => c.area === a)
                              .map((c) => (
                                <li key={c.label}>
                                  <span className="vh-label">{c.label}</span>
                                  <span className="vh-vals">
                                    {c.colour && c.before !== '—' && <span className="chip" style={{ background: c.before }} />}
                                    <span className="muted">{c.before}</span>
                                    <span aria-hidden="true">→</span>
                                    {c.colour && c.after !== '—' && <span className="chip" style={{ background: c.after }} />}
                                    <span>{c.after}</span>
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
