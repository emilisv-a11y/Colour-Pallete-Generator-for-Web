import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionPreview } from '../components/divi/LayoutsDark'
import { Icon } from '../components/Icon'
import { useSwitchProject } from '../components/projects/ProjectsUI'
import { Segmented, useToast } from '../components/ui'
import { KIT_GROUPS, type KitGroup, type StarterKit } from '../data/starterKits'
import { LAYOUTS } from '../lib/diviLayouts'
import { fontStack, loadFonts } from '../lib/fonts'
import { loadLibrary } from '../lib/googleFonts'
import { newProject } from '../lib/projects'
import { kitProjectData, kitSystem, STARTER_KITS } from '../lib/starterKits'

function KitCard({ kit, onUse }: { kit: StarterKit; onUse: (k: StarterKit) => void }) {
  const sys = useMemo(() => kitSystem(kit), [kit])
  const hero = LAYOUTS.find((l) => l.id === 'hero')!
  return (
    <article className="kit-card">
      <div className="lp-stage kit-stage">
        <SectionPreview spec={{ ...hero, rows: [{ ...hero.rows[0], cols: [{ ...hero.rows[0].cols[0], items: [{ type: 'heading', level: 1, text: kit.name }, { type: 'text', html: `<p>${kit.for}</p>` }, { type: 'button', text: 'Book now', variant: 'light' }] }] }] }} sys={sys} />
      </div>
      <div className="kit-body">
        <div className="kit-swatches">
          {kit.palette.map((h) => (
            <span key={h} style={{ background: h }} title={h} />
          ))}
        </div>
        <strong>{kit.name}</strong>
        <span className="muted small">{kit.for}</span>
        <span className="small">
          <span style={{ fontFamily: fontStack(kit.fonts.heading, sys.fonts.meta), fontWeight: 700 }}>{kit.fonts.heading}</span> + <span style={{ fontFamily: fontStack(kit.fonts.body, sys.fonts.meta) }}>{kit.fonts.body}</span> · radius {kit.radius}px
        </span>
        <details>
          <summary className="small">Tips for this kit</summary>
          <ul className="small kit-tips">
            {kit.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
        <button className="btn btn-primary" type="button" onClick={() => onUse(kit)}>
          <Icon name="plus" size={16} /> Start a project with this kit
        </button>
      </div>
    </article>
  )
}

export default function StarterKitsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const switchTo = useSwitchProject()
  const [group, setGroup] = useState<KitGroup | 'all'>('all')
  const [, setReady] = useState(0)
  useEffect(() => {
    loadFonts([...new Set(STARTER_KITS.flatMap((k) => [k.fonts.heading, k.fonts.body]))])
    loadLibrary()
      .then(() => setReady((r) => r + 1))
      .catch(() => {})
  }, [])
  const kits = STARTER_KITS.filter((k) => group === 'all' || k.group === group)

  const use = (kit: StarterKit) => {
    const name = prompt('Name for the new project (e.g. the client’s name)', kit.name)
    if (name === null) return
    const p = newProject({ name: name.trim() || kit.name, notes: `Started from the “${kit.name}” starter kit.`, status: 'draft' }, kitProjectData(kit, name.trim() || kit.name))
    switchTo(p.id, true)
    toast(`Created “${p.name}” from the ${kit.name} kit`)
    navigate('/system')
  }

  return (
    <div className="page starter-page">
      <header className="page-head">
        <h1>Starter kits</h1>
        <p className="muted">A hand-picked palette, font pairing, shape and section plan for common client types. Pick one to start a new project, then make it your client's own in the Design system.</p>
      </header>
      <Segmented label="Industry" value={group} onChange={setGroup} options={[{ id: 'all', label: 'All' }, ...KIT_GROUPS.map((g) => ({ id: g.id, label: g.label }))]} />
      <div className="kit-grid">
        {kits.map((k) => (
          <KitCard key={k.id} kit={k} onUse={use} />
        ))}
      </div>
      <p className="muted small">Every font supports Lithuanian letters (Latin Extended). Colours are checked for readable text in light and dark mode once the project is created (Design system → Accessibility).</p>
    </div>
  )
}
