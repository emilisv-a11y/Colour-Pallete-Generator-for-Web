/* Extra Divi 5 sections (original designs) and full-page templates.
   Each section is a small description that drives both the Divi file and the in-app preview.
   Only Divi's standard column structures are used (4_4, 1_2, 1_3, 1_4, 2_3/1_3, 1_4/3_4, 1_5…). */

import type { Col, Item, SectionSpec } from '../lib/diviLayouts'

const one = (items: Item[]): Col => ({ width: '4_4', items })
const col = (width: string, items: Item[], extra: Partial<Col> = {}): Col => ({ width, items, ...extra })
const card = (width: string, items: Item[]): Col => ({ width, items, card: true })
const h = (level: 1 | 2 | 3 | 4 | 5 | 6, text: string): Item => ({ type: 'heading', level, text })
const t = (html: string, muted = false): Item => ({ type: 'text', html: html.startsWith('<') ? html : `<p>${html}</p>`, ...(muted ? { tone: 'muted' as const } : {}) })
const btn = (text: string, variant: 'primary' | 'secondary' | 'outline' | 'light' = 'primary'): Item => ({ type: 'button', text, variant })
const img = (kind: 'photo' | 'avatar' | 'product' | 'logo', ratio: number, label = ''): Item => ({ type: 'image', kind, ratio, label })

