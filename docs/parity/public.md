# Public site, share pages, articles, SEO endpoints (`port/public`)

Group `(public)` (no shell, `src/routes/(public)/+layout.svelte` = `templates.PublicLayout`:
PWA head meta + mesh background; no service worker). Machine files are ungrouped
`+server.ts` with Go's bytes and headers. Feature code: `src/lib/features/public/`.

Verified side by side against the Go web (same staging API, same PUBLIC_BASE_URL):
robots.txt, llms.txt, security.txt, AASA and sitemap.xml are byte-identical; `/`,
the legal pages, `/brief/{date}/{slot}` (en + pt-PT, 200 and 404), `/articles` and
`/i/{code}` have identical `<head>` meta/OG/canonical/JSON-LD and identical `<main>`
markup (modulo `?v=` asset fingerprints, Alpine → Svelte attributes and lucide classes).
Share images were compared visually with Go's output.

## Routes

### Machine files / static
- [x] GET /robots.txt → `routes/robots.txt/+server.ts`
- [x] GET /sitemap.xml → `routes/sitemap.xml/+server.ts` (articles + latest brief paths)
- [x] GET /llms.txt → `routes/llms.txt/+server.ts`
- [x] GET /.well-known/apple-app-site-association → `routes/.well-known/apple-app-site-association/+server.ts`
- [x] GET /.well-known/security.txt → `routes/.well-known/security.txt/+server.ts`
- [x] GET /apple-app-site-association → `routes/apple-app-site-association/+server.ts`
- [x] GET /install.sh → `routes/install.sh/+server.ts` (script copied verbatim to `features/public/install.sh`, `?raw`)
- [x] GET /sw.js → **existing mapping**: `static/sw.js` served by the Workers static assets. Not a route: a `+server.ts` cannot shadow a static file. Go's `Service-Worker-Allowed: /` is redundant at root scope; Cloudflare's default asset caching revalidates (= Go's `no-cache`).
- [x] HANDLE /static/* → **existing mapping**: `static/static/`. Go's immutable `Cache-Control` is replaced by Cloudflare's default revalidating cache (v2 assets are not fingerprinted under `/static`); add a `_headers` file if long caching is wanted.
- [x] GET /runtime-config.js → **not needed**: the root layout's `runtime` data (`#lib/analytics/runtime.server.js`) replaces it, including the capture-once pop. Nothing in v2 loads the URL; it 404s. A route would become a second consumer of the capture-once flag.
- [x] HANDLE /thinking-orbs/js/* → **dead, not ported**: Go loads `orb.js` in AppLayout but no Go page renders an `orb.Orb` canvas.

### Landing and legal
- [x] GET / → `(public)/+page.server.ts` + `features/public/landing/` (signed-in → `postAuthRedirect` 303; `IOS_STORE_REDIRECT_ENABLED` + iPhone/iPad UA → 302 to the App Store unless `?web=1` / `norviq_stay_web` cookie; `?web=1` sets the cookie; hero card wall, landing.css, CTA `cta_clicked` capture, scroll reveals via `#lib/motion.js` `initScrollTaste` = motion-reveal.js, market brief card via `MarketBriefShell` = market-brief.js)
- [x] GET /privacy, /terms, /legal, /security, /facebook-data-deletion → `(public)/<path>/+page.server.ts` + `features/public/legal/LegalPage.svelte`; text in `documents.json`, dumped from Go's `content.go`/`notices.go` with encoding/json (byte-identical; regenerate when the legal text changes)

### Market brief
- [x] GET /market-brief → `(public)/market-brief/+server.ts` (JSON `{vm}` for `MarketBriefShell`, same contract as `/dashboard/market-brief`)
- [x] GET /brief → `(public)/brief/+page.server.ts` (302 to the latest, in `?lang`; 404 page / 503)
- [x] GET /brief/{date}/{slot} → `(public)/brief/[date]/[slot]/` + `features/public/brief/` (language from `?lang`, sets `locals.locale` so `<html lang>` and `t()` follow it; 404 page in `(public)/brief/+error.svelte`)
- [x] GET /brief/{date}/{slot}/og.png, /card.png → `(public)/brief/[date]/[slot]/{og,card}.png/+server.ts`

### Articles (sub-agent)
- [x] GET /articles → `(public)/articles/+page.server.ts`
- [x] GET /articles/ticker/{symbol} → `(public)/articles/ticker/[symbol]/`
- [x] GET /articles/images/{id} → `(public)/articles/images/[id]/+server.ts`
- [x] GET /articles/{code}/og.png, /card.png → `(public)/articles/[code]/{og,card}.png/+server.ts`
- [x] POST /articles/{code}/view → `(public)/articles/[code]/view/+server.ts`
- [x] GET /articles/{slugcode} → `(public)/articles/[slugcode]/` (signed-in and anonymous; Go uses PublicLayout for both)
- [x] GET+POST /articles/new → `(app)/articles/new/` (load + default action)
- [x] POST /articles/preview → `(app)/articles/preview/+server.ts`
- [x] GET+POST /articles/{code}/edit → `(app)/articles/[code]/edit/`
- [x] POST /articles/{code}/delete, /vote, /report, /visibility → `(app)/articles/[code]/<action>/+server.ts` (vote returns JSON for `VoteButton` instead of Go's fragment)
- [x] GET /a/{code} → `(public)/a/[code]/+server.ts`
- [x] GET /u/{username}/articles → `(public)/u/[username]/articles/`

### Share pages (sub-agent)
- [x] GET /s/{symbol} → `(public)/s/[symbol]/` + `features/public/stock/`
- [x] GET /p/{slug} → `(public)/p/[slug]/` + `features/public/portfolio-share/` (30/min/IP limiter, 429)
- [x] GET /i/{code} → `(public)/i/[code]/` + `features/public/invite/` (Accept posts to `/friends/invite/{code}/accept`, owned by the friends agent)
- [x] GET /g/{code} → `(public)/g/[code]/`
- [x] POST /g/{code}/join → `(app)/g/[code]/join/+server.ts`

## Deviations / notes
- **Landing JSON-LD (Go bug, ported as-is):** Go's `landing.templ` puts `@templ.Raw(StructuredData(vm))` inside `<script>`, so production serves that literal text as JSON-LD. v2 emits the same bytes; the intended graph is `structuredData()` in `features/public/landing/landing.ts`, a one-line swap in `LandingPage.svelte`.
- **Rendered-page caches** (Go `publicPageCache`) are not ported; data lookups are cached per isolate (brief, stock, invites, images) and the same `Cache-Control` lets the CDN share the HTML. Pages viewed with a session send `private, no-store` / `private` instead of Go's shared header, because every v2 page carries the root layout's user data.
- **Share images:** `features/public/sharecard/` ports `internal/sharecard` with a small TrueType reader, rasteriser and PNG encoder (CompressionStream) and the Go fonts (BSD, ~300 KB in the server bundle). Layout/text fitting match Go; pixels differ only in anti-aliasing and compression. CPU per image is a few tens of ms on a cache miss.
- **Brief 503** is the SvelteKit error page with Go's message (Go wrote plain text).
- **POST /g/{code}/join when banned** redirects to `/boards` (shows the banned page) instead of rendering it inline.

## Shared files changed
- `src/hooks.server.ts`: `<html lang>` uses `event.locals.locale` (so a page can set its own language).
- `src/lib/features/dashboard/market-brief/`: `MarketBriefContent.svelte` split out of `MarketBriefCard.svelte` (same output), reused by `/brief/{date}/{slot}`.
- `docs/parity/ROUTES.md`: rows ticked.

## Backend gaps (staging)
- `/s/{symbol}`: market history returns empty bars; technicals "No price history"; insider/institutional/congress "provider rate limited"; recent earnings 503. Only the header and sentiment render on staging.
- The public token is rate-limited on staging (429 under modest load); `/brief` and `/s` degrade exactly like Go (503 / missing sections, partial page cached for the TTL).
- Article save with no key points sends `bulletPoints: null` (as Go); staging rejects it with a raw decoder error shown to the reader.

## Not verified
- Article og/card PNG against a live article (no articles on staging; rendering covered by `sharecard.spec.ts`).
- `/articles/new` past its guidelines gate (test user hasn't accepted the guidelines); browser-side vote/view beacon.
- `/p/{slug}` with real holdings (test user has none); `/s` sections other than header/sentiment on a live page.
- Staging data left: friend invite `WDrPb4aHBA` of the main test user (pre-existing live link, returned by the backend).
