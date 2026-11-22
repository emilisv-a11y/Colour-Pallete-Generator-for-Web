/* ============================================================================
   Dark mode for Divi 5 sites: CSS + a tiny switcher script.
   Divi 5 prints global colours as CSS variables (--gcid-…), so dark mode
   re-points the colours the import file created to their dark-mode values.
   Behaviour: follows the visitor's device setting; a toggle overrides it and is remembered.
   ========================================================================== */

import { buildDiviImport, type DiviExport, type DiviOptions } from './divi'
import { effectsCss } from './effects'
import { buildTokens, type DesignSystem } from './system'
import { exportTokens } from './tokens'

export const THEME_KEY = 'd5-theme'

export type DarkOptions = { button: 'floating' | 'manual'; position: 'bottom-right' | 'bottom-left' }
export const DEFAULT_DARK: DarkOptions = { button: 'floating', position: 'bottom-right' }

/** Dark values for every global colour the import file defines (semantic colours + Divi's built-ins). */
export function darkColorVars(sys: DesignSystem, opts: DiviOptions, source?: DiviExport | null): { id: string; label: string; light: string; dark: string }[] {
  const build = buildDiviImport(sys, { ...opts, onConflict: 'update' }, source)
  const light = buildTokens(sys, 'light')
  const dark = buildTokens(sys, 'dark')
  const out: { id: string; label: string; light: string; dark: string }[] = []
  const labelOf = (id: string) => build.file.global_colors.find(([k]) => k === id)?.[1].label ?? id
  for (const [key, id] of Object.entries(build.ids.colors)) {
    const token = key === '@primary' ? 'primary' : key === '@heading' || key === '@body' ? 'text' : key
    if (!dark[token] || key.includes('.')) continue // scale colours stay the same in both modes
    if (light[token].hex === dark[token].hex) continue
    out.push({ id, label: labelOf(id), light: light[token].hex, dark: dark[token].hex })
  }
  return out
}

export function darkModeCss(sys: DesignSystem, opts: DiviOptions, source?: DiviExport | null, d: DarkOptions = DEFAULT_DARK): string {
  const vars = darkColorVars(sys, opts, source)
  const block = (indent: string) => vars.map((v) => `${indent}--${v.id}: ${v.dark}; /* ${v.label} */`).join('\n')
  const side = d.position === 'bottom-left' ? 'left' : 'right'
  return `/* ${sys.name}: dark mode for Divi 5 (D5 WebTool)
   Divi → Theme Options → General → Custom CSS (or a child theme stylesheet). */

${exportTokens(sys, 'css').replace(/\/\* Fonts:[^\n]*\n/, '')}
${effectsCss(sys)}

/* Divi global colours in dark mode */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${block('    ')}
  }
}
:root[data-theme='dark'] {
${block('  ')}
}

/* swap images: add d5-hide-dark / d5-show-dark (Advanced → CSS Class) */
.d5-show-dark { display: none !important; }
:root[data-theme='dark'] .d5-hide-dark { display: none !important; }
:root[data-theme='dark'] .d5-show-dark { display: revert !important; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .d5-hide-dark { display: none !important; }
  :root:not([data-theme='light']) .d5-show-dark { display: revert !important; }
}

/* smooth switch (instant for visitors who ask for less motion) */
body, .et_pb_section, .et_pb_row, .et_pb_column { transition: background-color var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard); }

/* the toggle button */
.d5-theme-toggle {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-width: 44px; min-height: 44px; padding: 0 14px;
  border: var(--border-thin) solid var(--border-strong); border-radius: 999px;
  background: var(--surface-raised); color: var(--text);
  font: 600 0.9rem/1 var(--font-body); cursor: pointer;
  box-shadow: var(--shadow-md);
}
.d5-theme-toggle:hover { background: var(--surface); }
.d5-theme-toggle:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }
.d5-theme-toggle svg { width: 18px; height: 18px; }
.d5-theme-toggle.d5-floating { position: fixed; bottom: 20px; ${side}: 20px; z-index: 99999; }
`
}

/** Goes in the <head>: applies the saved choice before the page paints, so there is no flash of the wrong theme. */
export function darkHeadScript(): string {
  return `<script>(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}})();</script>`
}

/** Goes before </body>: makes every .d5-theme-toggle work, and adds a floating button if asked. */
export function darkBodyScript(d: DarkOptions = DEFAULT_DARK): string {
  return `<script>
(function () {
  var KEY = '${THEME_KEY}', root = document.documentElement;
  var moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  function current() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function paint() {
    var dark = current() === 'dark';
    document.querySelectorAll('.d5-theme-toggle').forEach(function (b) {
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      b.innerHTML = dark ? sun : moon;
    });
  }
  function toggle(e) {
    if (e) e.preventDefault();
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (err) {}
    paint();
  }
  function init() {${
    d.button === 'floating'
      ? `
    if (!document.querySelector('.d5-theme-toggle')) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'd5-theme-toggle d5-floating';
      document.body.appendChild(b);
    }`
      : ''
  }
    document.querySelectorAll('.d5-theme-toggle').forEach(function (b) { b.addEventListener('click', toggle); });
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paint);
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
</script>`
}

/** HTML for a Code module (or a text module's code tab) when the button is placed by hand. */
export const toggleButtonHtml = '<button type="button" class="d5-theme-toggle" aria-label="Switch to dark mode"></button>'
