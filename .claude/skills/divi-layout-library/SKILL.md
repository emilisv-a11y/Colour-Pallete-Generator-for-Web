---
name: divi-layout-library
description: How D5 WebTool's Divi 5 layout library works and how to add or change sections, full pages, headers/footers, placeholder pictures and coloured tiles, with the tests every section must pass. Use when the owner asks for new Divi layouts/sections/pages or reports a layout importing wrongly.
---

# Divi layout library

## Where things live

- `src/lib/diviLayouts.ts`: types, the 8 core sections (`CORE`: hero, features, pricing, testimonials, faq, cta, header, footer), `LAYOUTS` (= core + extras), `LAYOUT_GROUPS`, `sectionBlocks` (spec → Divi block markup), `buildLayoutFile`, `buildThemeBuilderFile(sys, opts, source, headerId, footerId)`, `placeholdersFor`, `parseBlocks`.
- `src/data/diviSections.ts`: `MORE_SECTIONS` (landing, shop, blog, components, extra header/footer) and `FULL_PAGES`. Imports only **types** from the lib (avoids a runtime import cycle).
- `src/lib/placeholders.ts`: brand-tinted placeholder pictures drawn on a canvas (browser only); `placeholderCss` for previews.
- `src/components/divi/LayoutsDark.tsx`: `SectionPreview` (HTML preview from the same spec) and `LayoutsTab` (group filter, tick-to-combine, full pages, header/footer radios, downloads with pictures).
- CSS helpers the sections rely on are in `diviCss()` in `src/lib/divi.ts` (`d5-card`, `d5-lift`, `d5-tile-*`, `d5-img`, `d5-avatar`, `d5-logo`, `d5-table`, `d5-swatch`, `d5-section-*`). New classes go there **and** get preview styles in `index.css` under `.lp-section`.

## Large preview

`src/lib/layoutHtml.ts` renders specs as HTML for an iframe (`LayoutPreview`): `diviCss(sys)` + preview CSS (sections `.pv-sec-<kind>` use token variables so dark mode works; buttons `.d5-btn-<variant>` with hover; columns stack at ≤980px). New item types need a case there **and** in `sectionBlocks` **and** in the small `SectionPreview`.

## Writing a section

A section is `{ id, group, label, kind, rows, part? }`. `kind` is the section background (light, surface, subtle, brand, secondary, dark). Rows hold columns `{ width, items, card?, tone? }`; items are `heading`, `text` (HTML, optional `cls` such as `d5-nav`), `button` (primary/secondary/outline/light), `accordion`, `image` (`kind`: photo/avatar/product/logo, `ratio`), `video` (thumbnail placeholder) and `shop` (Divi Shop module).

Rules:
- Only Divi's column structures: `4_4`, `1_2,1_2`, `1_3×3`, `1_4×4`, `2_3,1_3`, `1_3,2_3`, `1_4,3_4`, `3_4,1_4`, `1_4,1_2,1_4`, `1_5×5`, `2_5,3_5`, `3_5,2_5` (the test lists them; add to it only if Divi offers it).
- Headings, text, buttons and sections always use the design system's presets (found by name, with the user's prefix). Never put raw colours in modules; on coloured backgrounds the code adds the readable heading colour as a global-colour reference.
- `tone` makes a coloured tile (bento); text presets and heading colours switch per column. `card` = light raised card.
- A light button on a brand background becomes the secondary button when the brand colour is light (`brandButtonVariant`).
- Forms/sign-ups/dynamic content: no sample of Contact Form, Email Optin, Blog or Woo modules yet, so use a card with "Replace with Divi's … module". When the owner sends an export containing them, copy the exact attrs (see the `divi5-export-format` skill).
- Copy is short, plain, British spelling; names/addresses look Lithuanian-friendly but are clearly placeholders.
- Design originally: references the owner gives are for patterns, never copy a template's exact layout or text.

## Pictures

`placeholdersFor(ids)` numbers images per section (`<sectionId>-<n>`), sizes them (photos 1200 long side, avatars 480, logos 360 wide PNG) and gives each a URL `https://example.com/d5-placeholders/<key>.jpg|png`. The UI draws them (`placeholderImages`) and passes base64 to `buildLayoutFile(..., images)`, which writes Divi's `images: { "<url>": { encoded, url } }` while the Image module's `src` is that same URL. Divi imports them into the Media Library.

## Full pages and Theme Builder

- `FULL_PAGES` = `{ id, label, sections: [ids] }`: only non-`part` section ids.
- Headers/footers have `part: 'header' | 'footer'`; the Theme Builder file takes one of each (post_type `et_header_layout` / `et_footer_layout`).

## Checks (src/lib/__tests__/sections.test.ts, phaseB.test.ts)

Every section must: parse with `parseBlocks`, use allowed column structures that add up to 1, point every heading/text/button/section at a real preset id, have no broken references, and keep image srcs equal to the embedded placeholder URLs. Full pages must reference existing sections. Then check the Layouts tab in the browser on desktop and at 390px (`verify-in-browser` skill) and download a full page to confirm valid JPEG/PNG data.
