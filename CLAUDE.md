# D5 WebTool: project memory

A colour palette and design-system platform for web design, with extra tools for building sites in **Divi 5**. Inspired by Coolors in features, but with its own name, look and code. Live at https://emilisv-a11y.github.io/Colour-Pallete-Generator-for-Web/.

## The owner and how they like to work

- Single user for now: a web designer who builds client sites with **Divi 5**, based in the EU (Lithuanian, so Latin Extended matters for fonts, and EU privacy rules matter).
- Wants a **plan and feature list before building**, with questions asked up front. **Review after each phase.**
- Not a developer-first user: explain results in plain language, give clear next steps, and include screenshots of new UI.
- **No AI features** in the product (declined). **No accounts yet**; a backend is planned later (Hostinger Business PHP/MySQL, or Supabase/Cloudflare).
- Deploy flow: work on the session's branch, then **ask before merging to `main`**; merging deploys automatically. Every deploy so far was approved with "Merge and deploy", but always ask again.

## Status

| Phase | Content | State |
|---|---|---|
| 1 | Generator, colour page, contrast checker, exports, library, sessions | live |
| 2 | Explore (215 palettes), image picker, gradients, mesh gradient, visualizer, collage, Tailwind, PDF/ASE, saved colours | live |
| 3 | Design system: roles, 50–950 scales, light/dark tokens, accessibility (WCAG + APCA), live preview, token exports, brand kit, fluid type (clamp), Google Fonts library (1,908 families) | live |
| 4 | Divi 5: import file builder (colours, variables, presets), section planner, CSS helpers, checklist | live |
| Extras | Text-on-image checker (`/text-on-image`) + self-hosted fonts (Design system → Type) | live |

The full roadmap and checklist are in `PLAN.md`; the feature list is in `README.md`.

**Recommended next** (the owner picked the first two, which are now done):
1. Client projects + handoff ZIP (brand kit PDF, Divi JSON, CSS, tokens, fonts, README).
2. Backend + client review/approval links.
3. Read a Divi site back into a design system (round trip), with a diff.
4. More tokens: shadows, borders, motion, button sizes, content widths → Divi variables.
5. Divi layouts library (needs a sample Divi Library layout export), dark-mode toggle for Divi, gradient background presets (needs a sample preset with a gradient), logo checker, favicon/OG image generator, industry starter kits, version history, command palette, PWA.

## Stack and commands

Vite + React 19 + TypeScript (TS 7), `culori` for colour maths, `react-colorful`, `@dnd-kit`, `react-router-dom` (**HashRouter**), `fflate` (zip), `color-name-list` (bestof, lazy-loaded). Tests: `vitest`. Lint: `oxlint`.

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # vitest (55+ tests)
npx tsc -b             # type-check (tests are included in tsconfig: no node: imports in tests, use JSON imports)
npm run build          # static site in dist/
npm run fonts:update   # rebuild src/data/google-fonts.json from the npm package google-font-metadata
```

Hosting: GitHub Pages via `.github/workflows/deploy.yml` (runs on push to `main` and workflow_dispatch). The repo is public (needed for free Pages). `vite.config.ts` uses `base: './'` and the router uses hash URLs, so the build also works on Hostinger or Cloudflare Pages unchanged.

## Code map

- `src/lib/color.ts`: conversions, WCAG contrast, `fixContrast`, shades, harmonies, vision simulation, adjustments.
- `src/lib/generate.ts`: OKLCH palette generation with locks. `src/state/palette.ts` + `GeneratorContext.tsx`: undo/redo reducer, autosave.
- `src/lib/storage.ts`: all localStorage (`d5wt:*` keys); palettes, sessions (`extra.system` holds the design system), saved colours, backup/import.
- `src/lib/system.ts`: **design system engine**: `buildScale` (11 steps, exact colour at the anchor), `buildTokens(sys, mode)` (67 tokens per mode, contrast-safe), `checkPairs`/`suggestFix`, `systemFromPalette`. `typeOf(sys)` defaults typography for old saves.
- `src/lib/apca.ts` (APCA 0.0.98G-4g), `typography.ts` (fluid clamp scale + spacing), `tokens.ts` (CSS/SCSS/Tailwind v3/v4/DTCG/Tokens Studio/Bootstrap/JSON exports).
- `src/lib/googleFonts.ts` (catalogue, popularity, API-key refresh, preview fonts under the private name `d5p-<family>`), `fonts.ts` (`metaFor`, `fontStack`, `googleFontsUrl`: only request weights a family has), `selfHost.ts` (WOFF2 ZIP).
- `src/lib/divi.ts`: **Divi 5** parse/build/merge, section planner, CSS helpers. See the `divi5-export-format` skill.
- `src/lib/imageText.ts`: per-pixel text-on-image contrast, overlays (solid / scrim with hold / box), `findOpacity`.
- Pages are in `src/pages/*`; the less-used ones are lazy-loaded in `App.tsx`. Tools live under the "Tools" dropdown (`MORE` list in `App.tsx`).

## Conventions and gotchas (learned the hard way)

- **`.page > section` only.** A generic `.page section` style once broke grid layouts inside previews. Keep page-level selectors scoped to direct children, and use `<div>` inside templates.
- **Fieldsets need `min-width: 0`**, or long select labels cause horizontal overflow on phones. Selects use `padding-block: 0` + `min-height: 36px` (text clipped otherwise). Checkboxes get `flex: none`.
- Always test at **390px width** and check `.app-main` `scrollWidth`, which must stay ≤ 390.
- **Google Fonts:** requesting a weight a family doesn't have makes the whole css2 request fail. Variable fonts use `wght@lo..hi`. Preview subsets (`&text=`) must be renamed (`d5p-`) or they shadow the real font and drop glyphs.
- `fonts.gstatic.com` and `fonts.googleapis.com` send `Access-Control-Allow-Origin: *`; `fonts.google.com/metadata` is blocked from the sandbox and has no CORS. The Developer API needs the user's key.
- When testing pages with non-ASCII text, add `<meta charset="utf-8">`, or unicode-range checks give wrong results.
- Never commit the owner's real Divi export (the repo is public). Tests use the synthetic `src/lib/__tests__/fixtures/divi-export.json`.
- UI copy: British spelling ("colour"); short, plain, practical labels.
- Commits end with the `Co-Authored-By` / `Claude-Session` lines given by the harness; never put model names in commits or PRs.

## Skills in this repo

- `.claude/skills/divi5-export-format`: Divi 5 presets/global colours/variables JSON format and how this app builds and merges it.
- `.claude/skills/ship-to-live-site`: branch, PR, merge and deploy routine for this repo, and verifying the GitHub Pages run.
- `.claude/skills/verify-in-browser`: Playwright checks used here (screenshots, phone overflow, console errors, pixel/rendering verification, selector pitfalls).
