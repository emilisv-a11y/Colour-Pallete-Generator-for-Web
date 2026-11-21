/* A small curated Google Fonts list for the font pairing preview. */

export const FONTS: { family: string; category: 'sans' | 'serif' | 'display'; weights: string }[] = [
  { family: 'Manrope', category: 'sans', weights: '400;600;800' },
  { family: 'Inter', category: 'sans', weights: '400;600;800' },
  { family: 'DM Sans', category: 'sans', weights: '400;600;800' },
  { family: 'Work Sans', category: 'sans', weights: '400;600;800' },
  { family: 'Poppins', category: 'sans', weights: '400;600;800' },
  { family: 'Montserrat', category: 'sans', weights: '400;600;800' },
  { family: 'Open Sans', category: 'sans', weights: '400;600;800' },
  { family: 'Lato', category: 'sans', weights: '400;700;900' },
  { family: 'Nunito', category: 'sans', weights: '400;600;800' },
  { family: 'Outfit', category: 'sans', weights: '400;600;800' },
  { family: 'Space Grotesk', category: 'display', weights: '400;600;700' },
  { family: 'Raleway', category: 'sans', weights: '400;600;800' },
  { family: 'Playfair Display', category: 'serif', weights: '400;600;800' },
  { family: 'Fraunces', category: 'serif', weights: '400;600;800' },
  { family: 'Lora', category: 'serif', weights: '400;600;700' },
  { family: 'Merriweather', category: 'serif', weights: '400;700;900' },
  { family: 'Source Serif 4', category: 'serif', weights: '400;600;800' },
  { family: 'Libre Baskerville', category: 'serif', weights: '400;700' },
]

export const fontStack = (family: string) => {
  const f = FONTS.find((x) => x.family === family)
  return `'${family}', ${f?.category === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif'}`
}

export function googleFontsUrl(families: string[]) {
  const uniq = [...new Set(families)]
  const q = uniq
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@${(FONTS.find((x) => x.family === f)?.weights ?? '400;700')}`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${q}&display=swap`
}

/** Load fonts into the page on demand (one <link> per pairing). */
export function loadFonts(families: string[]) {
  const href = googleFontsUrl(families)
  if (document.querySelector(`link[data-d5font][href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.d5font = '1'
  document.head.appendChild(link)
}
