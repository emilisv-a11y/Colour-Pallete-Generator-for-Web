/* Starter kits: curated palette, font pairing, shape and section plan per industry.
   All fonts are Google Fonts with Latin Extended (Lithuanian letters). No AI involved: hand-picked. */

import type { SectionKind } from '../lib/divi'
import type { TypeSettings } from '../lib/typography'
import type { EffectSettings, ShadowTint } from '../lib/effects'

export type KitGroup = 'food' | 'professional' | 'health' | 'shops'

export type StarterKit = {
  id: string
  group: KitGroup
  name: string
  for: string
  /** primary, secondary, accent, then a neutral (used for the generator palette and roles) */
  palette: string[]
  fonts: { heading: string; body: string }
  radius: number
  type: Partial<TypeSettings>
  effects: { shadowTint: ShadowTint; shadowStrength: number; buttons?: Partial<EffectSettings['buttons']> }
  plan: SectionKind[]
  layouts: string[]
  tips: string[]
}

export const KIT_GROUPS: { id: KitGroup; label: string }[] = [
  { id: 'food', label: 'Food & hospitality' },
  { id: 'professional', label: 'Professional services' },
  { id: 'health', label: 'Health & beauty' },
  { id: 'shops', label: 'Shops & creative' },
]

export const STARTER_KITS: StarterKit[] = [
  {
    id: 'restaurant',
    group: 'food',
    name: 'Bistro',
    for: 'Restaurants, wine bars, fine dining',
    palette: ['#7a1f2b', '#c8963e', '#2f4a3a', '#5b5250'],
    fonts: { heading: 'Playfair Display', body: 'Lato' },
    radius: 4,
    type: { minBase: 16, maxBase: 18, minRatio: 1.2, maxRatio: 1.333 },
    effects: { shadowTint: 'brand', shadowStrength: 0.8 },
    plan: ['dark', 'light', 'surface', 'brand', 'light', 'dark'],
    layouts: ['hero', 'features', 'testimonials', 'cta'],
    tips: ['Lead with a large food photo in the hero (check text contrast with the Text on image checker).', 'Put opening hours and the booking button above the fold.', 'Use the wine red for buttons only; let photos carry the colour.'],
  },
  {
    id: 'cafe',
    group: 'food',
    name: 'Corner café',
    for: 'Cafés, bakeries, guesthouses',
    palette: ['#c2603f', '#e7b75f', '#5e7d5c', '#6b5f55'],
    fonts: { heading: 'Fraunces', body: 'DM Sans' },
    radius: 14,
    type: { minBase: 16, maxBase: 18, minRatio: 1.2, maxRatio: 1.25 },
    effects: { shadowTint: 'brand', shadowStrength: 1 },
    plan: ['brand', 'light', 'subtle', 'light', 'dark'],
    layouts: ['hero', 'features', 'faq', 'cta'],
    tips: ['Warm, rounded shapes feel friendly: keep the 14px radius on cards and buttons.', 'Show the menu as cards with prices rather than a PDF.', 'Add a map and address to the footer.'],
  },
  {
    id: 'law',
    group: 'professional',
    name: 'Counsel',
    for: 'Law firms, notaries, financial advisers',
    palette: ['#1f3a5f', '#8a6d3b', '#4f7cac', '#545b66'],
    fonts: { heading: 'Libre Baskerville', body: 'Source Sans 3' },
    radius: 2,
    type: { minBase: 17, maxBase: 18, minRatio: 1.2, maxRatio: 1.25 },
    effects: { shadowTint: 'neutral', shadowStrength: 0.7 },
    plan: ['dark', 'light', 'surface', 'light', 'brand'],
    layouts: ['hero', 'features', 'testimonials', 'faq', 'cta'],
    tips: ['Calm and trustworthy: navy for structure, gold only for small accents.', 'List practice areas as feature cards, each linking to its own page.', 'Make the phone number and consultation button easy to find.'],
  },
  {
    id: 'consultant',
    group: 'professional',
    name: 'Clear advice',
    for: 'Accountants, consultants, real estate',
    palette: ['#1d6b5f', '#f2a541', '#3a5ba0', '#4b5563'],
    fonts: { heading: 'Manrope', body: 'Inter' },
    radius: 10,
    type: { minBase: 16, maxBase: 18, minRatio: 1.2, maxRatio: 1.25 },
    effects: { shadowTint: 'brand', shadowStrength: 1 },
    plan: ['subtle', 'light', 'surface', 'light', 'brand', 'dark'],
    layouts: ['hero', 'features', 'pricing', 'faq', 'cta'],
    tips: ['Show packages with the pricing table; clear prices reduce back-and-forth emails.', 'Use the orange accent for one key call to action per page.', 'Add client logos or numbers ("120 businesses helped") near the top.'],
  },
  {
    id: 'spa',
    group: 'health',
    name: 'Calm spa',
    for: 'Wellness, spas, beauty salons',
    palette: ['#8c6a5d', '#c9b29b', '#7f9c8a', '#6e6862'],
    fonts: { heading: 'Cormorant Garamond', body: 'Mulish' },
    radius: 20,
    type: { minBase: 16, maxBase: 18, minRatio: 1.25, maxRatio: 1.333 },
    effects: { shadowTint: 'brand', shadowStrength: 0.6 },
    plan: ['subtle', 'light', 'surface', 'light', 'brand'],
    layouts: ['hero', 'features', 'pricing', 'testimonials', 'cta'],
    tips: ['Soft, muted colours and plenty of white space feel relaxing.', 'Cormorant needs size: keep headings large and body text in Mulish.', 'Put "Book now" in the header and after every treatment list.'],
  },
  {
    id: 'clinic',
    group: 'health',
    name: 'Bright clinic',
    for: 'Dentists, clinics, physiotherapy, fitness',
    palette: ['#0f7c90', '#ef7b45', '#3bb273', '#52606d'],
    fonts: { heading: 'Nunito', body: 'Nunito Sans' },
    radius: 12,
    type: { minBase: 17, maxBase: 18, minRatio: 1.2, maxRatio: 1.25 },
    effects: { shadowTint: 'neutral', shadowStrength: 0.9, buttons: { s: 40, m: 48, l: 56 } },
    plan: ['brand', 'light', 'surface', 'light', 'subtle', 'dark'],
    layouts: ['hero', 'features', 'faq', 'testimonials', 'cta'],
    tips: ['Larger buttons and body text help older patients.', 'Answer common worries in the FAQ (price, pain, waiting time).', 'Teal reads as clean and medical; orange keeps it friendly.'],
  },
  {
    id: 'shop',
    group: 'shops',
    name: 'Fresh shop',
    for: 'Online shops, fashion, gifts',
    palette: ['#e63e6d', '#1b1b3a', '#ffb627', '#5c5f6b'],
    fonts: { heading: 'Poppins', body: 'Inter' },
    radius: 8,
    type: { minBase: 16, maxBase: 17, minRatio: 1.2, maxRatio: 1.25 },
    effects: { shadowTint: 'brand', shadowStrength: 1.2 },
    plan: ['brand', 'light', 'surface', 'dark', 'light'],
    layouts: ['hero', 'features', 'testimonials', 'faq', 'cta'],
    tips: ['Product photos on plain light backgrounds make the brand colour pop.', 'Use the yellow accent for sale badges only.', 'Keep "Add to cart" in the primary colour everywhere.'],
  },
  {
    id: 'portfolio',
    group: 'shops',
    name: 'Studio',
    for: 'Photographers, designers, construction & trades',
    palette: ['#111827', '#d4a017', '#2563eb', '#6b7280'],
    fonts: { heading: 'Space Grotesk', body: 'Work Sans' },
    radius: 0,
    type: { minBase: 16, maxBase: 18, minRatio: 1.25, maxRatio: 1.414 },
    effects: { shadowTint: 'black', shadowStrength: 0.8 },
    plan: ['dark', 'light', 'dark', 'light', 'brand'],
    layouts: ['hero', 'features', 'testimonials', 'cta'],
    tips: ['Let the work speak: big images, little colour.', 'Sharp corners and a bold type scale feel confident.', 'For trades, swap the gallery for before/after photos and a quote form.'],
  },
]
