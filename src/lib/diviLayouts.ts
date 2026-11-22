/* ============================================================================
   Divi 5 layout library: ready-made sections built from the design system's
   presets, exported in the same format as a Divi 5 layout / Theme Builder export.

   Layout file (learned from a real export):
     { context: 'et_builder', data: { "<postId>": "<!-- wp:divi/placeholder -->…" },
       presets, global_colors, global_variables, page_settings_meta: null,
       canvases: { local: [], global: [] }, components: { items: [], order: [] }, images: {}, thumbnails: [] }
   Blocks are WordPress block comments with JSON attributes:
     <!-- wp:divi/section {"module":{…},"builderVersion":"5.x","modulePreset":["<presetId>"]} --> … <!-- /wp:divi/section -->
     <!-- wp:divi/heading {"title":{"innerContent":{"desktop":{"value":"Text"}}},…} /-->
   ========================================================================== */

import { buildDiviImport, colorRef, sectionStyles, latestVersion, stableId, type DiviBuild, type DiviExport, type DiviOptions, type DiviPreset } from './divi'
import { buildScales, buildTokens, type DesignSystem } from './system'
import { MORE_SECTIONS } from '../data/diviSections'

/* ---------- a small description of a section, used for both the file and the preview ---------- */

export type HeadingItem = { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string; tone?: 'muted' }
export type TextItem = { type: 'text'; html: string; tone?: 'muted' }
export type ButtonItem = { type: 'button'; text: string; variant: 'primary' | 'secondary' | 'outline' | 'light' }
export type AccordionItem = { type: 'accordion'; items: { title: string; html: string }[] }
/** A picture: the file carries a brand-tinted placeholder that Divi imports into the Media Library. */
export type ImageItem = { type: 'image'; kind: PlaceholderKind; ratio: number; label?: string }
export type Item = HeadingItem | TextItem | ButtonItem | AccordionItem | ImageItem

export type PlaceholderKind = 'photo' | 'avatar' | 'product' | 'logo'
/** tone = a coloured tile (bento grids); card = a raised surface card */
export type Col = { width: string; card?: boolean; tone?: 'surface' | 'subtle' | 'brand' | 'dark'; items: Item[] }
export type Row = { cols: Col[]; align?: 'center' }
export type SectionKind = 'light' | 'surface' | 'subtle' | 'brand' | 'secondary' | 'dark'
export type LayoutGroup = 'basics' | 'landing' | 'shop' | 'blog' | 'components'
export type SectionSpec = { id: string; label: string; kind: SectionKind; rows: Row[]; part?: 'header' | 'footer'; group?: LayoutGroup }

const one = (items: Item[], card = false): Col => ({ width: '4_4', items, card })
const third = (items: Item[]): Col => ({ width: '1_3', items, card: true })

