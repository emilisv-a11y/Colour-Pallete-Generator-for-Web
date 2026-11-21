import { rgbValues } from './color'

/* APCA (Accessible Perceptual Contrast Algorithm), constants from APCA-W3 0.0.98G-4g.
   Returns Lc: positive for dark text on light backgrounds, negative for light on dark.
   Use the absolute value against the thresholds below. */

const Y = (hex: string) => {
  const { r, g, b } = rgbValues(hex)
  const lin = (c: number) => Math.pow(c / 255, 2.4)
  return 0.2126729 * lin(r) + 0.7151522 * lin(g) + 0.072175 * lin(b)
}

export function apcaContrast(text: string, background: string): number {
  const blkThrs = 0.022,
    blkClmp = 1.414
  let txtY = Y(text)
  let bgY = Y(background)
  txtY = txtY > blkThrs ? txtY : txtY + Math.pow(blkThrs - txtY, blkClmp)
  bgY = bgY > blkThrs ? bgY : bgY + Math.pow(blkThrs - bgY, blkClmp)
  if (Math.abs(bgY - txtY) < 0.0005) return 0
  let out: number
  if (bgY > txtY) {
    const sapc = (Math.pow(bgY, 0.56) - Math.pow(txtY, 0.57)) * 1.14
    out = sapc < 0.1 ? 0 : sapc - 0.027
  } else {
    const sapc = (Math.pow(bgY, 0.65) - Math.pow(txtY, 0.62)) * 1.14
    out = sapc > -0.1 ? 0 : sapc + 0.027
  }
  return out * 100
}

/** Plain-language APCA bands (absolute Lc). */
export function apcaLabel(lc: number) {
  const a = Math.abs(lc)
  if (a >= 90) return 'Body text, preferred'
  if (a >= 75) return 'Body text'
  if (a >= 60) return 'Content text / buttons'
  if (a >= 45) return 'Headlines, large text'
  if (a >= 30) return 'UI, non-text only'
  if (a >= 15) return 'Decorative only'
  return 'Not readable'
}
