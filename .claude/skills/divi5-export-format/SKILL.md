---
name: divi5-export-format
description: Divi 5 presets / global colours / global variables JSON format (the "All presets" export) and how D5 WebTool reads, builds and merges it. Use when changing src/lib/divi.ts or the Divi 5 page, adding new Divi presets or variables, or when the user shares a Divi 5 export or layout file.
---

# Divi 5 export format

Learned from a real Divi 5 (5.19.0) "All presets" export the owner supplied. Their file is private: never commit it.
`src/lib/__tests__/fixtures/divi-export.json` is a synthetic copy with the same structure.

## Top level (keep this key order)

```json
{
  "context": "et_builder",
  "data": [],
  "presets": { "module": { ... }, "group": { ... } },
  "global_colors": [ ["gcid-xxxxxxxxxx", { "color": "#ddfc18", "status": "active", "label": "Accent 1" }] ],
  "global_variables": [ { "id": "gvid-xxxxxxxxxx", "label": "space-m", "value": "clamp(...)", "order": "18",
                          "status": "active", "lastUpdated": "2026-05-09T13:50:24.825Z",
                          "variableType": "numbers", "type": "numbers" } ],
  "page_settings_meta": null, "canvases": [], "components": [], "images": [], "thumbnails": []
}
```

- IDs: `gcid-` / `gvid-` + **10 lowercase alphanumerics**. Built-in colours: `gcid-primary-color`, `gcid-heading-color`, `gcid-body-color`.
- Number variables accept **`clamp()`** values (the owner's site uses them), so fluid type and spacing can be Divi variables.
- Global fonts are content variables: `--et_global_heading_font`, `--et_global_body_font`. They're set in Divi, not in the file.

## References

```
$variable({"type":"color","value":{"name":"gcid-…","settings":{}}})$
$variable({"type":"content","value":{"name":"gvid-…","settings":{}}})$
```

- A colour can reference another colour. Non-empty `settings` (e.g. `{"lightness":-120}`) make it a **relative** colour.
- `parseRef`, `colorRef`, `contentRef` and `resolveColor` in `src/lib/divi.ts` handle these.

## Presets

```json
"presets": {
  "module": { "divi/heading": { "default": "<id>", "items": { "<id>": {
      "id", "name", "moduleName": "divi/heading", "version": "5.19.0", "type": "module",
      "created": 1775538746002, "updated": 1775538746002,
      "attrs": {...}, "styleAttrs": {...}, "renderAttrs": {...} } } } },
  "group":  { "divi/border": { "default": "<id>", "items": { "<id>": {
      "type": "group", "id", "name", "version", "created", "updated",
      "groupName": "divi/border", "moduleName": "divi/group", "groupId": "module.decoration.border",
      "attrs": {...}, "styleAttrs": {...} } } } }
}
```

Attribute paths seen in the real file:

| What | Path |
|---|---|
| Heading module | `title.decoration.font.font.desktop.value` = `{ headingLevel, family, color, size, lineHeight }`. `headingLevel` goes in `attrs` + `renderAttrs`, **not** `styleAttrs`. |
| Text module | `content.decoration.bodyFont.body.font.{desktop,tablet,phone}.value`, plus `content.decoration.headingFont.h1…h6.font.desktop.value`. |
| Button (group preset `divi/button`, `groupId: designButton`) | `button.decoration.{background, border, font.font, button(icon), spacing, sizing}`. States: `desktop.value`, `desktop.hover`, `desktop.sticky`, `tablet.value`, `phone.value`. |
| Border radius | `module.decoration.border.desktop.value.radius` = `{ topLeft, topRight, bottomLeft, bottomRight, sync: "on" }`. |
| Padding | `module.decoration.spacing.desktop.value.padding` = `{ top, right, bottom, left, syncVertical, syncHorizontal }`. |
| Background | `…decoration.background.desktop.value.color`. |
| Row gap (group) | `module.decoration.layout.desktop.value.rowGap`. |

Not yet confirmed on a real import: whether `button.decoration.button.desktop.value.enable: "on"` is needed in Divi 5, and the section background attribute path. Ask the owner to test on staging, and update this table if something differs.

## How the app builds an import (`buildDiviImport`)

- **Merge by name:** labels are normalised (lowercase, alphanumerics only), so `space-m` matches "Space M". When the uploaded site export has the same label, its existing id is reused, so presets already using it keep working. `onConflict: 'keep'` leaves those values alone and the presets still reference them.
- **Stable ids:** new ids are deterministic (`stableId(label)`), so re-importing updates instead of duplicating.
- **Default presets:** each module group keeps the site's existing default preset item untouched. Without a source file, a placeholder "<Module> Preset 1" is added, which is what Divi does itself.
- **`version`:** the newest numeric version found in the source export, else `5.19.0`.
- **Checks:** `findBrokenRefs(file, source)` must return `[]`. Tests are in `src/lib/__tests__/divi.test.ts`.

## When the owner sends a new Divi file (layout, gradient preset, etc.)

1. Inspect the top-level keys and the new attribute paths with `node -e` (escape `$` in shell).
2. Add a **synthetic** fixture with the same structure; never commit their real file.
3. Extend `divi.ts` plus its tests, and check against their real file in a temporary test that you delete afterwards.

## Reading a site back (round trip)

- Real sites write sizes in many forms: `12px`, `1.5rem`, our `clamp(Xrem, Arem + Bvw, Yrem)` and Divi-style `clamp(0.875rem, calc(0.001613 * (100vw - 360px) + 14px), 1rem)`. Don't regex them: `evalLength` evaluates the expression and `readFluid` samples it across widths.
- Divi relative colours: `settings: { lightness: -120 }` etc. are treated as HSL shifts in percentage points (hue in degrees). That's an approximation, so mark such values "approximate" in the UI.
- Presets reference global fonts with `$variable({"type":"content","value":{"name":"--et_global_heading_font"…}})$`; the family itself is not in the export. Literal `family` strings in presets are used instead, and the user confirms them.
- The owner's real export had a broken `space-xs` (clamp minimum > maximum, so it's always 8.96px) and an "Accent 1" identical to Primary. Handle both: warn about the first, and skip duplicates as separate roles.
- **Sites set up with this app** carry `<prefix><Role> 50 … 950` scales plus token colours ("Accent Text", "Focus Ring"…). `scaleRoot` picks the step that rebuilds the whole scale with `buildScale(hex, step)` (max channel error ≤ 3; ties prefer the step `autoAnchor` would choose) and keeps it as the role's anchor. It is trusted over the near-duplicate check, a colour named exactly after a status role wins, and "same colour" notes are hidden for scale steps and token labels in app-made files. Before this, the first label match ("Secondary 100") became the role.
- Synthetic fixture for these cases: `src/lib/__tests__/fixtures/divi-site.json`; tests in `diviRoundTrip.test.ts`.