const CORE: SectionSpec[] = [
  {
    id: 'hero',
    label: 'Hero',
    kind: 'brand',
    rows: [
      {
        align: 'center',
        cols: [
          one([
            { type: 'heading', level: 1, text: 'A clear promise in one line' },
            { type: 'text', html: '<p>One or two sentences that explain who this is for and what they get. Keep it short and specific.</p>' },
            { type: 'button', text: 'Get started', variant: 'light' },
          ]),
        ],
      },
    ],
  },
  {
    id: 'features',
    label: 'Feature cards',
    kind: 'light',
    rows: [
      { align: 'center', cols: [one([{ type: 'heading', level: 2, text: 'Why choose us' }, { type: 'text', html: '<p>Three reasons, each with a short explanation.</p>', tone: 'muted' }])] },
      {
        cols: [1, 2, 3].map((n) =>
          third([
            { type: 'heading', level: 3, text: ['Fast and simple', 'Made for you', 'Here to help'][n - 1] },
            { type: 'text', html: '<p>A sentence or two about this benefit and why it matters to your visitor.</p>', tone: 'muted' },
            { type: 'button', text: 'Learn more', variant: 'outline' },
          ]),
        ),
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing table',
    kind: 'surface',
    rows: [
      { align: 'center', cols: [one([{ type: 'heading', level: 2, text: 'Simple pricing' }, { type: 'text', html: '<p>Pick the plan that fits. Change any time.</p>', tone: 'muted' }])] },
      {
        cols: [
          ['Starter', '€19', 'outline'],
          ['Business', '€49', 'primary'],
          ['Premium', '€99', 'outline'],
        ].map(([name, price, variant]) =>
          third([
            { type: 'heading', level: 4, text: name },
            { type: 'heading', level: 2, text: `${price} / month` },
            { type: 'text', html: '<ul><li>First feature</li><li>Second feature</li><li>Third feature</li></ul>', tone: 'muted' },
            { type: 'button', text: `Choose ${name}`, variant: variant as ButtonItem['variant'] },
          ]),
        ),
      },
    ],
  },
  {
    id: 'testimonials',
    label: 'Testimonials',
    kind: 'subtle',
    rows: [
      { align: 'center', cols: [one([{ type: 'heading', level: 2, text: 'What clients say' }])] },
      {
        cols: [
          ['“Clear, friendly and fast. Exactly what we needed.”', 'Laura K., café owner'],
          ['“Our new website brings in enquiries every week.”', 'Tomas P., law firm'],
          ['“Easy to work with from the first call to launch.”', 'Ieva M., wellness studio'],
        ].map(([quote, who]) =>
          third([
            { type: 'text', html: `<p>${quote}</p>` },
            { type: 'text', html: `<p><strong>${who}</strong></p>`, tone: 'muted' },
          ]),
        ),
      },
    ],
  },
  {
    id: 'faq',
    label: 'FAQ',
    kind: 'light',
    rows: [
      {
        cols: [
          { width: '1_3', items: [{ type: 'heading', level: 2, text: 'Questions & answers' }, { type: 'text', html: '<p>Can’t find your answer? Get in touch.</p>', tone: 'muted' }] },
          {
            width: '2_3',
            items: [
              {
                type: 'accordion',
                items: [
                  { title: 'How long does it take?', html: '<p>Most projects take four to six weeks from the first call to launch.</p>' },
                  { title: 'What do I need to prepare?', html: '<p>Your logo, a few photos and a rough idea of the pages you need.</p>' },
                  { title: 'Can I edit the site myself?', html: '<p>Yes. You get a short video guide for the most common changes.</p>' },
                  { title: 'Do you offer support?', html: '<p>Yes, with monthly care plans for updates, backups and small changes.</p>' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'cta',
    label: 'Call to action',
    kind: 'dark',
    rows: [
      {
        align: 'center',
        cols: [one([{ type: 'heading', level: 2, text: 'Ready to start?' }, { type: 'text', html: '<p>Book a free 20-minute call. No obligation.</p>' }, { type: 'button', text: 'Book a call', variant: 'light' }])],
      },
    ],
  },
  {
    id: 'header',
    label: 'Header',
    kind: 'light',
    part: 'header',
    rows: [
      {
        cols: [
          { width: '1_4', items: [{ type: 'heading', level: 5, text: 'Your brand' }] },
          { width: '1_2', items: [{ type: 'text', html: '<p><a href="/">Home</a> · <a href="/about/">About</a> · <a href="/services/">Services</a> · <a href="/contact/">Contact</a></p>' }] },
          { width: '1_4', items: [{ type: 'button', text: 'Contact us', variant: 'primary' }] },
        ],
      },
    ],
  },
  {
    id: 'footer',
    label: 'Footer',
    kind: 'dark',
    part: 'footer',
    rows: [
      {
        cols: [
          { width: '1_3', items: [{ type: 'heading', level: 5, text: 'Your brand' }, { type: 'text', html: '<p>One line about what you do and where you are.</p>' }] },
          { width: '1_3', items: [{ type: 'heading', level: 6, text: 'Pages' }, { type: 'text', html: '<p><a href="/about/">About</a><br><a href="/services/">Services</a><br><a href="/contact/">Contact</a></p>' }] },
          { width: '1_3', items: [{ type: 'heading', level: 6, text: 'Contact' }, { type: 'text', html: '<p>hello@example.com<br>+370 600 00000</p>' }] },
        ],
      },
      { cols: [one([{ type: 'text', html: '<p>© Your brand · Privacy policy</p>', tone: 'muted' }])] },
    ],
  },
]

/** Every section: the originals plus the extra library (src/data/diviSections.ts). */
export const LAYOUTS: SectionSpec[] = [...CORE.map((l) => ({ ...l, group: l.group ?? ('basics' as const) })), ...MORE_SECTIONS]

export const LAYOUT_GROUPS: { id: LayoutGroup; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'landing', label: 'Landing page' },
  { id: 'shop', label: 'Shop' },
  { id: 'blog', label: 'Blog & portfolio' },
  { id: 'components', label: 'Components' },
]

/* ---------- placeholder pictures ---------- */

export type Placeholder = { key: string; kind: PlaceholderKind; w: number; h: number; url: string; label: string }

/** Size of the placeholder file for an image (long side 1200px, logos smaller). */
function phSize(kind: PlaceholderKind, ratio: number) {
  const long = kind === 'logo' ? 360 : kind === 'avatar' ? 480 : 1200
  return ratio >= 1 ? { w: long, h: Math.round(long / ratio) } : { w: Math.round(long * ratio), h: long }
}

export const placeholderUrl = (key: string, kind: PlaceholderKind) => `https://example.com/d5-placeholders/${key}.${kind === 'logo' ? 'png' : 'jpg'}`

/** Placeholders a set of sections needs, in order (one per image, keyed by section and position). */
export function placeholdersFor(ids: string[]): Placeholder[] {
  const out: Placeholder[] = []
  for (const id of ids) {
    const spec = LAYOUTS.find((l) => l.id === id)
    if (!spec) continue
    let n = 0
    for (const row of spec.rows)
      for (const col of row.cols)
        for (const it of col.items)
          if (it.type === 'image') {
            const key = `${id}-${++n}`
            out.push({ key, kind: it.kind, ...phSize(it.kind, it.ratio), url: placeholderUrl(key, it.kind), label: it.label ?? '' })
          }
  }
  return out
}

/** Encoded placeholder files, keyed by placeholder key (base64 without the data: prefix). */
export type PlaceholderImages = Record<string, string>

/* ---------- serialising blocks the way WordPress does ---------- */

/** JSON for a block comment: quotes, <, >, & and -- are escaped so the comment can't break. */
export function blockAttrs(attrs: unknown): string {
  return JSON.stringify(attrs)
    .replace(/\\"/g, '\\u0022')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/--/g, '\\u002d\\u002d')
}

const open = (name: string, attrs: unknown) => `<!-- wp:${name} ${blockAttrs(attrs)} -->`
const close = (name: string) => `<!-- /wp:${name} -->`
const leaf = (name: string, attrs: unknown) => `<!-- wp:${name} ${blockAttrs(attrs)} /-->`

/* ---------- presets used by the layouts ---------- */

const SECTION_PRESET: Record<SectionKind, string> = { light: 'Section Light', surface: 'Section Surface', subtle: 'Section Subtle', brand: 'Section Brand', secondary: 'Section Secondary', dark: 'Section Dark' }
const BUTTON_PRESET: Record<ButtonItem['variant'], string> = { primary: 'Primary Button', secondary: 'Secondary Button', outline: 'Outline Button', light: 'Light Button (on dark or brand)' }

function presetFinder(build: DiviBuild, prefix: string) {
  const all = Object.entries(build.file.presets.module).flatMap(([module, g]) => Object.values(g.items).map((p) => ({ module, p })))
  return (module: string, name: string): string[] => {
    const hit = all.find((x) => x.module === module && (x.p as DiviPreset).name === `${prefix}${name}`)
    return [hit ? hit.p.id : 'default']
  }
}

/** Options the layouts need (all presets on), keeping the user's other choices. */
export const layoutOptions = (opts: DiviOptions): DiviOptions => ({ ...opts, presetHeadings: true, presetText: true, presetButtons: true, presetSections: true, onConflict: 'update' })

/** Divi column width like "1_3" as a number (0.333…). */
export const colFraction = (w: string) => {
  const [a, b] = w.split('_').map(Number)
  return a && b ? a / b : 1
}

/** On a brand section a light button may vanish (light brand colours); the section planner then uses the secondary button. */
export const brandButtonVariant = (sys: DesignSystem): ButtonItem['variant'] => (sectionStyles(sys).brand.button.label === 'Secondary Button' ? 'secondary' : 'light')

/* ---------- block markup ---------- */

export function sectionBlocks(spec: SectionSpec, build: DiviBuild, prefix: string, version: string, sys: DesignSystem): string {
  const preset = presetFinder(build, prefix)
  const tokens = buildTokens(sys, 'light')
  const colour = (key: string, hex: string) => (build.ids.colors[key] ? colorRef(build.ids.colors[key]) : hex)
  // the background a module sits on: a coloured tile, a (light) card, or the section itself
  let surface: SectionKind = spec.kind
  const onColour = () => surface === 'brand' || surface === 'dark' || surface === 'secondary'
  // headings on coloured backgrounds need the matching readable colour (heading presets use the normal text colour)
  const headingColour = () =>
    !onColour() ? null : surface === 'dark' ? colour('neutral.50', buildScales(sys).neutral[0]) : surface === 'brand' ? colour('on-primary', tokens['on-primary'].hex) : colour('on-secondary', tokens['on-secondary'].hex)
  const textPreset = (tone?: 'muted') => (onColour() ? preset('divi/text', surface === 'dark' ? 'Text on Dark' : 'Text on Brand') : preset('divi/text', tone === 'muted' ? 'Muted Text' : 'Body Text'))
  const base = { builderVersion: version }
  const cls = (c: string) => ({ advanced: { htmlAttributes: { desktop: { value: { class: c } } } } })
  let imageN = 0
  const item = (it: Item, center: boolean): string => {
    const align = center ? { module: { advanced: { text: { text: { desktop: { value: { orientation: 'center' } } } } } } } : {}
    switch (it.type) {
      case 'heading':
        return leaf('divi/heading', {
          ...align,
          title: { innerContent: { desktop: { value: it.text } }, decoration: { font: { font: { desktop: { value: { headingLevel: `h${it.level}`, ...(headingColour() ? { color: headingColour() } : {}) } } } } } },
          ...base,
          modulePreset: preset('divi/heading', `H${it.level} Heading`),
        })
      case 'text':
        return leaf('divi/text', { ...align, content: { innerContent: { desktop: { value: it.html } } }, ...base, modulePreset: textPreset(it.tone) })
      case 'button':
        return leaf('divi/button', {
          module: { advanced: { alignment: { desktop: { value: center ? 'center' : 'left' } } } },
          button: { innerContent: { desktop: { value: { text: it.text, linkUrl: '#' } } } },
          ...base,
          modulePreset: preset('divi/button', BUTTON_PRESET[surface === 'brand' && it.variant === 'light' ? brandButtonVariant(sys) : it.variant]),
        })
      case 'image': {
        const key = `${spec.id}-${++imageN}`
        const size = phSize(it.kind, it.ratio)
        return leaf('divi/image', {
          module: { advanced: { htmlAttributes: { desktop: { value: { class: it.kind === 'avatar' ? 'd5-avatar' : it.kind === 'logo' ? 'd5-logo' : 'd5-img' } } }, ...(center ? { alignment: { desktop: { value: 'center' } } } : {}) } },
          image: { innerContent: { desktop: { value: { src: placeholderUrl(key, it.kind), width: String(size.w), height: String(size.h), alt: it.label ?? '' } } } },
          ...base,
          modulePreset: ['default'],
        })
      }
      case 'accordion':
        return [
          open('divi/accordion', { ...base, modulePreset: ['default'] }),
          ...it.items.map((x, i) =>
            leaf('divi/accordion-item', {
              module: { advanced: { open: { desktop: { value: i === 0 ? 'on' : 'off' } } } },
              title: { innerContent: { desktop: { value: x.title } } },
              content: { innerContent: { desktop: { value: x.html } } },
              ...base,
              modulePreset: ['default'],
            }),
          ),
          close('divi/accordion'),
        ].join('\n')
    }
  }
  const out: string[] = [
    open('divi/section', {
      module: { meta: { adminLabel: { desktop: { value: spec.label } } }, ...cls(`d5-section-${spec.kind}`) },
      ...base,
      modulePreset: preset('divi/section', SECTION_PRESET[spec.kind]),
    }),
  ]
  for (const row of spec.rows) {
    const structure = row.cols.map((c) => c.width).join(',')
    out.push(open('divi/row', { module: { advanced: { columnStructure: { desktop: { value: structure } } } }, ...base, modulePreset: ['default'] }))
    for (const col of row.cols) {
      const colClass = col.tone ? `d5-card d5-tile d5-tile-${col.tone}` : col.card ? 'd5-card d5-lift' : ''
      out.push(open('divi/column', { module: { advanced: { type: { desktop: { value: col.width } }, ...(colClass ? { htmlAttributes: { desktop: { value: { class: colClass } } } } : {}) } }, ...base, modulePreset: ['default'] }))
      surface = col.tone === 'brand' ? 'brand' : col.tone === 'dark' ? 'dark' : col.tone || col.card ? 'light' : spec.kind
      col.items.forEach((it) => out.push(item(it, row.align === 'center')))
      surface = spec.kind
      out.push(close('divi/column'))
    }
    out.push(close('divi/row'))
  }
  out.push(close('divi/section'))
  return out.join('\n')
}

/* ---------- files ---------- */

const postId = (seed: string) => String(100000 + (parseInt(stableId('layout:' + seed).slice(0, 6), 36) % 800000))

/** One Divi 5 layout file (import on a page or into the Divi Library) with the chosen sections, presets, colours and variables included. */
export function buildLayoutFile(sys: DesignSystem, opts: DiviOptions, ids: string[], source?: DiviExport | null, images: PlaceholderImages = {}): { file: DiviExport & Record<string, unknown>; build: DiviBuild } {
  const build = buildDiviImport(sys, layoutOptions(opts), source)
  const version = latestVersion(source)
  const specs = ids.map((id) => LAYOUTS.find((l) => l.id === id)!).filter(Boolean)
  const markup = `<!-- wp:divi/placeholder -->${specs.map((s) => sectionBlocks(s, build, opts.prefix, version, sys)).join('\n')}<!-- /wp:divi/placeholder -->`
  const file = {
    context: 'et_builder',
    data: { [postId(ids.join(','))]: markup },
    presets: build.file.presets,
    global_colors: build.file.global_colors,
    global_variables: build.file.global_variables,
    page_settings_meta: null,
    canvases: { local: [], global: [] },
    components: { items: [], order: [] },
    images: imagesFor(ids, images),
    thumbnails: [],
  }
  return { file: file as unknown as DiviExport & Record<string, unknown>, build }
}

/** The file's images list, in Divi's format: { "<url>": { encoded, url } } (Divi uploads them on import). */
function imagesFor(ids: string[], images: PlaceholderImages) {
  const out: Record<string, { encoded: string; url: string }> = {}
  for (const ph of placeholdersFor(ids)) if (images[ph.key]) out[ph.url] = { encoded: images[ph.key], url: ph.url }
  return out
}

/** Theme Builder export: one template with the header and footer as global layouts. */
export function buildThemeBuilderFile(sys: DesignSystem, opts: DiviOptions, source?: DiviExport | null, headerId = 'header', footerId = 'footer') {
  const build = buildDiviImport(sys, layoutOptions(opts), source)
  const version = latestVersion(source)
  const part = (id: string) => {
    const spec = LAYOUTS.find((l) => l.id === id)!
    const pid = Number(postId(id))
    const title = `${sys.name} ${spec.label}`
    return {
      pid,
      layout: {
        context: 'et_builder',
        data: { [pid]: `<!-- wp:divi/placeholder -->${sectionBlocks(spec, build, opts.prefix, version, sys)}<!-- /wp:divi/placeholder -->` },
        images: [],
        post_title: title,
        post_type: spec.part === 'header' ? 'et_header_layout' : 'et_footer_layout',
        theme_builder: { is_global: true },
        global_colors: [],
        canvases: { local: [], global: [] },
        components: { items: [], order: [] },
        post_meta: [
          { key: '_et_pb_use_builder', value: 'on' },
          { key: '_et_pb_use_divi_5', value: 'on' },
          { key: '_et_pb_post_settings_title', value: title },
        ],
      },
    }
  }
  const header = part(headerId),
    footer = part(footerId)
  return {
    context: 'et_theme_builder',
    templates: [
      {
        title: `${sys.name} header & footer`,
        autogenerated_title: false,
        default: false,
        enabled: true,
        use_on: ['singular:post_type:page:all', 'singular:post_type:post:all'],
        exclude_from: [],
        layouts: { header: { id: header.pid, enabled: true }, body: { id: 0, enabled: true }, footer: { id: footer.pid, enabled: true } },
        description: 'Made with D5 WebTool',
      },
    ],
    layouts: { [header.pid]: header.layout, [footer.pid]: footer.layout },
    presets: build.file.presets,
    global_colors: build.file.global_colors,
    global_variables: build.file.global_variables,
    has_default_template: false,
    has_global_layouts: true,
  }
}

/** Parse block markup back into a simple tree (used by tests to prove the markup is well-formed). */
export function parseBlocks(markup: string): { name: string; attrs: Record<string, unknown> | null; children: unknown[] }[] {
  type Node = { name: string; attrs: Record<string, unknown> | null; children: Node[] }
  const root: Node = { name: 'root', attrs: null, children: [] }
  const stack: Node[] = [root]
  const re = /<!-- (\/?)wp:([a-z0-9/-]+)(?: (\{.*?\}))? (\/?)-->/g
  let m: RegExpExecArray | null
  while ((m = re.exec(markup))) {
    const [, isClose, name, json, self] = m
    if (isClose) {
      const top = stack.pop()
      if (!top || top.name !== name) throw new Error(`Unexpected closing ${name}`)
      continue
    }
    const node: Node = { name, attrs: json ? JSON.parse(json) : null, children: [] }
    stack[stack.length - 1].children.push(node)
    if (!self) stack.push(node)
  }
  if (stack.length !== 1) throw new Error('Unclosed block')
  return root.children
}