export const MORE_SECTIONS: SectionSpec[] = [
  /* ---------- landing page ---------- */
  {
    id: 'hero-split',
    group: 'landing',
    label: 'Split hero',
    kind: 'light',
    rows: [
      {
        cols: [
          col('1_2', [t('New · Booking now open', true), h(1, 'Websites that bring in real enquiries'), t('Explain the outcome in one or two sentences. Who is it for, and why does it matter to them?'), btn('Book a free call'), btn('See our work', 'outline')]),
          col('1_2', [img('photo', 4 / 3, 'Hero image')]),
        ],
      },
    ],
  },
  {
    id: 'hero-stats',
    group: 'landing',
    label: 'Hero with stats',
    kind: 'brand',
    rows: [
      { align: 'center', cols: [one([h(1, 'Grow with a website that works as hard as you do'), t('A short line that backs up the promise with a concrete benefit.'), btn('Get started', 'light')])] },
      {
        align: 'center',
        cols: [
          col('1_3', [h(2, '120+'), t('happy clients')]),
          col('1_3', [h(2, '4.9 / 5'), t('average review')]),
          col('1_3', [h(2, '10 years'), t('of experience')]),
        ],
      },
    ],
  },
  {
    id: 'logos',
    group: 'landing',
    label: 'Logo cloud',
    kind: 'surface',
    rows: [
      { align: 'center', cols: [one([t('Trusted by local businesses and growing brands', true)])] },
      { align: 'center', cols: [1, 2, 3, 4, 5].map((n) => col('1_5', [img('logo', 3, `Client logo ${n}`)])) },
    ],
  },
  {
    id: 'bento',
    group: 'landing',
    label: 'Bento grid',
    kind: 'light',
    rows: [
      { align: 'center', cols: [one([h(2, 'Everything in one place'), t('A modern grid of features: big tiles for the main points, small ones for the details.', true)])] },
      {
        cols: [
          col('2_3', [h(3, 'Design that fits your brand'), t('Colours, fonts and spacing that stay consistent on every page.'), img('photo', 16 / 7, 'Feature image')], { tone: 'subtle' }),
          col('1_3', [h(3, 'Fast'), t('Pages load quickly on phones and slow connections.'), btn('Learn more', 'light')], { tone: 'brand' }),
        ],
      },
      {
        cols: [
          col('1_3', [h(2, '98%'), t('of clients would recommend us')], { tone: 'surface' }),
          col('2_3', [h(3, 'Support when you need it'), t('Updates, backups and small changes, handled for you every month.'), btn('See care plans', 'light')], { tone: 'dark' }),
        ],
      },
    ],
  },
  {
    id: 'alternating',
    group: 'landing',
    label: 'Alternating features',
    kind: 'light',
    rows: [
      { cols: [col('1_2', [img('photo', 4 / 3, 'Feature image 1')]), col('1_2', [t('Step one', true), h(3, 'Start with what matters most'), t('Describe the first benefit. Keep it to two or three sentences and focus on the result for the visitor.'), btn('Learn more', 'outline')])] },
      { cols: [col('1_2', [t('Step two', true), h(3, 'Then make it easy to act'), t('Describe the second benefit. A clear next step on every section keeps visitors moving.'), btn('Learn more', 'outline')]), col('1_2', [img('photo', 4 / 3, 'Feature image 2')])] },
    ],
  },
  {
    id: 'steps',
    group: 'landing',
    label: 'How it works',
    kind: 'surface',
    rows: [
      { align: 'center', cols: [one([h(2, 'How it works'), t('Three simple steps from first call to launch.', true)])] },
      {
        cols: [
          card('1_3', [h(2, '01'), h(4, 'Free call'), t('We talk about your goals, your customers and what the site needs to do.', true)]),
          card('1_3', [h(2, '02'), h(4, 'Design & build'), t('You see the design early and give feedback before anything goes live.', true)]),
          card('1_3', [h(2, '03'), h(4, 'Launch & grow'), t('We launch, check everything works and keep improving it with you.', true)]),
        ],
      },
    ],
  },
  {
    id: 'stats-band',
    group: 'landing',
    label: 'Stats band',
    kind: 'brand',
    rows: [
      {
        align: 'center',
        cols: [
          col('1_4', [h(2, '250+'), t('projects delivered')]),
          col('1_4', [h(2, '12'), t('countries')]),
          col('1_4', [h(2, '98%'), t('on time')]),
          col('1_4', [h(2, '24 h'), t('reply time')]),
        ],
      },
    ],
  },
  {
    id: 'comparison',
    group: 'landing',
    label: 'Comparison table',
    kind: 'light',
    rows: [
      { align: 'center', cols: [one([h(2, 'Why choose us'), t('A quick, honest comparison.', true)])] },
      {
        cols: [
          one([
            t(
              '<table class="d5-table"><thead><tr><th></th><th>Us</th><th>Typical agency</th><th>DIY builder</th></tr></thead><tbody><tr><td>Custom design</td><td>✓</td><td>✓</td><td>–</td></tr><tr><td>Fixed price</td><td>✓</td><td>–</td><td>✓</td></tr><tr><td>Launch in 4 weeks</td><td>✓</td><td>–</td><td>✓</td></tr><tr><td>Ongoing support</td><td>✓</td><td>✓</td><td>–</td></tr></tbody></table>',
            ),
          ]),
        ],
      },
    ],
  },
  {
    id: 'big-quote',
    group: 'landing',
    label: 'Big quote',
    kind: 'subtle',
    rows: [
      {
        align: 'center',
        cols: [one([img('avatar', 1, 'Client photo'), h(3, '“They understood what we needed from the first call. Our new site paid for itself within three months.”'), t('<p><strong>Rasa K.</strong> · Owner, Corner Café</p>', true)])],
      },
    ],
  },
  {
    id: 'newsletter',
    group: 'landing',
    label: 'Newsletter sign-up',
    kind: 'dark',
    rows: [
      {
        cols: [
          col('1_2', [h(2, 'Tips in your inbox'), t('One short email a month with practical ideas. No spam, unsubscribe any time.')]),
          col('1_2', [t('<p>Replace this column with Divi’s Email Optin module to collect sign-ups.</p>'), btn('Subscribe', 'light')]),
        ],
      },
    ],
  },

  /* ---------- shop ---------- */
  {
    id: 'products',
    group: 'shop',
    label: 'Product grid',
    kind: 'light',
    rows: [
      { cols: [col('3_4', [h(2, 'New arrivals')]), col('1_4', [btn('View all', 'outline')])] },
      {
        cols: [
          ['Linen shirt', '€49'],
          ['Canvas tote', '€29'],
          ['Ceramic mug', '€18'],
          ['Wool scarf', '€39'],
        ].map(([name, price], i) => card('1_4', [img('product', 1, `Product ${i + 1}`), h(5, name), t(`<p><strong>${price}</strong></p>`, true), btn('Add to cart', 'outline')])),
      },
    ],
  },
  {
    id: 'categories',
    group: 'shop',
    label: 'Category tiles',
    kind: 'light',
    rows: [
      { align: 'center', cols: [one([h(2, 'Shop by category')])] },
      { cols: ['Women', 'Men', 'Home'].map((c) => col('1_3', [img('photo', 3 / 4, `${c} category`), h(4, c), t('<p><a href="#">Shop now →</a></p>')])) },
    ],
  },
  {
    id: 'sale-banner',
    group: 'shop',
    label: 'Sale banner',
    kind: 'brand',
    rows: [{ cols: [col('2_3', [h(3, 'Spring sale: 20% off everything'), t('Use code <strong>SPRING20</strong> at checkout. Ends Sunday.')]), col('1_3', [btn('Shop the sale', 'light')])] }],
  },
  {
    id: 'benefits',
    group: 'shop',
    label: 'Benefits bar',
    kind: 'surface',
    rows: [
      {
        align: 'center',
        cols: [
          col('1_4', [h(5, '✓ Free delivery'), t('on orders over €50', true)]),
          col('1_4', [h(5, '✓ 30-day returns'), t('no questions asked', true)]),
          col('1_4', [h(5, '✓ Secure payment'), t('cards, Apple Pay, bank link', true)]),
          col('1_4', [h(5, '✓ Local support'), t('real people, quick replies', true)]),
        ],
      },
    ],
  },

  /* ---------- blog & portfolio ---------- */
  {
    id: 'blog-cards',
    group: 'blog',
    label: 'Blog cards',
    kind: 'light',
    rows: [
      { cols: [col('3_4', [h(2, 'From the blog')]), col('1_4', [btn('All posts', 'outline')])] },
      {
        cols: [
          ['Design', '5 colour mistakes that make websites look cheap'],
          ['Guides', 'How to write a homepage headline that works'],
          ['News', 'What changes for small business websites this year'],
        ].map(([cat, title], i) => card('1_3', [img('photo', 16 / 9, `Post image ${i + 1}`), t(`<p>${cat} · 5 min read</p>`, true), h(4, title), t('A short excerpt that makes people want to read the rest of the post.', true), t('<p><a href="#">Read more →</a></p>')])),
      },
    ],
  },
  {
    id: 'portfolio',
    group: 'blog',
    label: 'Portfolio grid',
    kind: 'dark',
    rows: [
      { align: 'center', cols: [one([h(2, 'Selected work'), t('A few recent projects. Each one links to its own case study.')])] },
      { cols: ['Bistro website', 'Clinic booking', 'Shop redesign'].map((p, i) => col('1_3', [img('photo', 4 / 3, `Project ${i + 1}`), h(5, p), t('Web design · Divi')])) },
      { cols: ['Law firm brand', 'Spa landing page', 'Studio portfolio'].map((p, i) => col('1_3', [img('photo', 4 / 3, `Project ${i + 4}`), h(5, p), t('Branding · Web')])) },
    ],
  },
  {
    id: 'case-study',
    group: 'blog',
    label: 'Case study',
    kind: 'light',
    rows: [
      {
        cols: [
          col('1_2', [img('photo', 4 / 3, 'Case study image')]),
          col('1_2', [t('Case study', true), h(2, 'Bookings up 60% in three months'), t('A short story: the problem, what we changed and the result. Keep it specific and honest.'), t('<p><strong>+60%</strong> bookings · <strong>2.1 s</strong> load time · <strong>4 weeks</strong> to launch</p>'), btn('Read the case study', 'outline')]),
        ],
      },
    ],
  },
  {
    id: 'team',
    group: 'blog',
    label: 'Team',
    kind: 'surface',
    rows: [
      { align: 'center', cols: [one([h(2, 'Meet the team'), t('Small team, direct contact: you always talk to the people doing the work.', true)])] },
      {
        align: 'center',
        cols: [
          ['Ieva', 'Founder & designer'],
          ['Tomas', 'Developer'],
          ['Laura', 'Content & SEO'],
          ['Marius', 'Support'],
        ].map(([name, role], i) => col('1_4', [img('avatar', 1, `Team member ${i + 1}`), h(5, name), t(role, true)])),
      },
    ],
  },
  {
    id: 'timeline',
    group: 'blog',
    label: 'Timeline',
    kind: 'light',
    rows: [
      { align: 'center', cols: [one([h(2, 'Our story'), t('How we got here, in four steps.', true)])] },
      ...[
        ['2016', 'Started as a one-person studio', 'Small sites for friends and local shops.'],
        ['2019', 'First team member', 'More projects, more care for every detail.'],
        ['2022', '100th website', 'A milestone, and our first international clients.'],
        ['Today', 'Design systems for every client', 'Consistent brands that are easy to grow.'],
      ].map(([year, title, text]) => ({ cols: [col('1_4', [h(3, year)]), col('3_4', [h(5, title), t(text, true)])] })),
    ],
  },

  /* ---------- components ---------- */
  {
    id: 'contact',
    group: 'components',
    label: 'Contact',
    kind: 'light',
    rows: [
      {
        cols: [
          col('1_2', [h(2, 'Let’s talk'), t('Tell us a little about your project and we’ll reply within one working day.'), t('<p><strong>Email</strong><br>hello@example.com</p><p><strong>Phone</strong><br>+370 600 00000</p><p><strong>Studio</strong><br>Gedimino pr. 1, Vilnius</p>', true)]),
          card('1_2', [h(4, 'Send us a message'), t('Replace this card with Divi’s Contact Form module (name, email, message).', true), btn('Send message')]),
        ],
      },
    ],
  },
  {
    id: 'style-guide',
    group: 'components',
    label: 'Style guide page',
    kind: 'light',
    rows: [
      { cols: [one([t('Style guide', true), h(1, 'Heading 1: page title'), t('Body text: this page shows the colours, type and components from the design system. Keep it as a hidden reference page while building the site.')])] },
      { cols: [col('1_2', [h(2, 'Heading 2'), h(3, 'Heading 3'), h(4, 'Heading 4')]), col('1_2', [h(5, 'Heading 5'), h(6, 'Heading 6'), t('<p>Body text with a <a href="#">link</a>, <strong>bold</strong> and <em>italic</em>.</p>')])] },
      { cols: [col('1_4', [btn('Primary')]), col('1_4', [btn('Secondary', 'secondary')]), col('1_4', [btn('Outline', 'outline')]), col('1_4', [btn('Light', 'light')])] },
      {
        cols: [
          ['Primary', 'primary'],
          ['Secondary', 'secondary'],
          ['Accent', 'accent'],
          ['Text', 'text'],
        ].map(([label, v]) => col('1_4', [t(`<div class="d5-swatch" style="background: var(--${v})"></div><p><strong>${label}</strong> · var(--${v})</p>`)])),
      },
      { cols: [card('1_3', [h(4, 'Card'), t('Cards use the surface colour, border and small shadow.', true)]), col('1_3', [h(4, 'Tile'), t('A coloured tile for highlights.')], { tone: 'brand' }), col('1_3', [h(4, 'Dark tile'), t('For contrast moments.')], { tone: 'dark' })] },
    ],
  },
  {
    id: 'header-centered',
    group: 'components',
    label: 'Header: centred logo',
    kind: 'light',
    part: 'header',
    rows: [{ cols: [col('1_3', [{ type: 'text', html: '<p><a href="/about/">About</a> · <a href="/services/">Services</a></p>', cls: 'd5-nav' }]), col('1_3', [h(5, 'Your brand')]), col('1_3', [btn('Book a call')])] }],
  },
  {
    id: 'footer-cta',
    group: 'components',
    label: 'Footer with call to action',
    kind: 'dark',
    part: 'footer',
    rows: [
      { align: 'center', cols: [one([h(2, 'Let’s build something great'), t('Free 20-minute call. No obligation.'), btn('Book a call', 'light')])] },
      {
        cols: [
          col('1_4', [h(6, 'Your brand'), t('Web design studio in Vilnius.')]),
          col('1_4', [h(6, 'Pages'), t('<p><a href="/about/">About</a><br><a href="/work/">Work</a><br><a href="/blog/">Blog</a></p>')]),
          col('1_4', [h(6, 'Services'), t('<p><a href="#">Websites</a><br><a href="#">Branding</a><br><a href="#">Care plans</a></p>')]),
          col('1_4', [h(6, 'Contact'), t('<p>hello@example.com<br>+370 600 00000</p>')]),
        ],
      },
      { cols: [one([t('<p>© Your brand · Privacy policy · Cookies</p>')])] },
    ],
  },
  /* ---------- shop: real products ---------- */
  {
    id: 'products-woo',
    group: 'shop',
    label: 'Product grid (WooCommerce)',
    kind: 'light',
    rows: [
      { cols: [col('3_4', [h(2, 'Shop our favourites'), t('Real products from your WooCommerce shop, styled with your fonts and colours.', true)]), col('1_4', [btn('View all', 'outline')])] },
      { cols: [one([{ type: 'shop' }])] },
    ],
  },

  /* ---------- restaurant & booking ---------- */
  {
    id: 'menu',
    group: 'restaurant',
    label: 'Menu with prices',
    kind: 'light',
    rows: [
      { align: 'center', cols: [one([h(2, 'Our menu'), t('Seasonal dishes made with local produce.', true)])] },
      {
        cols: [
          col('1_2', [h(4, 'Starters'), t('<p><strong>Cold beetroot soup</strong> · €7<br>Dill, cucumber, egg</p><p><strong>Smoked trout</strong> · €11<br>Rye crisp, horseradish cream</p><p><strong>Garden salad</strong> · €8<br>Herbs, seeds, honey dressing</p>')]),
          col('1_2', [h(4, 'Mains'), t('<p><strong>Potato dumplings</strong> · €14<br>Pork or mushroom filling, sour cream</p><p><strong>Roast chicken</strong> · €16<br>Barley, greens, pan juices</p><p><strong>Baked pike-perch</strong> · €19<br>Brown butter, potatoes</p>')]),
        ],
      },
      { align: 'center', cols: [one([btn('Download the full menu', 'outline')])] },
    ],
  },
  {
    id: 'hours-map',
    group: 'restaurant',
    label: 'Opening hours & location',
    kind: 'surface',
    rows: [
      {
        cols: [
          col('1_2', [h(3, 'Opening hours'), t('<p><strong>Mon–Thu</strong> · 11:00–22:00<br><strong>Fri–Sat</strong> · 11:00–23:00<br><strong>Sun</strong> · 12:00–21:00</p>'), h(5, 'Find us'), t('<p>Pilies g. 1, Vilnius<br>+370 600 00000</p>', true), btn('Get directions', 'outline')]),
          col('1_2', [img('photo', 4 / 3, 'Map or photo of the place'), t('Replace the picture with Divi’s Map module if you prefer a live map.', true)]),
        ],
      },
    ],
  },
  {
    id: 'booking',
    group: 'restaurant',
    label: 'Book a table',
    kind: 'brand',
    rows: [{ align: 'center', cols: [one([h(2, 'Book a table'), t('Lunch, dinner or a private event: we’ll keep a place for you.'), btn('Book online', 'light'), t('<p>or call <a href="tel:+37060000000">+370 600 00000</a></p>')])] }],
  },
  {
    id: 'specials',
    group: 'restaurant',
    label: 'Events & specials',
    kind: 'light',
    rows: [
      { align: 'center', cols: [one([h(2, 'This week')])] },
      {
        cols: [
          ['Fri · 19:00', 'Live jazz evening'],
          ['Sat · 12:00', 'Family brunch'],
          ['Sun · all day', 'Chef’s tasting menu'],
        ].map(([when, title], i) => card('1_3', [img('photo', 4 / 3, `Event ${i + 1}`), t(when, true), h(4, title), t('One or two lines about what to expect and how to book.', true)])),
      },
    ],
  },

  /* ---------- services & trust ---------- */
  {
    id: 'services-list',
    group: 'trust',
    label: 'Services list',
    kind: 'light',
    rows: [
      { align: 'center', cols: [one([h(2, 'What we do'), t('Four services, one team.', true)])] },
      { cols: [card('1_2', [h(4, 'Website design'), t('Custom Divi websites that are easy to update.', true), t('<p><a href="#">Learn more →</a></p>')]), card('1_2', [h(4, 'Branding'), t('Logo, colours and fonts that work everywhere.', true), t('<p><a href="#">Learn more →</a></p>')])] },
      { cols: [card('1_2', [h(4, 'SEO & content'), t('Pages people find and actually read.', true), t('<p><a href="#">Learn more →</a></p>')]), card('1_2', [h(4, 'Care plans'), t('Updates, backups and small changes every month.', true), t('<p><a href="#">Learn more →</a></p>')])] },
    ],
  },
  {
    id: 'reviews',
    group: 'trust',
    label: 'Reviews summary',
    kind: 'subtle',
    rows: [
      { align: 'center', cols: [one([h(2, '4.9 out of 5'), t('<p>★★★★★ from 120 Google reviews</p>')])] },
      {
        cols: [
          ['“Quick, friendly and the result looks great on every phone.”', 'Gintarė, bakery owner'],
          ['“They explained everything in plain words. No surprises.”', 'Darius, accountant'],
          ['“Bookings went up the month after launch.”', 'Eglė, spa manager'],
        ].map(([q, who]) => card('1_3', [t('<p>★★★★★</p>'), t(`<p>${q}</p>`), t(`<p><strong>${who}</strong></p>`, true)])),
      },
    ],
  },
  {
    id: 'awards',
    group: 'trust',
    label: 'Awards & certificates',
    kind: 'surface',
    rows: [
      { align: 'center', cols: [one([t('Certified, insured and recognised', true)])] },
      { align: 'center', cols: [1, 2, 3, 4].map((n) => col('1_4', [img('logo', 3, `Certificate ${n}`)])) },
    ],
  },
  {
    id: 'guarantee',
    group: 'trust',
    label: 'Guarantee',
    kind: 'light',
    rows: [
      {
        cols: [
          col('2_3', [h(3, 'Our promise'), t('If the site isn’t what we agreed, we fix it free of charge. You only pay when you’re happy with the result.'), btn('Read the terms', 'outline')]),
          col('1_3', [h(2, '30 days'), t('free fixes after launch')], { tone: 'brand' }),
        ],
      },
    ],
  },
  {
    id: 'faq-split',
    group: 'trust',
    label: 'FAQ with contact',
    kind: 'surface',
    rows: [
      {
        cols: [
          col('1_2', [h(2, 'Questions?'), t('The answers to what most clients ask. Still unsure? Write to us.', true), btn('Contact us')]),
          col('1_2', [{ type: 'accordion', items: [{ title: 'What does it cost?', html: '<p>Most small business sites cost between €1,500 and €4,000.</p>' }, { title: 'Who writes the text?', html: '<p>You, us, or together: we can help with every page.</p>' }, { title: 'Is hosting included?', html: '<p>We recommend and set up hosting; the first year can be included.</p>' }] }]),
        ],
      },
    ],
  },

  /* ---------- media ---------- */
  {
    id: 'gallery',
    group: 'media',
    label: 'Image gallery',
    kind: 'light',
    rows: [
      { align: 'center', cols: [one([h(2, 'Gallery')])] },
      { cols: [1, 2, 3].map((n) => col('1_3', [img('photo', 1, `Gallery image ${n}`)])) },
      { cols: [4, 5, 6].map((n) => col('1_3', [img('photo', 1, `Gallery image ${n}`)])) },
    ],
  },
  {
    id: 'video',
    group: 'media',
    label: 'Video',
    kind: 'dark',
    rows: [
      { align: 'center', cols: [one([h(2, 'See how we work'), t('Two minutes, from first sketch to launch.')])] },
      { cols: [one([{ type: 'video', label: 'Video thumbnail' }])] },
    ],
  },
  {
    id: 'cta-image',
    group: 'media',
    label: 'Call to action with image',
    kind: 'subtle',
    rows: [{ cols: [col('1_2', [img('photo', 4 / 3, 'CTA image')]), col('1_2', [h(2, 'Ready when you are'), t('Tell us about your project and get a clear plan and price within two days.'), btn('Start your project')])] }],
  },
  {
    id: 'before-after',
    group: 'media',
    label: 'Before & after',
    kind: 'light',
    rows: [
      { align: 'center', cols: [one([h(2, 'Before & after'), t('The same business, a new website.', true)])] },
      { cols: [col('1_2', [img('photo', 4 / 3, 'Before'), h(5, 'Before'), t('Slow, hard to read on phones.', true)]), col('1_2', [img('photo', 4 / 3, 'After'), h(5, 'After'), t('Fast, clear, bookings up 60%.', true)])] },
    ],
  },

  /* ---------- utility pages ---------- */
  {
    id: 'announcement',
    group: 'utility',
    label: 'Announcement bar',
    kind: 'brand',
    rows: [{ cols: [col('3_4', [t('<p><strong>New:</strong> online booking is now open.</p>')]), col('1_4', [t('<p><a href="#">Book now →</a></p>')])] }],
  },
  {
    id: 'not-found',
    group: 'utility',
    label: '404 page',
    kind: 'light',
    rows: [{ align: 'center', cols: [one([h(1, '404'), h(3, 'This page has moved or no longer exists'), t('Try the home page, or tell us what you were looking for.', true), btn('Back to home'), btn('Contact us', 'outline')])] }],
  },
  {
    id: 'coming-soon',
    group: 'utility',
    label: 'Coming soon',
    kind: 'dark',
    rows: [{ align: 'center', cols: [one([t('Launching spring 2027'), h(1, 'Something new is coming'), t('Leave your email and be the first to know.'), btn('Get notified', 'light')])] }],
  },
  {
    id: 'thank-you',
    group: 'utility',
    label: 'Thank-you page',
    kind: 'subtle',
    rows: [{ align: 'center', cols: [one([h(2, 'Thank you!'), t('We’ve received your message and will reply within one working day.'), btn('Back to home', 'outline')])] }],
  },
  {
    id: 'privacy-note',
    group: 'utility',
    label: 'Privacy & cookies note',
    kind: 'surface',
    rows: [{ cols: [col('3_4', [h(5, 'Your privacy'), t('We use only the cookies needed to run this site and, with your consent, anonymous statistics. <a href="/privacy-policy/">Privacy policy</a>', true)]), col('1_4', [btn('OK')])] }],
  },
]

