# D5 WebTool: project memory

A colour palette and design-system platform for web design, with extra tools for building sites in **Divi 5**. Inspired by Coolors in features, but with its own name, look and code. Live at https://webtools.emilisvastakas.co.uk (Hostinger, sign-in required). The old GitHub Pages copy is retired: it only shows a "no longer available" page.

## The owner and how they like to work

- The owner (plus a few teammates with accounts): a web designer who builds client sites with **Divi 5**, based in the EU (Lithuanian, so Latin Extended matters for fonts, and EU privacy rules matter).
- Wants a **plan and feature list before building**, with questions asked up front. **Review after each phase.**
- Not a developer-first user: explain results in plain language, give clear next steps, and include screenshots of new UI.
- **No AI features** in the product (declined). Accounts exist on the own domain (owner + teammates, PHP/MySQL on Hostinger Business); there is no public sign-up.
- Deploy flow: work on the session's branch, then **ask before merging to `main`**; merging deploys automatically to Hostinger (FTP action). Every deploy so far was approved with "Merge and deploy", but always ask again.

## Status

| Phase | Content | State |
|---|---|---|
| 1 | Generator, colour page, contrast checker, exports, library, sessions | live |
| 2 | Explore (215 palettes), image picker, gradients, mesh gradient, visualizer, collage, Tailwind, PDF/ASE, saved colours | live |
| 3 | Design system: roles, 50–950 scales, light/dark tokens, accessibility (WCAG + APCA), live preview, token exports, brand kit, fluid type (clamp), Google Fonts library (1,908 families) | live |
| 4 | Divi 5: import file builder (colours, variables, presets), section planner, CSS helpers, checklist | live |
| Extras | Text-on-image checker (`/text-on-image`) + self-hosted fonts (Design system → Type) | live |
| Round trip | Divi export → design system (new project) + Site differences tab with tick-to-apply update file | live |
| A · Shape & motion | Shadows, borders, button/input sizes, motion, content widths → exports + Divi | live |
| B · Divi extras | Layouts tab, dark-mode toggle, gradient presets, logo checker (`/logo`) | live |
| C · Brand assets | Favicon/app icons + social images (`/brand-assets`), starter kits (`/starters`) | live |
| D · Quality of life | Version history, command palette (Ctrl/⌘+K), installable app (PWA), colour-blindness view | live |
| Layout library v2 | 27 sections in 5 groups, 6 full pages, placeholder pictures, 2 headers + 2 footers | live |
| Layouts v3 | 46 sections in 9 groups, 13 full pages, Shop/Video modules, large iframe preview, hover/focus states, rem units, gradient stops linked to global colours | live |
| Projects | Client projects (header switcher, `/projects`) + handoff ZIP (EN/LT) | live |
| Backend | PHP/MySQL API on Hostinger Business: sign-in, team, sync, client review links (`#/review/<token>`) | **live at https://webtools.emilisvastakas.co.uk** (setup done; files in `public_html/webtools`). The whole app is behind a sign-in screen there (`LoginGate`). |

The full roadmap and checklist are in `PLAN.md`; the feature list is in `README.md`.

**Done so far** (phases A → D were agreed with the owner, each reviewed and deployed; details in `PLAN.md`):
- A · shape & motion tokens: **done** (`src/lib/effects.ts`, Design system → "Shape & motion").
- B · Divi extras: **done** (Divi page tabs Layouts + Dark mode, gradient presets, `/logo`). Built from the owner's samples (`testpage.json`, `Divi-Theme-Builder-Templates.json` in uploads; never commit them, they contain the owner's site content).
- C · brand assets: **done** (`/brand-assets`: `lib/brandAssets.ts` icons + ICO encoder + social canvas templates; `/starters`: `data/starterKits.ts` + `lib/starterKits.ts` → `kitProjectData` for `newProject`).
- D · quality of life: **done** (`lib/versions.ts` + `components/system/VersionHistory.tsx`, auto versions via `onBeforeSystemWrite` in storage.ts, key `d5wt:systemVersions` in WORKING_KEYS; `components/CommandPalette.tsx` + `lib/commands.ts`; `public/sw.js` + `manifest.webmanifest` + `public/icons/`, registered in main.tsx (prod only); `components/VisionSelect.tsx`).

