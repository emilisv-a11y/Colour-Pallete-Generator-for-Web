import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Site, tokenVars } from '../components/system/PreviewTab'
import { Segmented } from '../components/ui'
import { publicPost, publicReview, type ApiError, type PublicReview, type ReviewEvent } from '../lib/api'
import { fill } from '../lib/handoffText'
import { brandKitHtml, DEFAULT_PARTS } from '../lib/handoff'
import { loadFonts } from '../lib/fonts'
import { loadNames } from '../lib/names'
import { RT, type ReviewSnapshot } from '../lib/review'
import { buildTokens, systemFromPalette, type Mode } from '../lib/system'

const NAME_KEY = 'd5wt:reviewName'

function BrandFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [h, setH] = useState(900)
  useEffect(() => {
    const f = ref.current
    if (!f) return
    const fit = () => {
      const doc = f.contentDocument
      if (doc?.body) setH(doc.documentElement.scrollHeight + 4)
    }
    f.addEventListener('load', fit)
    const t = setInterval(fit, 800) // fonts may change the height after load
    return () => {
      f.removeEventListener('load', fit)
      clearInterval(t)
    }
  }, [html])
  return <iframe ref={ref} className="review-frame" srcDoc={html} style={{ height: h }} title="Brand guidelines" />
}

function Thread({ events, item, t }: { events: ReviewEvent[]; item: string; t: (typeof RT)['en'] }) {
  const list = events.filter((e) => e.kind === 'comment' && e.item === item)
  if (!list.length) return <p className="muted small" style={{ margin: 0 }}>{t.noComments}</p>
  return (
    <ul className="review-thread">
      {list.map((e) => (
        <li key={e.id} className={e.fromOwner ? 'owner' : ''}>
          <strong>{e.fromOwner ? `${e.author} · ${t.designer}` : e.author}</strong>
          <span className="muted small"> {new Date(e.at.replace(' ', 'T')).toLocaleString()}</span>
          <p>{e.body}</p>
        </li>
      ))}
    </ul>
  )
}

