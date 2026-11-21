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
- **Library:** saved palettes, grouped by project.
- **Sessions:** save or load your whole working state (palette, locks, full undo history, settings).
  - The working state is also autosaved in the browser.
  - Back up or restore everything as a JSON file.

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
