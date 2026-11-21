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

## Phase 2: Coolors-style extras
- Image picker (extract a palette from an upload, with draggable pickers)
- Gradient maker (linear, radial, conic; multiple stops; CSS) and palette from a gradient
- Palette visualizer on sample designs
- Explore page: a curated set of a few hundred palettes, searchable by colour, style and number of colours
- PDF and Adobe ASE export; saved colours; collage/moodboard maker; Tailwind colour reference

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
