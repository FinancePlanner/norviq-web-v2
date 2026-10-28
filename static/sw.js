// Copied from norviq-web internal/server/assets/sw.js and served at the same
// URL (/sw.js) from static/, rather than ported to SvelteKit's
// src/service-worker.ts (which would be served at /service-worker.js): browsers
// that already registered the Go web's /sw.js keep checking that URL, so
// serving it there updates them in place. It caches only /static/* (cache
// first) and navigations (network first, offline fallback) — SvelteKit's
// hashed /_app/immutable/ files are left to the HTTP cache, as Go's
// fingerprinted bundles were.
//
// Only change from Go: CACHE_VERSION is bumped so the first v2 deploy purges
// the cached Go-era pages (their HTML points at /static/scripts.js, which v2
// does not serve).
// CACHE_VERSION names the cache bucket only. It deliberately no longer appears
// in any asset URL: the activate handler deletes every cache whose key !== CACHE,
// so bumping this string purges the old bucket. Because it is not part of a URL,
// forgetting to bump it can no longer serve a stale asset.
const CACHE_VERSION = '20261028-sveltekit'
const CACHE = `norviq-static-v4-${CACHE_VERSION}`

// Precache only assets served at a stable, unversioned path.
//
// styles.css and scripts.js are deliberately NOT here. Pages request them with
// a content SHA-256 query (see internal/pages/components/asset_version.go), so
// the previous entries — /static/styles.css?v=<hand-typed date> — were URLs no
// page would ever request. They downloaded a second full copy of the CSS and JS
// and pinned an obsolete build in the cache. cacheFirst below keys on the full
// URL including the fingerprint, so changed content yields a new URL and a
// natural cache miss; those files need no precaching to stay correct.
const STATIC = [
  '/static/favicon.png',
  '/static/manifest.webmanifest',
  '/static/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
  }
})

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached
    return fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy))
      }
      return response
    })
  })
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy))
      }
      return response
    })
    .catch(() =>
      caches.match(request).then((cached) => cached || caches.match('/'))
    )
}