- Layout library v2 + v3: **done** (see the `divi-layout-library` skill). Sections are original designs from common patterns (v0.app was the owner's reference).

**Next session starts here:** the owner is testing the Divi imports on a staging site. Ask for the results first and work through the "Staging test checklist" in `PLAN.md`.

**Waiting on the owner:** a presets export containing a nested number variable and a field with a variable combination (calc etc.); the Divi dev docs (`@divi/global-data`) don't document that format. When it arrives: add semantic variables (e.g. `section-padding` → `space-xl-3xl`, `card-padding` → `space-m`) as nested references in `buildDiviImport`, use combinations where a field needs two values, extend `diviRead` (`resolveValue` already resolves nested content refs) and the tests.

Ask the owner what's next. Ideas not built yet: dynamic Blog/Woo Products modules and real Contact Form / Email Optin modules (each needs a sample export with that module), verify Divi imports on staging (button sizes, layouts, Theme Builder, dark mode `--gcid-*`, gradients), proofread Lithuanian copy, more starter kits, layout variants (pricing table module, testimonial module).

## Stack and commands

Vite + React 19 + TypeScript (TS 7), `culori` for colour maths, `react-colorful`, `@dnd-kit`, `react-router-dom` (**HashRouter**), `fflate` (zip), `color-name-list` (bestof, lazy-loaded). Tests: `vitest`. Lint: `oxlint`.

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # vitest (127+ tests)
npx tsc -b             # type-check (tests are included in tsconfig: no node: imports in tests, use JSON imports)
npm run build          # static site in dist/
npm run fonts:update   # rebuild src/data/google-fonts.json from the npm package google-font-metadata
```

Hosting: Hostinger via `.github/workflows/deploy-hostinger.yml` (FTP upload on every push to `main`; it also runs the tests). `.github/workflows/deploy.yml` now only publishes the retired placeholder `.github/pages-retired/index.html` to GitHub Pages (runs when those files change). The repo is public. `vite.config.ts` uses `base: './'` and the router uses hash URLs, so the build also works on Hostinger or Cloudflare Pages unchanged.

## Code map

- `src/lib/color.ts`: conversions, WCAG contrast, `fixContrast`, shades, harmonies, vision simulation, adjustments.
- `src/lib/generate.ts`: OKLCH palette generation with locks. `src/state/palette.ts` + `GeneratorContext.tsx`: undo/redo reducer, autosave.
- `src/lib/storage.ts`: all localStorage (`d5wt:*` keys); palettes, sessions (`extra.system` holds the design system), saved colours, backup/import.
- `src/lib/system.ts`: **design system engine**: `buildScale` (11 steps, exact colour at the anchor), `buildTokens(sys, mode)` (67 tokens per mode, contrast-safe), `checkPairs`/`suggestFix`, `systemFromPalette`. `typeOf(sys)` defaults typography for old saves.
- `src/lib/effects.ts`: **shape & motion** (`sys.effects`, `effectsOf` defaults): brand-tinted shadows (`shadowCss`, dark = black ×2.4), `buttonSizes` (font from type steps −1/0/1, padding to reach height), `EASINGS`, `effectVars`/`effectsCss` (with reduced motion) and `effectHelpers` (Divi classes). Used by tokens.ts, divi.ts (`effectVars`, `presetButtonSizes` options), handoff brand kit, BrandKitPage and `tokenVars(t, sys, mode)`.
- `src/lib/apca.ts` (APCA 0.0.98G-4g), `typography.ts` (fluid clamp scale + spacing), `tokens.ts` (CSS/SCSS/Tailwind v3/v4/DTCG/Tokens Studio/Bootstrap/JSON exports).
- `src/lib/googleFonts.ts` (catalogue, popularity, API-key refresh, preview fonts under the private name `d5p-<family>`), `fonts.ts` (`metaFor`, `fontStack`, `googleFontsUrl`: only request weights a family has), `selfHost.ts` (WOFF2 ZIP).
- `src/lib/divi.ts`: **Divi 5** parse/build/merge, section planner, CSS helpers. See the `divi5-export-format` skill.
- `src/lib/diviRead.ts`: **round trip** reader: `evalLength` (px/rem/vw/calc/clamp/min/max), `readFluid` (samples 200–2560px to find min/max and where it starts/stops), `clampIssue`, `resolveHex` (Divi relative colours ≈ HSL shifts in percentage points), `readDiviSite` → roles with `how`/`source` (a "<Role> 50…950" scale from our own import file is recognised by `scaleRoot`: the step that rebuilds the scale is the brand colour + its anchor), fonts, type fit (log-linear over text-* steps), radius, button, notes; `applyReview`. `src/lib/diviDiff.ts`: `diffSite(build, source)` (changed/new/same/site-only; unchanged site defaults hidden), `selectiveImport` (adds needed new colours/variables, keeps group defaults, `broken` must be []). UI: `components/divi/RoundTrip.tsx` (`ReadSiteModal`, `DiffTab`); new project opens on the diff tab via sessionStorage `d5wt:diviOpenTab`. Google Fonts catalogue must be loaded (`loadLibrary`) before reading, or fonts show as unknown.
- `src/lib/diviLayouts.ts`: **layout library**: `LAYOUTS` = core specs + `MORE_SECTIONS` and `FULL_PAGES` from `src/data/diviSections.ts` (groups, image items, coloured `tone` tiles; `placeholdersFor` + `lib/placeholders.ts` draw brand-tinted pictures embedded as `images` in the file); section specs → both `sectionBlocks` markup and the `SectionPreview` in `components/divi/LayoutsDark.tsx`), `blockAttrs` (WordPress escaping), `buildLayoutFile`, `buildThemeBuilderFile`, `parseBlocks` (tests). `src/lib/diviDark.ts`: dark-mode CSS (`--gcid-<id>` overrides from `build.ids.colors`), head/body scripts (`d5-theme` localStorage). Gradients: `diviGradient`/`gradientPresetFile` in divi.ts. `src/lib/logo.ts` + `pages/LogoPage.tsx`: logo checker.
- `src/lib/layoutHtml.ts` + `components/divi/LayoutPreview.tsx`: **large preview**: the same section specs rendered as a mini web page in an iframe (diviCss + preview CSS, `data-theme` for dark, stacks under 980px like Divi), scaled to fit; device widths 1280/820/390.
- `src/lib/projects.ts`: **client projects**. Tools use per-project *working keys* in localStorage (`WORKING_KEYS`: system, generator state, Divi data…). `switchProject` saves them into the old project and loads the new one's copy; `ensureProjects()` runs in `main.tsx` before render (migrates old data). `<main>` is keyed by the active project id so pages remount after a switch. Palettes and sessions carry `projectId` (the old free-text `project` field is now shown as "Group").
- `src/lib/handoff.ts` + `handoffText.ts` (EN/LT strings): handoff ZIP builder; text files are built synchronously (testable), binaries (PDF/ASE/PNG/fonts) are added in the browser. Lithuanian copy was written by Claude: ask the owner to proofread it.
- **Backend** (`server/`, see `server/README.md`): `server/api/index.php` router + `src/core.php` (PDO, auth tokens in `d5wt_auth` HttpOnly cookie, rate limits, `X-Requested-With: d5wt` CSRF header) + `src/routes.php` (auth, users, sync, reviews, public `/r/<token>`). `setup.php` creates tables/config/owner once and locks. `config.php` is never committed or deployed (gitignored, excluded in the FTP action). Hostinger is the owner's; Claude cannot log in there.
- Frontend: `src/lib/api.ts` (relative `api/` base, works in subfolders), `src/lib/sync.ts` (collect/apply, tombstones in `d5wt:tombstones`, `firstPull` replaces the untouched placeholder project), `src/state/SyncContext.tsx` (detects backend via `/api/health`, `checked` flag, caches the user in `d5wt:syncUserCache` for offline, auto-sync every 45 s), `components/account/LoginGate.tsx` (sign-in screen when a backend exists; no gate without one; review route bypasses it in `Shell`), `SignInForms.tsx`, `AccountPage`, `components/projects/ClientReview.tsx`, `pages/ReviewPage.tsx` (rendered without app chrome by `Shell` in `App.tsx`), `lib/review.ts` (snapshot + EN/LT strings).
- `vite preview` proxies `/api` like dev, so to test the no-server (GitHub Pages) case serve `dist/` with `python3 -m http.server`.
- Local full stack: `server/dev/start.sh` (MariaDB + `php -S` with `server/dev/router.php` mimicking .htaccess; `npm run dev` proxies `/api`). `node server/dev/api-test.mjs` needs an empty DB.
- `src/lib/imageText.ts`: per-pixel text-on-image contrast, overlays (solid / scrim with hold / box), `findOpacity`.
- Pages are in `src/pages/*`; the less-used ones are lazy-loaded in `App.tsx`. Tools live under the "Tools" dropdown (`MORE` list in `App.tsx`).

## Conventions and gotchas (learned the hard way)

- **`.page > section` only.** A generic `.page section` style once broke grid layouts inside previews. Keep page-level selectors scoped to direct children, and use `<div>` inside templates.
- **Fieldsets need `min-width: 0`**, or long select labels cause horizontal overflow on phones. Selects use `padding-block: 0` + `min-height: 36px` (text clipped otherwise). Checkboxes get `flex: none`.
- Buttons inside forms must be `type="button"` unless they submit (the shared `Segmented` once submitted the review form).
- Always test at **390px width** and check `.app-main` `scrollWidth`, which must stay ≤ 390.
- **Google Fonts:** requesting a weight a family doesn't have makes the whole css2 request fail. Variable fonts use `wght@lo..hi`. Preview subsets (`&text=`) must be renamed (`d5p-`) or they shadow the real font and drop glyphs.
- `fonts.gstatic.com` and `fonts.googleapis.com` send `Access-Control-Allow-Origin: *`; `fonts.google.com/metadata` is blocked from the sandbox and has no CORS. The Developer API needs the user's key.
- When testing pages with non-ASCII text, add `<meta charset="utf-8">`, or unicode-range checks give wrong results.
- Never commit the owner's real Divi export (the repo is public). Tests use the synthetic `src/lib/__tests__/fixtures/divi-export.json`.
- UI copy: British spelling ("colour"); short, plain, practical labels.
- Commits end with the `Co-Authored-By` / `Claude-Session` lines given by the harness; never put model names in commits or PRs.
- `npm run build` runs `tsc -b`, which also type-checks the test files: a type error in a test fails the build (and the Hostinger deploy). Run the build before reporting success.
- Multi-line `python3 - <<EOF` edits are sometimes refused by the shell safety check; write the script to the scratchpad and run it from there.
- Cards on the Divi page use `useState` + derived values, not `setState` inside effects (oxlint flags it). Keep oxlint warnings at the existing baseline (30 old ones in untouched files).
- The cloud environment `Colour-Pallete-Generator-for-Web` (personal, saved for this repo) allows `dev.elegantthemes.com` and `v0.app` on top of package registries. WebFetch may fail with DNS errors even when the host is allowed; `curl` through the proxy works, then strip the HTML with Python.
- Divi developer docs worth reading: `https://dev.elegantthemes.com/api/js/divi-global-data/functions/` (global colours/variables). The `divi-context-library/variables` page is about code constants, not design variables.
- The owner's real files (uploads `testshoppage.json` too, `All_Presets.json`, `testpage.json`, `Divi-Theme-Builder-Templates.json`) may only be copied to `/tmp` for temporary tests that are deleted afterwards.

## Skills in this repo

- `.claude/skills/divi5-export-format`: Divi 5 presets/global colours/variables JSON format and how this app builds and merges it.
- `.claude/skills/ship-to-live-site`: branch, PR, merge and deploy routine for this repo, and verifying the Hostinger deploy run.
- `.claude/skills/hostinger-backend`: the PHP API, local full stack, setup and the troubleshooting learned while going live on Hostinger.
- `.claude/skills/divi-layout-library`: how to add or change Divi sections, full pages, pictures and tiles, and the checks they must pass.
- `.claude/skills/verify-in-browser`: Playwright checks used here (screenshots, phone overflow, console errors, pixel/rendering verification, selector pitfalls).
