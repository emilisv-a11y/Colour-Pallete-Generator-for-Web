import { describe, expect, it } from 'vitest'
import { defaultWeights, fontFaceCss, parseFontCss, planFiles, preloadFile, requestParam } from '../selfHost'

const CSS = `/* latin-ext */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v20/EXT.woff2) format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5;
}
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v20/LAT.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131;
}
/* latin-ext */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v20/EXT.woff2) format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5;
}
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v20/LAT.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131;
}
/* cyrillic */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v20/CYR.woff2) format('woff2');
  unicode-range: U+0400-045F;
}`

describe('self-hosted fonts', () => {
  it('builds css2 requests for static and variable fonts', () => {
    expect(requestParam({ family: 'Open Sans', weights: [700, 400], italic: false, variable: false })).toBe('family=Open+Sans:wght@400;700')
    expect(requestParam({ family: 'Inter', weights: [400, 700], italic: false, variable: true })).toBe('family=Inter:wght@400..700')
    expect(requestParam({ family: 'Lora', weights: [400, 700], italic: true, variable: false })).toBe('family=Lora:ital,wght@0,400;0,700;1,400;1,700')
    expect(requestParam({ family: 'Abel', weights: [400], italic: false, variable: false })).toBe('family=Abel')
  })
  it('parses faces with their subsets', () => {
    const faces = parseFontCss(CSS)
    expect(faces).toHaveLength(5)
    expect(faces[0]).toMatchObject({ family: 'Inter', subset: 'latin-ext', weightMin: 400, style: 'normal' })
  })
  it('keeps chosen subsets and merges shared variable files', () => {
    const files = planFiles(parseFontCss(CSS), ['latin', 'latin-ext'])
    expect(files).toHaveLength(2)
    expect(files.map((f) => f.file).sort()).toEqual(['inter-400-700-latin-ext.woff2', 'inter-400-700-latin.woff2'])
    const css = fontFaceCss(files)
    expect(css).toContain("font-weight: 400 700;")
    expect(css).toContain("src: url('fonts/inter-400-700-latin.woff2') format('woff2');")
    expect(css).toContain('unicode-range: U+0000-00FF, U+0131;')
    expect(preloadFile(files, 'Inter')!.subset).toBe('latin')
  })
  it('picks sensible default weights that exist', () => {
    expect(defaultWeights({ category: 'serif', weights: [400, 500, 600, 700], italic: true, variable: true }, 'body')).toEqual([400, 700])
    expect(defaultWeights({ category: 'display', weights: [400], italic: false, variable: false }, 'heading')).toEqual([400])
  })
})
