import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ColorField, useCopy } from '../components/ui'
import { contrastRatio, fixContrast, normalizeHex, ratingLabel, wcagLevels } from '../lib/color'
import { getContrastPair, setContrastPair } from '../lib/storage'
import { useGenerator } from '../state/GeneratorContext'

function Check({ ok, label, need }: { ok: boolean; label: string; need: string }) {
  return (
    <div className={`check ${ok ? 'pass' : 'fail'}`}>
      <span className="check-icon">{ok ? <Icon name="check" size={16} /> : <Icon name="x" size={16} />}</span>
      <div>
        <strong>{label}</strong>
        <div className="small muted">{need}</div>
      </div>
      <span className="check-state">{ok ? 'Pass' : 'Fail'}</span>
    </div>
  )
}

export default function ContrastPage() {
  const params = useParams()
  const navigate = useNavigate()
  const copy = useCopy()
  const { state } = useGenerator()
  const saved = getContrastPair()
  const [fg, setFg] = useState(normalizeHex(params.fg ?? '') ?? saved.fg)
  const [bg, setBg] = useState(normalizeHex(params.bg ?? '') ?? saved.bg)

  useEffect(() => {
    setContrastPair({ fg, bg })
    const t = setTimeout(() => navigate(`/contrast/${fg.slice(1)}/${bg.slice(1)}`, { replace: true }), 200)
    return () => clearTimeout(t)
  }, [fg, bg, navigate])

  const ratio = contrastRatio(fg, bg)
  const lv = wcagLevels(ratio)
  const rating = ratingLabel(ratio)
  const fixAA = fixContrast(fg, bg, 4.5)
  const fixAAA = fixContrast(fg, bg, 7)
  const fixBgAA = fixContrast(bg, fg, 4.5)
  const paletteHexes = state.present.map((s) => s.hex)

  return (
    <div className="page contrast-page">
      <header className="page-head">
        <h1>Contrast checker</h1>
        <p className="muted">Check text and background colours against WCAG 2.2. Values stay in the link so you can share a pair.</p>
      </header>

      <div className="contrast-layout">
        <div className="contrast-inputs">
          <ColorField label="Text colour" value={fg} onChange={setFg} />
          <button
            className="icon-btn swap-btn"
            onClick={() => {
              setFg(bg)
              setBg(fg)
            }}
            title="Swap colours"
            aria-label="Swap colours"
          >
            <Icon name="swap" />
          </button>
          <ColorField label="Background colour" value={bg} onChange={setBg} />
          <div className="palette-pick">
            <span className="field-label">From current palette (click = text, right-click = background)</span>
            <div className="row wrap">
              {paletteHexes.map((h, i) => (
                <button
                  key={i}
                  className="chip-btn"
                  style={{ background: h }}
                  title={`${h.toUpperCase()}: click for text, right-click for background`}
                  aria-label={`Use ${h} as text colour`}
                  onClick={() => setFg(h)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setBg(h)
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="contrast-result">
          <div className="ratio-card" style={{ background: bg, color: fg }}>
            <div className="ratio">{ratio.toFixed(2)}<span>:1</span></div>
            <div className={`badge big ${rating === 'Fail' ? 'fail' : 'pass'}`}>{rating}</div>
          </div>

          <div className="preview-card" style={{ background: bg, color: fg }}>
            <h2 style={{ color: fg }}>The quick brown fox</h2>
            <p>
              Body text at 16px. Good contrast helps everyone read comfortably, including people with low vision and anyone viewing a screen in bright sunlight.
            </p>
            <p className="small">Small print at 13px is the hardest to read.</p>
            <div className="row">
              <span className="preview-btn" style={{ background: fg, color: bg }}>
                Button
              </span>
              <span className="preview-btn outline" style={{ borderColor: fg, color: fg }}>
                Outline
              </span>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ color: fg }}>
                A text link
              </a>
            </div>
          </div>

          <div className="checks">
            <Check ok={lv.aaNormal} label="AA, normal text" need="4.5:1 for text under 24px (19px bold)" />
            <Check ok={lv.aaLarge} label="AA, large text" need="3:1 for text 24px+ (19px+ bold)" />
            <Check ok={lv.aaaNormal} label="AAA, normal text" need="7:1" />
            <Check ok={lv.aaaLarge} label="AAA, large text" need="4.5:1" />
            <Check ok={lv.ui} label="UI components & graphics" need="3:1 for icons, borders, focus rings" />
          </div>

          {(!lv.aaNormal || !lv.aaaNormal) && (
            <div className="fixes">
              <h3>Suggested fixes</h3>
              <p className="muted small">Same hue and saturation, with lightness changed only as much as needed.</p>
              <div className="row wrap">
                {!lv.aaNormal && fixAA && (
                  <button className="fix" onClick={() => setFg(fixAA)}>
                    <span className="chip" style={{ background: fixAA }} /> Text {fixAA.toUpperCase()} <span className="badge pass">AA</span>
                  </button>
                )}
                {!lv.aaNormal && fixBgAA && (
                  <button className="fix" onClick={() => setBg(fixBgAA)}>
                    <span className="chip" style={{ background: fixBgAA }} /> Background {fixBgAA.toUpperCase()} <span className="badge pass">AA</span>
                  </button>
                )}
                {!lv.aaaNormal && fixAAA && (
                  <button className="fix" onClick={() => setFg(fixAAA)}>
                    <span className="chip" style={{ background: fixAAA }} /> Text {fixAAA.toUpperCase()} <span className="badge pass">AAA</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <button className="btn" onClick={() => copy(`color: ${fg};\nbackground-color: ${bg};`, 'CSS')}>
            <Icon name="copy" size={16} /> Copy CSS
          </button>
        </div>
      </div>
    </div>
  )
}
