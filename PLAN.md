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
- [x] Mesh gradient generator: draggable points, CSS layers (preview matches the CSS output) or smooth OKLab blend, grain, text preview, CSS and WebP/PNG/JPG export

## Phase 3: web design ✅
- [x] Semantic roles: primary, secondary, accent, neutral, success, warning, error, info (auto-assigned from the palette, all editable)
- [x] 50–950 OKLCH scales, with a choice of which step the exact brand colour sits on
- [x] Light and dark semantic tokens (67 per mode) chosen so promised text pairs pass WCAG 2.2 AA; manual overrides
- [x] Accessibility: 43 promised pairs (WCAG 2.2 and APCA) with one-click fixes, plus a full contrast matrix
- [x] Live website preview with real hover/active/focus/disabled states, light/dark, and a measured 60-30-10 check
- [x] UI state colours: hover, active, subtle, border, focus ring, disabled
- [x] Token exports: CSS (light/dark), SCSS, Tailwind v4 and v3, W3C DTCG, Tokens Studio, Bootstrap 5.3, JSON
- [x] Printable brand kit page (print or save as PDF)
- [x] Font pairing (18 Google Fonts) and corner radius, used in the preview, brand kit and exports
- [x] Design system saved in sessions and backups
- [x] Google Fonts library: all 1,908 families built in (search, category, language, variable, sort, live previews), pairing ideas, optional live refresh with a Google Fonts API key; `npm run fonts:update` rebuilds the catalogue
- [x] Responsive typography: fluid type and spacing scales with clamp() (rem + vw, zoom-safe), viewport preview and chart, WCAG 1.4.4 zoom check, CSS/Tailwind v4/SCSS/JSON export; used in the live preview, token exports and brand kit

## Phase 4: Divi 5 ✅
Built from a real Divi 5 presets export (same file structure, `$variable(...)$` references, option-group presets).
- [x] Upload the site's current Divi export: summary of global colours (resolving linked/relative colours), variables and presets; open its colours in the generator
- [x] Import file: global colours (scales + semantic colours, optionally linked to the scales; Divi's Primary/Heading/Body colours), number variables (fluid text sizes, spacing, radius as clamp()), presets (H1–H6, text, buttons, sections, radius/padding group presets)
- [x] Merges by name with the uploaded export: reuses existing ids, keeps the site's default presets, lists every existing item that changes (old → new), option to keep current values
- [x] Stable ids so re-importing updates instead of duplicating; reference checker (no broken links)
- [x] Section colour planner with contrast checks, preset and CSS class per section
- [x] CSS for Theme Options: tokens (light/dark), fluid type and spacing, helper classes (d5-section-*, d5-card…)
- [x] Handoff checklist (saved progress)
- [ ] Verify an import on a real Divi 5 site and adjust anything Divi treats differently

## Extras ✅
- [x] Text on image checker: measures every pixel behind the text, failing-pixel heatmap, desktop/tablet/phone crops, finds the lightest solid overlay, edge scrim (with hold) or text panel for white or black text; CSS and Divi steps
- [x] Self-hosted fonts: choose weights, italics and languages; merges variable-font files; sizes; ZIP with WOFF2 files, @font-face CSS and Divi README (no requests to Google)

## Later: backend
- Sync palettes and sessions across devices. Hostinger Business (PHP + MySQL) or Cloudflare (Workers + D1) are both options.