## Layouts and Theme Builder (from the owner's testpage.json and Theme Builder export, Divi 5.x)

- **Layout file:** `{ context: 'et_builder', data: { "<postId>": "<markup>" }, presets, global_colors, global_variables, page_settings_meta: null, canvases: { local: [], global: [] }, components: { items: [], order: [] }, images: {}, thumbnails: [] }`.
- **Markup** is WordPress block comments wrapped in `<!-- wp:divi/placeholder -->…<!-- /wp:divi/placeholder -->`: `<!-- wp:divi/section {json} -->` … `<!-- /wp:divi/section -->`; leaf modules are self-closing `<!-- wp:divi/heading {json} /-->`. JSON escaping as WordPress does: `\"` → `\u0022`, `<` `>` `&` → `\u003c` `\u003e` `\u0026`, `--` → `\u002d\u002d` (`blockAttrs`).
- Every block has `builderVersion` and `modulePreset: ["<presetId>"]` (or `["default"]`).
- Paths: row `module.advanced.columnStructure.desktop.value` = `"1_3,1_3,1_3"`; column `module.advanced.type.desktop.value` = `"1_3"`; CSS class `module.advanced.htmlAttributes.desktop.value.class`; admin label `module.meta.adminLabel.desktop.value`; heading text `title.innerContent.desktop.value`; text `content.innerContent.desktop.value` (HTML); button `button.innerContent.desktop.value.text` (link key assumed `linkUrl`); accordion item `title.innerContent` + `content.innerContent` + `module.advanced.open`; text alignment `module.advanced.text.text.desktop.value.orientation`.
- **Gradient background:** `module.decoration.background.desktop.value.gradient = { enabled: 'on', type: 'circular', directionRadial: 'top left', stops: [{ position: 0, color }], length: '100%', overlaysImage }`. Linear uses `type: 'linear'` + `direction: '135deg'` (assumed, not in the sample).
- **Theme Builder file:** `{ context: 'et_theme_builder', templates: [{ title, autogenerated_title, default, enabled, use_on: [...], exclude_from, layouts: { header: { id, enabled }, body, footer }, description }], layouts: { "<id>": { context, data: { "<id>": markup }, images: [], post_title, post_type: 'et_header_layout' | 'et_body_layout' | 'et_footer_layout', theme_builder: { is_global }, global_colors: [], canvases, components, post_meta: [...] } }, presets, global_colors, global_variables, has_default_template, has_global_layouts }`.
- Unconfirmed: whether Divi 5 renders global colours as `--gcid-<id>` CSS variables (dark mode relies on it), the `use_on` strings, and the button link key. Ask the owner to test on staging.
- **Image module + embedded pictures** (from testpage.json): module `divi/image` with `image.innerContent.desktop.value = { src, id?, width, height, srcset?, alt? }`; the file's top-level `images` maps each picture URL to `{ encoded: "<base64>", url, id? }` and Divi uploads them on import (the app uses `https://example.com/d5-placeholders/<key>.jpg|png`). Theme Builder layouts have `images: []`.

## Confirmed by the Divi developer docs (dev.elegantthemes.com, `@divi/global-data`)

- References: `$variable({"type":"color"|"content"|"font"…,"value":{"name":"gcid-…|gvid-…","settings":{}}})$`; `settings` may be omitted for content variables (`resolveDynamicValue` example).
- IDs: `generateVariableId` → `gcid-` + 10 chars for colours, `gvid-` + 10 chars for other variables.
- On the front end references become CSS variables: `var(--gcid-…)` for colours, `var(--gvid-…)` for variables (`resolveGlobalDataToCssVarsInAttrsDeep`). The dark-mode CSS relies on this.
- Nested colours are supported: HSL filters add up across levels, opacity is overridden, circular references are detected (`resolveNestedGlobalColor`).
- Gradient stop colours may be colour variable tokens, and gradients themselves can be variables (`processGlobalVariableGradient`, `resolveGlobalGradientVariable`, which also accepts `var(--gvid-…)`).
- Not documented: nested **number** variables and variable combinations in one field. Wait for the owner's sample before generating them.
- **Shop module** (from testshoppage.json): `divi/shop` with `title/price/rating/saleBadge/overlayIcon` `.decoration.font|background|icon`, `image.decoration.border.radius`, `elements.advanced.showPagination`, `content.advanced.offsetNumber`; product count/type use Divi's defaults when omitted.
- **Video module**: `divi/video` with `video.innerContent.desktop.value = { src, id }` and `thumbnail.innerContent.desktop.value = { src, width, height }`.