/** Full pages made from sections, each one download. */
export const FULL_PAGES: { id: string; label: string; sections: string[] }[] = [
  { id: 'home', label: 'Home', sections: ['hero-split', 'logos', 'bento', 'steps', 'big-quote', 'pricing', 'faq', 'cta'] },
  { id: 'about', label: 'About', sections: ['hero-stats', 'timeline', 'team', 'testimonials', 'cta'] },
  { id: 'services', label: 'Services', sections: ['hero', 'alternating', 'steps', 'comparison', 'pricing', 'faq', 'cta'] },
  { id: 'contact-page', label: 'Contact', sections: ['contact', 'faq', 'stats-band'] },
  { id: 'shop-home', label: 'Shop home', sections: ['sale-banner', 'hero-split', 'categories', 'products', 'benefits', 'newsletter'] },
  { id: 'blog-home', label: 'Blog & work', sections: ['hero', 'blog-cards', 'portfolio', 'case-study', 'newsletter'] },
  { id: 'shop-woo', label: 'Shop home (WooCommerce)', sections: ['announcement', 'hero-split', 'categories', 'products-woo', 'benefits', 'reviews', 'newsletter'] },
  { id: 'restaurant', label: 'Restaurant', sections: ['hero-split', 'menu', 'specials', 'gallery', 'reviews', 'hours-map', 'booking'] },
  { id: 'services-page', label: 'Services & trust', sections: ['hero-stats', 'services-list', 'steps', 'guarantee', 'awards', 'reviews', 'faq-split', 'cta'] },
  { id: 'landing', label: 'Landing page', sections: ['hero-split', 'logos', 'bento', 'video', 'stats-band', 'reviews', 'pricing', 'faq-split', 'cta-image'] },
  { id: '404', label: '404 page', sections: ['not-found'] },
  { id: 'coming-soon-page', label: 'Coming soon', sections: ['coming-soon'] },
  { id: 'thank-you-page', label: 'Thank you', sections: ['thank-you'] },
]
