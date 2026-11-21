# D5 WebTool: plan

Single-user tool for now. No accounts and no AI features. Saving is local: browser storage, sessions and backup files.
A backend is planned for later.

Stack: Vite, React, TypeScript, `culori` (colour maths), hash routing, static hosting.

## Phase 1: core ✅
- [x] Generator: Space to generate; lock, copy, remove, insert, drag to reorder; shades view; picker editing; 2–10 colours
- [x] Generation methods: auto, monochromatic, analogous, complementary, split, triadic, tetradic, square
- [x] Adjust palette: hue, saturation, brightness, temperature
- [x] Colour-blindness simulation (8 types)
- [x] Undo/redo and visual history; fullscreen; keyboard shortcuts
- [x] Notations: HEX, RGB, HSL, HSB, CMYK, LAB, OKLCH; colour names
- [x] Exports: CSS, SCSS, LESS, Tailwind v3/v4, JSON, JS, XML, GPL, PNG, SVG, link, HTML snippet
- [x] Colour detail page
- [x] Contrast checker with WCAG 2.2 checks and auto-fix
- [x] Library: saved palettes and projects
- [x] Sessions: save/load the full working state; autosave; JSON backup and restore
- [x] GitHub Pages deploy workflow

## Phase 2: Coolors-style extras ✅
- [x] Image picker: k-means extraction in OKLab, balanced/vibrant/muted, draggable pickers, paste/drop/upload, sample image
- [x] Gradient maker: linear/radial/conic, draggable stops, OKLab/OKLCH/sRGB blending, CSS with fallback, Tailwind class, palette from gradient
- [x] Palette visualizer: landing page, dashboard, mobile app, poster, brand; auto roles, manual role picking, light/dark, shuffle
- [x] Explore: 215 curated palettes; filter by colour family, style, size; search; sort; save/open
- [x] PDF and Adobe ASE export (no dependencies)
- [x] Saved colours (heart on swatches and colour pages; Library tab; included in backups)
- [x] Collage/moodboard maker: layouts, sizes, palette band, palette from images, PNG export
- [x] Tailwind colour reference: copy as HEX/class/CSS var/OKLCH; nearest Tailwind colour (CIEDE2000)

## Phase 3: web design
- Semantic roles (primary, secondary, accent, neutral, background, surface, text, success, warning, error, info)
- 50–950 shade scales (OKLCH), with a choice of which step the original colour sits on
- Automatic dark mode with safe contrast
- Accessibility matrix (WCAG 2.2 and APCA) with one-click fixes
- Live website preview and a 60-30-10 coverage check
- UI state colours: hover, active, focus, disabled, border
- Token exports: W3C DTCG, Tokens Studio, Tailwind, Bootstrap, CSS light/dark
- Brand kit page (printable)
- Optional: font pairing preview

## Phase 4: Divi 5
- Global colours and Design Variables export. **Waiting on a sample Divi 5 JSON export from the user.**
- Preset pack generator: buttons, section backgrounds, text, blurb, CTA, pricing, forms
- CSS for Divi: custom properties and helper classes for Theme Options or a child theme
- Divi colour picker default swatches
- Divi-style layout previews
- Section colour planner (background order down a page, with contrast-checked text and buttons)
- Divi gradient export
- Guided handoff checklist

## Later: backend
- Sync palettes and sessions across devices. Hostinger Business (PHP + MySQL) or Cloudflare (Workers + D1) are both options.
