import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { reviewEvents, reviewReply, reviewsCreate, reviewsDelete, reviewsList, reviewsUpdate, reviewUrl, type Review, type ReviewEvent } from '../../lib/api'
import type { Lang } from '../../lib/handoffText'
import { projectSystem, updateProject, type Project } from '../../lib/projects'
import { buildSnapshot, RT, systemOption, type ReviewOption } from '../../lib/review'
import { getPalettes } from '../../lib/storage'
import { useGenerator } from '../../state/GeneratorContext'
import { useSync } from '../../state/SyncContext'
import { Icon } from '../Icon'
import { Modal, Segmented, useCopy, useToast } from '../ui'

const itemLabel = (item: string, opts: { id: string; label: string }[]) =>
  item === 'brand' ? 'Brand guidelines' : item === 'preview' ? 'Website preview' : item === 'options' ? 'Colour options' : item.startsWith('option:') ? `Option “${opts.find((o) => `option:${o.id}` === item)?.label ?? item.slice(7)}”` : 'General'

function Feedback({ review, onChanged, names }: { review: Review; onChanged: () => void; names: { id: string; label: string }[] }) {
  const [events, setEvents] = useState<ReviewEvent[] | null>(null)
  const [reply, setReply] = useState('')
  const [item, setItem] = useState('general')
  useEffect(() => {
    reviewEvents(review.id).then((r) => setEvents(r.events))
  }, [review.id])
  if (!events) return <p className="muted small">Loading feedback…</p>
  return (
    <div className="review-feedback">
      {events.length === 0 && <p className="muted small">No feedback yet.</p>}
      <ul className="review-thread">
        {events.map((e) => (
          <li key={e.id} className={e.fromOwner ? 'owner' : e.kind}>
            <strong>{e.author}</strong>{' '}
            <span className="muted small">
              {e.kind === 'approve' ? '✓ approved' : e.kind === 'choice' ? `chose ${itemLabel(e.item, names)}` : `on ${itemLabel(e.item, names)}`} · {new Date(e.at.replace(' ', 'T')).toLocaleString()}
            </span>
            {e.body && <p>{e.body}</p>}
          </li>
        ))}
      </ul>
      <form
        className="row wrap"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!reply.trim()) return
          setEvents((await reviewReply(review.id, item, reply.trim())).events)
          setReply('')
          onChanged()
        }}
      >
        <select value={item} onChange={(e) => setItem(e.target.value)} aria-label="Reply to section">
          {['general', 'brand', 'preview', 'options'].map((i) => (
            <option key={i} value={i}>
              {itemLabel(i, [])}
            </option>
          ))}
        </select>
        <input className="grow" placeholder="Reply to the client…" value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Reply" />
        <button className="btn" type="submit">
          Reply
        </button>
      </form>
    </div>
  )
}

