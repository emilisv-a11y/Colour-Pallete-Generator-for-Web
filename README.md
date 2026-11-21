# D5 WebTool

A colour palette generator and design-system toolkit for web design, with extra tools for building sites in **Divi 5**.
The full feature roadmap is in [PLAN.md](./PLAN.md).

## Phase 1 features

- **Generator:** press Space to generate. Lock, copy, remove, insert, drag to reorder, view shades, and edit with a colour picker. Palettes hold 2–10 colours.
  - Generation methods: auto, monochromatic, analogous, complementary, split complementary, triadic, tetradic, square. All built in OKLCH so lightness steps look even.
  - Adjust the whole palette: hue, saturation, brightness, temperature.
  - Colour-blindness simulation (8 types).
  - Undo/redo plus a visual history list, fullscreen, keyboard shortcuts (press `?`).
  - Values shown as HEX, RGB, HSL, HSB, CMYK, LAB or OKLCH, with about 4,500 colour names.
- **Export:** CSS variables, SCSS, LESS, Tailwind v4 `@theme`, Tailwind v3 config, JSON, JS array, XML, GIMP/Inkscape `.gpl`, PNG, SVG, share link, HTML snippet.
- **Colour details page:** every notation, tints and shades, harmonies, contrast on white/black, colour-blindness views, similar named colours.
- **Contrast checker:** WCAG 2.2 AA/AAA for text and UI components, a live preview, and one-click fixes that keep hue and saturation.
- **Library:** saved palettes (grouped by project) and saved colours.
- **Sessions:** save or load your whole working state (palette, locks, full undo history, settings).
  - The working state is also autosaved in the browser.
  - Back up or restore everything as a JSON file.

## Phase 2 features

- **Explore:** 215 curated palettes. Filter by colour family, style and number of colours; search by name, tag or hex.
- **Image picker:** extract 2–10 colours from an uploaded, pasted or dropped image (balanced, vibrant or muted), then drag the pickers to fine-tune.
- **Gradient maker:** linear, radial and conic gradients with draggable stops and OKLab/OKLCH/sRGB blending. Outputs CSS with a fallback and a Tailwind class, and can turn a gradient into a palette.
- **Mesh gradient:** drag up to 8 colour points over a base colour. Two styles: pure CSS layers (tiny, scalable, ready for a Divi section) or a smooth perceptual blend exported as WebP/PNG/JPG up to 4K. Optional grain and a text preview.
- **Visualizer:** the current palette on a landing page, dashboard, mobile app, poster and brand card, with automatic or manual colour roles and light/dark modes.
- **More exports:** PDF palette sheet and Adobe Swatch Exchange (`.ase`).
- **Saved colours:** heart a colour in the generator or on its details page.
- **Collage & moodboard:** images plus a palette band, in several layouts and sizes, exported as PNG.
- **Tailwind colours:** the default palette, copyable as HEX, class, CSS variable or OKLCH, plus a nearest-Tailwind-colour finder.

## Phase 3 features (Design system)

- **Roles:** primary, secondary, accent, neutral and four status colours, assigned automatically from the generator palette and editable.
- **Scales:** each role becomes an 11-step 50–950 scale in OKLCH. You choose which step your exact brand colour sits on.
- **Tokens:** light and dark semantic tokens (`bg`, `surface`, `text`, `primary`, `on-primary`, `primary-hover`, `primary-subtle`, `focus-ring`…), picked so text pairs pass WCAG 2.2 AA. Any token can be overridden.
- **Accessibility:** 43 promised pairs checked with WCAG 2.2 or APCA, one-click fixes, and a full contrast matrix.
- **Preview:** a realistic website with working hover/active/focus/disabled states, light and dark mode, and a measured 60-30-10 colour balance.
- **Export:** CSS variables (light + dark), SCSS, Tailwind v4/v3, W3C Design Tokens, Tokens Studio for Figma, Bootstrap 5.3, JSON.
- **Brand kit:** a printable brand-guidelines page (print or save as PDF).
- **Responsive typography (Type tab):** a fluid type scale and spacing scale written as `clamp()` values (rem + vw, so browser zoom keeps working). Set the small/large screen sizes, body size and scale ratio, then preview at any screen width with a size chart. Warns about text that may not scale properly when zoomed (WCAG 1.4.4) and about very small text. Exports CSS, Tailwind v4, SCSS and JSON.
- **Google Fonts library:** browse every Google Fonts family (1,908) from the Type tab: search, filter by category, language support (e.g. Latin Extended for Lithuanian) and variable fonts, sort by popularity, name, last update or number of weights, with live previews in your own text. Twelve one-click pairing ideas. Optionally add your own Google Fonts API key to fetch the newest list with Google's popularity ranking (the key stays in your browser). Rebuild the built-in catalogue with `npm run fonts:update`.
- **Fonts & radius:** heading/body Google Fonts pairing and corner radius, carried into the preview, brand kit and exports.

