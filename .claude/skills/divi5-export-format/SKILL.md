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