export function ClientReviewModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const sync = useSync()
  const gen = useGenerator()
  const toast = useToast()
  const copy = useCopy()
  const navigate = useNavigate()
  const sys = projectSystem(project, gen.snapshot())
  const palettes = getPalettes().filter((p) => p.projectId === project.id)
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  // new link form
  const [title, setTitle] = useState('')
  const [lang, setLang] = useState<Lang>('en')
  const [sections, setSections] = useState({ brand: true, preview: true, options: palettes.length > 0 })
  const [chosen, setChosen] = useState<string[]>(['system', ...palettes.slice(0, 2).map((p) => p.id)])
  const [intro, setIntro] = useState('')
  const [pin, setPin] = useState('')
  const [expires, setExpires] = useState('')

  const refresh = () =>
    reviewsList(project.id)
      .then((r) => setReviews(r.reviews))
      .catch((e) => setError(e.message))
  useEffect(() => {
    if (sync.user) refresh()
  }, [sync.user]) // eslint-disable-line react-hooks/exhaustive-deps

  const options = (): ReviewOption[] => {
    if (!sys) return []
    const all: ReviewOption[] = [systemOption(sys, `${project.name} (design system)`), ...palettes.map((p) => ({ id: p.id, label: p.name, colors: p.colors }))]
    return all.filter((o) => chosen.includes(o.id))
  }
  const snapshot = () => buildSnapshot({ project: { name: project.name, client: project.client, website: project.website }, system: sys!, sections, options: options(), intro: intro.trim() })

  if (!sync.available || !sync.user) {
    return (
      <Modal title="Client review" onClose={onClose}>
        <p>Client review links need the D5 WebTool server and you to be signed in.</p>
        {sync.available ? (
          <button className="btn btn-primary" onClick={() => (onClose(), navigate('/account'))}>
            Sign in
          </button>
        ) : (
          <p className="muted small">This copy of the app has no server. Open D5 WebTool on your own domain (Hostinger) to use review links.</p>
        )}
      </Modal>
    )
  }
  if (!sys) {
    return (
      <Modal title="Client review" onClose={onClose}>
        <p>“{project.name}” has no design system yet. Create one first; the review shows it to the client.</p>
      </Modal>
    )
  }

  return (
    <Modal title={`Client review · ${project.name}`} onClose={onClose} wide>
      <p className="muted small" style={{ margin: 0 }}>
        Send the client a private link. They can read the brand guidelines, try the website preview, pick between colour options, comment and approve. No account needed.
      </p>
      {error && <div className="form-error">{error}</div>}

      {reviews && reviews.length > 0 && (
        <ul className="review-links">
          {reviews.map((r) => {
            const expired = !!r.expiresAt && new Date(r.expiresAt.replace(' ', 'T')) < new Date()
            const state = !r.active ? 'Switched off' : expired ? 'Expired' : 'Active'
            return (
              <li key={r.id}>
                <div className="row space-between wrap">
                  <div>
                    <strong>{r.title || 'Review'}</strong> <span className={`tag ${state === 'Active' ? 'ok-tag' : ''}`}>{state}</span> {r.hasPin && <span className="tag">PIN</span>}{' '}
                    <span className="tag">{r.lang.toUpperCase()}</span>
                    <div className="muted small">
                      {r.views} views · {r.counts.comment} comments · {r.counts.choice} choices
                      {r.approval ? ` · ✓ approved by ${r.approval.author}` : ''}
                      {r.expiresAt ? ` · until ${r.expiresAt.slice(0, 10)}` : ''}
                    </div>
                  </div>
                  <div className="row wrap">
                    <button className="btn btn-small btn-primary" onClick={() => copy(reviewUrl(r.token), 'review link')}>
                      <Icon name="copy" size={14} /> Copy link
                    </button>
                    <a className="btn btn-small" href={reviewUrl(r.token)} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <button className="btn btn-small" onClick={() => setOpen(open === r.id ? null : r.id)}>
                      Feedback
                    </button>
                    <button
                      className="btn btn-small"
                      title="Replace what the client sees with the current design system and palettes"
                      onClick={async () => {
                        await reviewsUpdate(r.id, { snapshot: snapshot() })
                        toast('The client now sees the latest version')
                        refresh()
                      }}
                    >
                      Send latest version
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={async () => {
                        await reviewsUpdate(r.id, { active: !r.active })
                        refresh()
                      }}
                    >
                      {r.active ? 'Switch off' : 'Switch on'}
                    </button>
                    <button
                      className="icon-btn danger"
                      aria-label="Delete review link"
                      title="Delete link and its feedback"
                      onClick={async () => {
                        if (!confirm('Delete this review link and all its comments?')) return
                        await reviewsDelete(r.id)
                        refresh()
                      }}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
                {open === r.id && <Feedback review={r} onChanged={refresh} names={[{ id: 'system', label: `${project.name} (design system)` }, ...palettes.map((p) => ({ id: p.id, label: p.name }))]} />}
              </li>
            )
          })}
        </ul>
      )}
      {reviews && reviews.length === 0 && !creating && <p className="muted small">No review links yet.</p>}

      {!creating ? (
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} /> New review link
        </button>
      ) : (
        <form
          className="review-create stack"
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            try {
              const { review } = await reviewsCreate({
                projectId: project.id,
                title: title.trim() || `Review ${(reviews?.length ?? 0) + 1}`,
                lang,
                snapshot: snapshot(),
                pin: pin.trim() || null,
                expiresAt: expires || null,
              })
              copy(reviewUrl(review.token), 'review link')
              setCreating(false)
              setPin('')
              if (project.status === 'draft' || project.status === 'progress') updateProject(project.id, { status: 'handoff' })
              refresh()
            } catch (err) {
              setError((err as Error).message)
            }
          }}
        >
          <h3 style={{ margin: 0 }}>New review link</h3>
          <div className="row wrap">
            <label className="field grow">
              <span className="field-label">Title (for you)</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Review ${(reviews?.length ?? 0) + 1}`} />
            </label>
            <div className="field">
              <span className="field-label">Client's language</span>
              <Segmented
                label="Language"
                value={lang}
                onChange={setLang}
                options={[
                  { id: 'en', label: 'English' },
                  { id: 'lt', label: 'Lietuvių' },
                ]}
              />
            </div>
          </div>
          <div className="row wrap">
            {(
              [
                ['brand', 'Brand guidelines'],
                ['preview', 'Website preview (light + dark)'],
                ['options', 'Let the client pick between options'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="divi-check">
                <input type="checkbox" checked={sections[k]} onChange={(e) => setSections({ ...sections, [k]: e.target.checked })} /> {label}
              </label>
            ))}
          </div>
          {sections.options && (
            <div className="field">
              <span className="field-label">Options to compare (this project's saved palettes)</span>
              <div className="review-option-picks">
                {[{ id: 'system', name: `${project.name} (design system)`, colors: systemOption(sys, '').colors }, ...palettes].map((p) => (
                  <label key={p.id} className={`handoff-part ${chosen.includes(p.id) ? 'on' : ''}`}>
                    <input type="checkbox" checked={chosen.includes(p.id)} onChange={() => setChosen((c) => (c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id]))} />
                    <span>
                      <strong>{p.name}</strong>
                      <span className="mini-palette" style={{ height: 18, minWidth: 0 }}>
                        {p.colors.map((h, i) => (
                          <span key={i} style={{ background: h }} />
                        ))}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {palettes.length === 0 && <p className="muted small">Save palettes to this project (generator → Save) to offer more options.</p>}
            </div>
          )}
          <label className="field">
            <span className="field-label">Message to the client (optional)</span>
            <textarea rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder={RT[lang].defaultIntro} />
          </label>
          <div className="row wrap">
            <label className="field">
              <span className="field-label">PIN (optional)</span>
              <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="e.g. 4821" maxLength={12} />
            </label>
            <label className="field">
              <span className="field-label">Expires (optional)</span>
              <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </label>
          </div>
          <div className="row">
            <button className="btn" type="button" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit">
              Create link and copy it
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