## Phase 4 features (Divi 5)

- **Your Divi site:** upload a presets export from Divi 5 to see its global colours (including linked and relative colours), variables and presets.
- **Import file:** a Divi 5 JSON file with global colours (scales and semantic colours, linked so editing a scale colour in Divi updates the rest), number variables (fluid `text-*`, `space-*`, `radius-*` as `clamp()`), and presets for headings H1–H6, text, buttons, sections, and radius/padding option groups.
  - Merges with your uploaded export by name: existing ids are reused, default presets are kept, and every existing item that would change is listed (old → new), with an option to keep your current values instead.
  - Re-importing updates items instead of duplicating them.
- **Section planner:** arrange section backgrounds down a page; each shows contrast-checked heading, text, link and button colours with the presets and CSS class to use.
- **CSS & classes:** CSS for Theme Options with light/dark tokens, fluid type/spacing and helper classes.
- **Checklist:** step-by-step handoff with saved progress.

## Extras

- **Text on image checker** (Tools): upload a hero image, position the text, and see the worst-case contrast of every pixel behind it, with a heatmap of failing pixels and desktop/tablet/phone crops. One click finds the lightest solid overlay, edge scrim or text panel that passes WCAG AA for white or black text, with CSS and Divi steps.
- **Self-hosted fonts** (Design system → Type): download the chosen Google Fonts as a ZIP of WOFF2 files, with `@font-face` CSS and step-by-step Divi instructions, so visitors' browsers never contact Google (EU privacy). Pick weights, italics and languages (e.g. Latin Extended for Lithuanian); file sizes are shown first.

## Client projects & handoff

- **Projects:** one per client, each with its own design system, palettes, sessions and Divi settings, plus client name, website, notes and status. Switch projects from the header; manage them on the Projects page (duplicate, archive, delete).
- **Handoff ZIP:** one download per project for the client or developer, in English or Lithuanian: a README with Divi install steps, standalone brand guidelines (open in a browser, print to PDF), palette files (PDF, Adobe ASE, GIMP, PNG, SVG), design tokens, fluid typography, Divi 5 import file + CSS + section plan, and self-hosted fonts. Choose what to include and see the size first.

## Server features (your own domain on Hostinger)

When the app runs on your own domain with the included PHP server (setup guide: [docs/HOSTINGER.md](docs/HOSTINGER.md)):

- **Sign in & sync:** projects, palettes, sessions and saved colours sync between computers. The app still works offline; changes sync when you're back.
- **Team:** the owner adds teammates, who share the same projects.
- **Client review links:** a private link (optional PIN and expiry) where the client sees the brand guidelines, the website preview in light and dark mode and colour options, comments, picks a favourite and approves. In English or Lithuanian. You see the feedback and reply from the project.

On GitHub Pages (no server) these features are hidden and everything stays in the browser.

Data is stored in the browser's `localStorage`. The data shapes are plain JSON so a backend can be added later.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # static site in dist/
```

## Deploying

The build is a fully static site in `dist/`. Routing uses the URL hash (`#/generate/...`), so it needs no server rewrite rules and works from any folder.

### GitHub Pages (set up)

`.github/workflows/deploy.yml` builds and deploys on every push to `main`. It can also be started by hand from the Actions tab.

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge to `main` (or run the workflow manually). The site appears at `https://<user>.github.io/<repo>/`.

Note: GitHub Pages on a **private** repository needs a paid GitHub plan. On a free plan, either make the repo public or use Cloudflare Pages.

### Cloudflare Pages (free, works with private repos)

Go to Workers & Pages → Create → Pages → Connect to Git and pick this repo, then set:

- Framework preset: *Vite*
- Build command: `npm run build`
- Output directory: `dist`

It redeploys on every push and gives a free `*.pages.dev` address, and you can add a custom domain.

### Hostinger (Business plan)

1. Run `npm run build` locally.
2. Upload the **contents** of `dist/` to `public_html/`, or to a subfolder such as `public_html/tools/`, using hPanel's File Manager or FTP.

No `.htaccess` is needed because routing uses the URL hash. This is also the natural home for the future backend: Hostinger Business includes PHP and MySQL.