export default function ReviewPage() {
  const { token = '' } = useParams()
  const [data, setData] = useState<PublicReview<ReviewSnapshot> | null>(null)
  const [state, setState] = useState<'loading' | 'pin' | 'expired' | 'missing' | 'ok'>('loading')
  const [lang, setLang] = useState<'en' | 'lt'>('en')
  const [pin, setPin] = useState(() => sessionStorage.getItem(`d5wt:pin:${token}`) ?? '')
  const [pinError, setPinError] = useState(false)
  const [name, setNameState] = useState(() => localStorage.getItem(NAME_KEY) ?? '')
  const [mode, setMode] = useState<Mode>('light')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const t = RT[lang]

  const setName = (v: string) => {
    setNameState(v)
    localStorage.setItem(NAME_KEY, v)
  }

  const load = async (p = pin) => {
    try {
      const r = await publicReview<ReviewSnapshot>(token, p || undefined)
      setData(r)
      setLang(r.lang)
      setState('ok')
      if (p) sessionStorage.setItem(`d5wt:pin:${token}`, p)
    } catch (e) {
      const err = e as ApiError
      if (err.data?.lang === 'lt' || err.data?.lang === 'en') setLang(err.data.lang as 'en' | 'lt')
      if (err.status === 401 && err.data?.pin) {
        setPinError(!!p)
        setState('pin')
      } else setState(err.status === 410 ? 'expired' : 'missing')
    }
  }

  useEffect(() => {
    document.title = 'Design review'
    loadNames()
    load()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const snap = data?.snapshot
  useEffect(() => {
    if (snap) {
      loadFonts([snap.system.fonts.heading, snap.system.fonts.body], snap.system.fonts.meta)
      document.title = `${t.designReview} · ${snap.project.name}`
    }
  }, [snap]) // eslint-disable-line react-hooks/exhaustive-deps

  const brandHtml = useMemo(() => (snap ? brandKitHtml({ project: { ...snap.project, notes: '' }, sys: snap.system }, lang, { ...DEFAULT_PARTS, fonts: false }) : ''), [snap, lang])
  const optionSystems = useMemo(() => (snap?.options ?? []).map((o) => ({ o, sys: o.id === 'system' ? snap!.system : { ...systemFromPalette(o.colors, o.label), fonts: snap!.system.fonts, radius: snap!.system.radius } })), [snap])

  const post = async (kind: 'comment' | 'choice' | 'approve', item: string, body?: string) => {
    if (!name.trim()) {
      setFlash(t.namePrompt)
      document.getElementById('review-name')?.focus()
      return false
    }
    const r = await publicPost(token, { kind, item, author: name.trim(), body }, pin || undefined)
    setData((d) => (d ? { ...d, events: r.events, approval: r.approval } : d))
    setFlash(t.thanks)
    setTimeout(() => setFlash(''), 2500)
    return true
  }

  if (state === 'loading') return <div className="review-page"><p className="muted">…</p></div>
  if (state === 'expired' || state === 'missing')
    return (
      <div className="review-page">
        <div className="review-card">
          <h1>{t.designReview}</h1>
          <p>{state === 'expired' ? t.expired : t.notFound}</p>
        </div>
      </div>
    )
  if (state === 'pin')
    return (
      <div className="review-page">
        <form
          className="review-card stack review-pin"
          onSubmit={(e) => {
            e.preventDefault()
            load(pin)
          }}
        >
          <h1>{t.pinTitle}</h1>
          <label className="field">
            <span className="field-label">{t.pinLabel}</span>
            <input value={pin} onChange={(e) => setPin(e.target.value)} autoFocus inputMode="text" autoComplete="one-time-code" />
          </label>
          {pinError && <div className="form-error">{t.wrongPin}</div>}
          <button className="btn btn-primary" type="submit">
            {t.open}
          </button>
        </form>
      </div>
    )

  const s = snap!
  const myChoice = [...(data?.events ?? [])].reverse().find((e) => e.kind === 'choice' && e.author === name.trim())
  const latestChoices = new Map<string, string>()
  ;(data?.events ?? []).filter((e) => e.kind === 'choice').forEach((e) => latestChoices.set(e.author, e.item))
  const commentBox = (item: string) => (
    <form
      className="review-comment"
      onSubmit={async (e) => {
        e.preventDefault()
        const body = (drafts[item] ?? '').trim()
        if (!body) return
        if (await post('comment', item, body)) setDrafts((d) => ({ ...d, [item]: '' }))
      }}
    >
      <textarea rows={2} placeholder={t.writeComment} value={drafts[item] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [item]: e.target.value }))} aria-label={t.writeComment} />
      <button className="btn" type="submit">
        {t.send}
      </button>
    </form>
  )

  return (
    <div className="review-page">
      <header className="review-head">
        <div>
          <span className="muted small">
            {t.designReview}
            {s.project.client && ` · ${s.project.client}`}
          </span>
          <h1>{s.project.name}</h1>
          <span className="muted small">{fill(t.version, { date: new Date(s.createdAt).toLocaleDateString(lang === 'lt' ? 'lt-LT' : 'en-GB') })}</span>
        </div>
        <label className="field review-name">
          <span className="field-label">{t.yourName}</span>
          <input id="review-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
      </header>
      {data?.approval && <div className="review-approved">✓ {fill(t.approvedBy, { name: data.approval.author, date: new Date(data.approval.at.replace(' ', 'T')).toLocaleDateString(lang === 'lt' ? 'lt-LT' : 'en-GB') })}</div>}
      {flash && <div className="review-flash" role="status">{flash}</div>}
      <p className="review-intro">{s.intro || t.defaultIntro}</p>
      <nav className="review-nav">
        {s.sections.brand && <a href={`#/review/${token}`} onClick={(e) => (e.preventDefault(), document.getElementById('r-brand')?.scrollIntoView({ behavior: 'smooth' }))}>{t.brand}</a>}
        {s.sections.preview && <a href={`#/review/${token}`} onClick={(e) => (e.preventDefault(), document.getElementById('r-preview')?.scrollIntoView({ behavior: 'smooth' }))}>{t.preview}</a>}
        {s.sections.options && s.options.length > 0 && <a href={`#/review/${token}`} onClick={(e) => (e.preventDefault(), document.getElementById('r-options')?.scrollIntoView({ behavior: 'smooth' }))}>{t.options}</a>}
        <a href={`#/review/${token}`} onClick={(e) => (e.preventDefault(), document.getElementById('r-approve')?.scrollIntoView({ behavior: 'smooth' }))}>{t.approval}</a>
      </nav>

      {s.sections.brand && (
        <section id="r-brand" className="review-section">
          <h2>{t.brand}</h2>
          <BrandFrame html={brandHtml} />
          <h3>{t.comments}</h3>
          <Thread events={data!.events} item="brand" t={t} />
          {commentBox('brand')}
        </section>
      )}

      {s.sections.preview && (
        <section id="r-preview" className="review-section">
          <div className="row space-between wrap">
            <h2 style={{ margin: 0 }}>{t.preview}</h2>
            <Segmented
              label="Mode"
              value={mode}
              onChange={setMode}
              options={[
                { id: 'light', label: t.light },
                { id: 'dark', label: t.dark },
              ]}
            />
          </div>
          <p className="muted small">{t.previewNote}</p>
          <div className="pv-frame" style={tokenVars(buildTokens(s.system, mode), s.system)}>
            <Site />
          </div>
          <h3>{t.comments}</h3>
          <Thread events={data!.events} item="preview" t={t} />
          {commentBox('preview')}
        </section>
      )}

      {s.sections.options && s.options.length > 0 && (
        <section id="r-options" className="review-section">
          <h2>{t.options}</h2>
          <p className="muted small">{t.optionsNote}</p>
          <div className="review-options">
            {optionSystems.map(({ o, sys }) => {
              const chosenBy = [...latestChoices.entries()].filter(([, item]) => item === `option:${o.id}`).map(([a]) => a)
              const mine = myChoice?.item === `option:${o.id}`
              return (
                <article key={o.id} className={`review-option ${mine ? 'mine' : ''}`}>
                  <div className="review-option-swatches">
                    {o.colors.map((h, i) => (
                      <span key={i} style={{ background: h }} />
                    ))}
                  </div>
                  <div className="review-option-preview" aria-hidden="true" inert>
                    <div className="pv-frame" style={tokenVars(buildTokens(sys, 'light'), sys)}>
                      <Site />
                    </div>
                  </div>
                  <div className="review-option-body">
                    <strong>{o.label}</strong>
                    {chosenBy.length > 0 && (
                      <span className="muted small">
                        {t.chosenBy}: {chosenBy.join(', ')}
                      </span>
                    )}
                    <button className={`btn ${mine ? '' : 'btn-primary'}`} disabled={mine} onClick={() => post('choice', `option:${o.id}`)}>
                      {mine ? `✓ ${t.yourChoice}` : t.choose}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
          <h3>{t.comments}</h3>
          <Thread events={data!.events} item="options" t={t} />
          {commentBox('options')}
        </section>
      )}

      <section id="r-approve" className="review-section">
        <h2>{t.general}</h2>
        <Thread events={data!.events} item="general" t={t} />
        {commentBox('general')}
        <div className="review-approve">
          <h2>{t.approval}</h2>
          <p className="muted small">{t.approveNote}</p>
          <textarea rows={2} placeholder={t.note} value={note} onChange={(e) => setNote(e.target.value)} aria-label={t.note} />
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (await post('approve', 'general', note.trim() || undefined)) setNote('')
            }}
          >
            ✓ {t.approve}
          </button>
        </div>
      </section>
      <p className="muted small review-foot">D5 WebTool</p>
    </div>
  )
}
