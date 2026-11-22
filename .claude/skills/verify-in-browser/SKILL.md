---
name: verify-in-browser
description: Playwright verification recipes used in D5 WebTool (preview server, screenshots, phone overflow check, console errors, downloads, checking rendered pixels or real CSS against computed values). Use after building or changing any page in this repo, before telling the user it works.
---

# Verify in the browser

Chromium and Playwright are preinstalled, so `require('playwright')` works and needs no install. Keep test scripts in the session scratchpad, not in the repo.

## Setup

```bash
npm run build && (npx vite preview --port 4173 >/dev/null 2>&1 &)
# ...run the node script...
pkill -f "vite preview"
```

`vite preview` (and `npm run dev`) proxy `/api` to `127.0.0.1:8080`. With nothing running there the app has no server, so there is no sign-in screen. If the local PHP server **is** running, every page sits behind the sign-in (`LoginGate`): sign in first (see the `hostinger-backend` skill), or stop it. To prove the no-server behaviour for certain, serve `dist/` with `python3 -m http.server 4198 -d dist` instead.

Start servers in the background and wait for them before the first `page.goto`, or you get `ERR_CONNECTION_REFUSED`:

```bash
(python3 -m http.server 4198 -d dist > /tmp/py.log 2>&1 &)
end=$((SECONDS+20)); until curl -s localhost:4198 >/dev/null || [ $SECONDS -ge $end ]; do :; done
```

(Plain `sleep` is blocked here; use deadline loops like this for waiting.) If a feature seems missing in the browser, check the build actually succeeded (`npm run build 2>&1 | tail`): a failed build leaves the old `dist/`.

Quick ways to seed realistic data: `#/starters` → "Start a project with this kit" (accept the name prompt with `p.on('dialog', d => d.accept('Name'))`) creates a project with a full design system.

Pages live at `http://localhost:4173/#/<route>` (hash router). Seed state through the UI or `localStorage` (`d5wt:*` keys). For example, open `#/generate/<hex-hex-...>` first so the generator has a known palette, and use the "Create from current palette" button on `#/system`.

## Always check

```js
const errs = []
p.on('pageerror', e => errs.push(e.message))
p.on('console', m => m.type() === 'error' && errs.push(m.text()))
// ...interactions...
// phone overflow (must be <= 390):
await m.evaluate(() => document.querySelector('.app-main').scrollWidth)
```

- Screenshot each new screen at 1400px wide and at a 390×844 phone. Read the PNGs and look at them before reporting.
- `.app-main` is the scroll container, so `fullPage` and element screenshots get clipped. Use a tall viewport (e.g. 1400×3200) to capture long pages.

## Proving numbers are right, not just that the page renders

- **CSS output:** render the generated CSS in a real element at several viewport widths and compare `getComputedStyle` with the expected values. That's how the `clamp()` type scale was proven to be within 0.05px.
- **Canvas previews:** read pixels back with `getImageData` and compare them with the app's own analysis. The mesh preview vs CSS was within 2/255, and text-on-image p02 was 4.60 vs the reported 4.55.
- **Downloads:** use `p.waitForEvent('download')` then `fs.copyFileSync(await d.path(), ...)`. Validate the file:
  - JSON: parse it.
  - ZIP: inspect it with Python's `zipfile`.
  - WOFF2: check the magic bytes are `wOF2`.
  - Fonts: serve the extracted folder with `python3 -m http.server` and confirm `document.fonts` shows them loaded, with zero requests to Google.
- **External URLs:** if the app builds URLs (e.g. Google Fonts css2), fetch a random sample in a throwaway vitest file and assert they all return 200. Delete the file afterwards.

## Sign-in screen checks (own domain behaviour)

Run the local full stack, then: open any route and expect `text=Sign in to open the tool` with no `.app-header`; a wrong password shows `.form-error`; after signing in the requested route opens and survives a reload; avatar (`.account-btn`) → `.account-menu >> text=Sign out` returns to the sign-in screen; `#/review/<token>` opens without signing in.

## Service worker (installable app)

Production builds register `sw.js`. A fresh Playwright context starts with no cache, so tests are fine; but in a reused browser profile an old build can be served from the cache. To test offline: load a page, wait for `navigator.serviceWorker.ready`, reload once, then `context.setOffline(true)` and navigate: the app must still render. Never let the service worker cache `/api/`.

## More checks used here

- **Downloads with binaries:** decode and check magic bytes in Python (`ffd8ff` JPEG, `89504e` PNG, `wOF2` fonts), PNG size from bytes 16–24, ZIP contents with `zipfile`, ICO header with `struct.unpack('<HHH', ...)`.
- **Iframes** (dark-mode preview): `p.frameLocator('.dm-frame')`; scroll the iframe into view first or clicks on fixed elements inside it time out on phones.
- **Canvas output** (social images, icons): screenshot the canvas element and look at it; check long text and Lithuanian letters (ąčęėįšųūž) fit.
- **Modals** placed in the wrong JSX branch don't open: if a button seems dead, check the component renders in the branch that is actually showing.

## Selector pitfalls seen here

- `hasText: 'Serif'` also matches "Sans serif", and `'Brand'` matches "Subtle brand". Use anchored regexes: `{ hasText: /^Serif$/ }`, `{ hasText: /^\s*Brand$/ }`.
- Wait for CSS transitions (about 400ms) before reading hover colours.
- Test pages with non-ASCII text need `<meta charset="utf-8">`.
- Vitest hides `console.log` from passing tests. Use `process.stderr.write(...)` for one-off diagnostics.
