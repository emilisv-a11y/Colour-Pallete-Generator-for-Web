/* Client review links: what the client sees (a snapshot taken when the link is created or updated) and the page text. */

import type { Lang } from './handoffText'
import { BRAND_ROLES, type DesignSystem } from './system'

export type ReviewOption = { id: string; label: string; colors: string[] }
export type ReviewSnapshot = {
  v: 1
  project: { name: string; client: string; website: string }
  system: DesignSystem
  sections: { brand: boolean; preview: boolean; options: boolean }
  options: ReviewOption[]
  intro: string
  createdAt: string
}

export function buildSnapshot(args: {
  project: { name: string; client: string; website: string }
  system: DesignSystem
  sections: ReviewSnapshot['sections']
  options: ReviewOption[]
  intro: string
}): ReviewSnapshot {
  return { v: 1, ...args, options: args.sections.options ? args.options : [], createdAt: new Date().toISOString() }
}

export const systemOption = (sys: DesignSystem, label: string): ReviewOption => ({ id: 'system', label, colors: [...BRAND_ROLES.map((r) => sys.roles[r].hex), sys.roles.neutral.hex] })

const en = {
  designReview: 'Design review',
  defaultIntro: 'Here is the proposed visual identity for your website. Have a look, leave comments on anything, choose your favourite option and approve when you are happy.',
  brand: 'Brand guidelines',
  preview: 'Website preview',
  options: 'Colour options',
  optionsNote: 'Which direction do you prefer? Each option is shown on the same example page.',
  comments: 'Comments',
  general: 'General comments',
  approval: 'Approval',
  light: 'Light',
  dark: 'Dark',
  choose: 'Choose this option',
  yourChoice: 'Your choice',
  chosenBy: 'Chosen by',
  yourName: 'Your name',
  namePrompt: 'Please enter your name first (top of the page).',
  writeComment: 'Write a comment…',
  send: 'Send',
  approve: 'Approve the design',
  approveNote: 'Approving tells the designer the design can go ahead. You can still leave comments afterwards.',
  note: 'Note (optional)',
  approvedBy: 'Approved by {name}, {date}',
  pinTitle: 'This review is protected',
  pinLabel: 'Enter the PIN you received',
  open: 'Open',
  wrongPin: 'That PIN is not correct.',
  expired: 'This review link has expired. Please ask the designer for a new one.',
  notFound: 'This review link does not exist or has been switched off.',
  thanks: 'Thank you! The designer will see this.',
  designer: 'Designer',
  noComments: 'No comments yet.',
  previewNote: 'An example page built with the colours, fonts and buttons from the brand guidelines. Hover over and click the buttons to see their states.',
  version: 'Version from {date}',
}

type Dict = typeof en

const lt: Dict = {
  designReview: 'Dizaino peržiūra',
  defaultIntro: 'Čia pateikiamas siūlomas jūsų svetainės vizualinis identitetas. Peržiūrėkite, komentuokite bet kurią dalį, išsirinkite labiausiai patinkantį variantą ir patvirtinkite, kai būsite patenkinti.',
  brand: 'Prekės ženklo gairės',
  preview: 'Svetainės peržiūra',
  options: 'Spalvų variantai',
  optionsNote: 'Kuri kryptis jums labiau patinka? Kiekvienas variantas parodytas tame pačiame pavyzdiniame puslapyje.',
  comments: 'Komentarai',
  general: 'Bendri komentarai',
  approval: 'Patvirtinimas',
  light: 'Šviesus',
  dark: 'Tamsus',
  choose: 'Rinktis šį variantą',
  yourChoice: 'Jūsų pasirinkimas',
  chosenBy: 'Pasirinko',
  yourName: 'Jūsų vardas',
  namePrompt: 'Pirmiausia įrašykite savo vardą (puslapio viršuje).',
  writeComment: 'Parašykite komentarą…',
  send: 'Siųsti',
  approve: 'Patvirtinti dizainą',
  approveNote: 'Patvirtinę leidžiate dizaineriui tęsti darbą. Komentuoti galėsite ir vėliau.',
  note: 'Pastaba (nebūtina)',
  approvedBy: 'Patvirtino {name}, {date}',
  pinTitle: 'Ši peržiūra apsaugota',
  pinLabel: 'Įveskite gautą PIN kodą',
  open: 'Atidaryti',
  wrongPin: 'Neteisingas PIN kodas.',
  expired: 'Šios peržiūros nuorodos galiojimas baigėsi. Paprašykite dizainerio naujos.',
  notFound: 'Tokios peržiūros nuorodos nėra arba ji išjungta.',
  thanks: 'Ačiū! Dizaineris tai matys.',
  designer: 'Dizaineris',
  noComments: 'Komentarų dar nėra.',
  previewNote: 'Pavyzdinis puslapis, sukurtas su prekės ženklo gairių spalvomis, šriftais ir mygtukais. Užveskite pelę ir spustelėkite mygtukus, kad pamatytumėte jų būsenas.',
  version: 'Versija nuo {date}',
}

export const RT: Record<Lang, Dict> = { en, lt }
