/* D5 WebTool service worker: makes the app open offline after the first visit.
   - Pages: network first (always the newest version when online), cached copy when offline.
   - Scripts, styles, images, fonts: served from the cache and refreshed in the background.
   - The PHP API (/api/…) is never cached: sign-in, sync and review links always use live data. */

const CACHE = 'd5wt-v1'
const SHELL = ['./', './index.html', './favicon.svg', './manifest.webmanifest', './icons/icon-192.png']

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => {}),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const sameOrigin = url.origin === self.location.origin
  if (sameOrigin && /\/api(\/|$)/.test(url.pathname)) return // live data only
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))),
    )
    return
  }

  // stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        const fresh = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone())
            return res
          })
          .catch(() => hit)
        return hit || fresh
      }),
    ),
  )
})
