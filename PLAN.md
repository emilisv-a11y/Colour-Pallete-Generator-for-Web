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

## More tokens (Phase A) ✅
- [x] Shadows sm/md/lg/xl tinted with brand or neutral (black + stronger in dark mode), strength
- [x] Border widths, button sizes S/M/L (padding from the type scale), input height
- [x] Motion: durations + 4 easing curves, reduced-motion handling, demo
- [x] Content widths: narrow / container / wide
- [x] In CSS, SCSS, Tailwind v3/v4, DTCG, JSON exports, brand kit (app + handoff), live preview
- [x] Divi: number variables, Button Size S/M/L group presets (groupId designButton), helper classes
- [ ] Verify the Button Size presets on a real Divi 5 import

## Divi extras (Phase B) ✅
- [x] Layout library: hero, features, pricing, testimonials, FAQ, CTA as Divi 5 layout files (block markup, presets referenced by id) + header/footer as a Theme Builder export; previews
- [x] Dark mode for Divi: --gcid-* overrides from dark tokens, head + body scripts (device setting + remembered toggle), floating or manual button, logo swap classes, live preview
- [x] Gradient section presets (brand, soft, dark, glow) + Gradient maker → Divi preset (OKLab kept with extra stops)
- [x] Logo checker: SVG colours (incl. implicit black), backgrounds with "part fades" warning, recolour, one-colour versions with white details kept, SVG/PNG downloads, file checks, PNG support
- [ ] Verify layouts, Theme Builder template, gradient presets and dark mode on a real Divi 5 site

## Brand assets (Phase C) ✅
- [x] Favicon/app icons from logo or initials: ICO (16/32/48 PNG), SVG, apple-touch 180, 192/512 + maskable, manifest, HTML tags, README, ZIP
- [x] Social share images: 4 styles × 1200×630 and 1080×1080, auto-fit text (Lithuanian letters), logo, PNG/JPG
- [x] Starter kits: 8 kits in 4 groups (Latin Extended fonts, all contrast checks pass) → new project with system, palette and section plan

## Quality of life (Phase D) ✅
- [x] Design system version history: named + automatic versions (15-minute gap, auto pruned to 20), diff, restore (saves current first); per project, synced
- [x] Command palette (Ctrl/⌘ + K, header search icon): pages, actions, projects, install prompt
- [x] PWA: manifest, icons, service worker (network-first pages, cached assets and Google Fonts, never /api)
- [x] Colour-blindness view in the live preview and section planner

## Layout library v2 ✅
- [x] 21 more sections (landing, shop, blog & portfolio, components incl. style guide page) + 2nd header/footer; original designs (v0.app galleries were requested as reference but are blocked from the sandbox)
- [x] Placeholder pictures embedded like a real export (`images: { url: { encoded, url } }` + Image module src), brand-tinted, JPG/PNG
- [x] Coloured bento tiles (per-column readable colours), CSS helpers (d5-tile-*, d5-img, d5-avatar, d5-logo, d5-table, d5-swatch)
- [x] Six full pages; group filter; tick-to-combine in click order; header/footer choice for the Theme Builder file
- [ ] Dynamic Blog / Woo Products modules once the owner sends a sample export with them
- [ ] Verify on a real Divi 5 site (image import, tiles, tables)

## Layouts v3 ✅
- [x] Shop module (WooCommerce) section + Shop home page; Video module (format from testpage.json)
- [x] Restaurant & booking, Services & trust, Media, Utility page groups (19 sections) + 7 more full pages
- [x] Large preview: iframe mini site (real clamp/vw sizes, hover, dark mode, phone stacking at 980px), device widths, full pages
- [x] Hover/focus: text-preset link colour + hover, button/link/card/image/nav CSS; rem units for radius, button padding, input height, widths
- [x] Gradient stops linked to global colours (confirmed in Divi dev docs)
- [ ] Nested variables + variable combinations: waiting for the owner's sample export (not in the dev docs)

## Phase 4: Divi 5 ✅
Built from a real Divi 5 presets export (same file structure, `$variable(...)$` references, option-group presets).
- [x] Upload the site's current Divi export: summary of global colours (resolving linked/relative colours), variables and presets; open its colours in the generator
- [x] Import file: global colours (scales + semantic colours, optionally linked to the scales; Divi's Primary/Heading/Body colours), number variables (fluid text sizes, spacing, radius as clamp()), presets (H1–H6, text, buttons, sections, radius/padding group presets)
- [x] Merges by name with the uploaded export: reuses existing ids, keeps the site's default presets, lists every existing item that changes (old → new), option to keep current values
- [x] Stable ids so re-importing updates instead of duplicating; reference checker (no broken links)
- [x] Section colour planner with contrast checks, preset and CSS class per section
- [x] CSS for Theme Options: tokens (light/dark), fluid type and spacing, helper classes (d5-section-*, d5-card…)
- [x] Handoff checklist (saved progress)
- [x] Round trip: read a site's export back into a design system (roles from names/button/usage, fonts, fluid type from clamp/calc, radius, button) with a review step that creates a new project
- [x] Site differences: changed / new / same / only on site, tick to apply, update file with only those items (dependencies added, nothing deleted)
- [ ] Verify an import on a real Divi 5 site and adjust anything Divi treats differently

## Extras ✅
- [x] Text on image checker: measures every pixel behind the text, failing-pixel heatmap, desktop/tablet/phone crops, finds the lightest solid overlay, edge scrim (with hold) or text panel for white or black text; CSS and Divi steps
- [x] Self-hosted fonts: choose weights, italics and languages; merges variable-font files; sizes; ZIP with WOFF2 files, @font-face CSS and Divi README (no requests to Google)

## Client projects + handoff ✅
- [x] Projects: one per client with its own design system, palettes, sessions, Divi export/options/section plan and checklist; client, website, notes, status (Draft → In progress → Ready for handoff → Done), archive, duplicate, delete
- [x] Header project switcher; existing work moved into "My first project" on first run; Library and Sessions scoped to the open project; projects in backups
- [x] Handoff ZIP (English or Lithuanian): README.html with install steps, standalone brand-kit.html (prints to PDF), palette PDF/ASE/GPL/PNG/SVG, design tokens, fluid typography, Divi 5 import + CSS + section plan, self-hosted WOFF2 fonts; size estimate; verified offline with zero requests to Google

## Backend on Hostinger ✅ (built; goes live after the one-time setup in docs/HOSTINGER.md)
- [x] PHP 8.1+ API + MySQL/MariaDB (`server/api`), one-time `setup.php`, `.htaccess` hardening
- [x] Sign-in screen: on the own domain the whole app needs a sign-in (review links stay public; GitHub Pages copy stays open)
- [x] Accounts: owner + teammates (temporary password → forced change), sign out everywhere, rate-limited sign-in
- [x] Local-first sync of projects, palettes, sessions and saved colours (newest edit wins per item, deletions sync, untouched placeholder project replaced on a new browser)
- [x] Client review links (EN/LT): brand guidelines, website preview light/dark, pick between options, comments, approval; PIN, expiry, switch off, "send latest version", owner replies
- [x] GitHub Action FTP deploy to Hostinger (skips until secrets are added); step-by-step guide
- [x] Tests: 45 API integration tests on MariaDB, sync unit tests, three-browser end-to-end test

## Next phases (planned with the owner)
