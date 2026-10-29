# Insights (reports, markets, economy) — parity checklist

Scope: Go routes under `/reports`, `/markets`, `/economy` (docs/parity/ROUTES.md).
Branch `port/insights`. Routes in `src/routes/(app)/{reports,markets,economy}/**`,
helpers in `src/lib/features/insights/**`. 25 routes: 25 done.

## /reports (16)

- [x] `GET /reports` → `(app)/reports/+page` (`features/insights/reports/ReportsPage.svelte`, `load.server.ts`)
- [x] `GET /reports/{tab}` → `(app)/reports/[tab]/+page` (overview, portfolio, spending, trends; else 404)
- [x] `GET /reports/advanced` → `(app)/reports/advanced/+page` (gate: `advanced_report_runs`, "Advanced reports")
- [x] `POST /reports/advanced/templates` → action `?/templates` (303 back with `?notice`/`?error` like Go)
- [x] `POST /reports/advanced/runs` → action `?/runs`
- [x] `POST /reports/advanced/schedules` → action `?/schedules`
- [x] `GET /reports/advanced/artifacts/{id}` → `advanced/artifacts/[id]/+server.ts` — 303 (external) to the backend's signed link, http/https only, same as Go. Go never streamed the file, so neither does v2.
- [x] `GET /reports/deep-dive` → `(app)/reports/deep-dive/+page` (gate: `statistics`)
- [x] `GET /reports/deep-dive/{calendar,contribution,currency,notes,sectors,scorecard,volatility,winners}` (8) → `deep-dive/[report]/+page` (unknown slug 404s, as chi did)

`reports-preferences.js` → `features/insights/reports/preferences.svelte.ts` (`ReportsPageState`), with the same localStorage keys (`reports_dashboard_order`, `reports_dashboard_hidden`) so existing preferences carry over. Customize modal, reorder, hide/show, reset, "Nothing to show here" empty state and the `overviewChartsResize` event are ported. Charts use `<EChart>` with Go's ids (`reports-net-worth-chart`, …).

## /markets (6)

- [x] `GET /markets` → `(app)/markets/+page`
- [x] `GET /markets/overview` (htmx fragment) → streamed promise rendered in `/markets` (same skeleton). The heat-map uses `marketHeatmap` from `#lib/charts` (Go uses ECharts, not MapLibre, so there is no new dependency).
- [x] `GET /markets/earnings` → `(app)/markets/earnings/+page` (`?week`, `?scope=mine`)
- [x] `GET /markets/congress` → `(app)/markets/congress/+page` ("Follow a politician" only when `pilotsEnabled()` from settings-admin's `pilots/gate.server.ts`)
- [x] `GET /markets/sentiment` → `(app)/markets/sentiment/+page`
- [x] `GET /markets/sentiment/board` (htmx fragment) → streamed promise in `/markets/sentiment`

## /economy (3)

- [x] `GET /economy` → `(app)/economy/[[section]]/+page`
- [x] `GET /economy/{section}` → same route (inflation, personal, housing, growth, fed; else 404). `activePath` is returned when it differs from the URL.
- [x] `GET /economy/news` (htmx fragment) → `EconomyNewsSection.svelte` / `EconomyNewsShell.svelte`, fed by `loadEconomyPulse(event, 8)`. Used on `/economy` and `/markets`. The URL itself now 404s.

## Deviations and kept oddities

- Go's `x-cloak` hid every report card until Alpine started. v2 SSR-renders the cards for the current tab and applies hidden/order preferences after mount.
- The Go grid's `staggerReveal(':scope > article')` matches nothing (the direct children are `.report-card-slot` divs). This is kept as is.
- Deep-dive index icons: Go asks for `pie-chart` and `bar-chart-3`, which its icon set does not have (the templ icon lookup errors). v2 uses the same Lucide glyphs under their registry names, `chart-pie` and `chart-column`.
- The schedule `localTime` is a free time input, but `formChoice` keeps only 08:00, 09:00, 12:00 or 18:00, and the zone is `Europe/Lisbon`. Both are kept from Go: the Go pod's zone was "Local", which fell back to Lisbon.
- `/markets/congress` renders Go's own feed table, not the kit's per-symbol `CongressTrades` widget. It does use the kit `CongressTradeVM` type and `SentimentBadge`.
- The advanced reporting fetches run in parallel (Go ran them one after another). The error list keeps Go's order.
- The economy templ has no `i18n.T` calls, so economy (and markets/reports) strings stay English literals, as in Go.

## Shared changes

- `shared:` c07597b — `AppShell.svelte` / `SectionSubNav.svelte` use `page.data.activePath` when a page returns one (Go `renderShell` activePath). The pilots pages already return `activePath: '/markets'`, so they now highlight Markets, and `/economy/inflation` highlights `/economy`.

## Backend gaps (staging, 2026-10-29)

- `GET /v1/market/overview` → 502. `/markets` shows "Markets are warming up".
- `GET /v1/market/earnings-calendar` → 503. The page shows "The calendar is unavailable right now".
- `GET /v1/market/congress/recent` → 503. The page shows the "feed is unavailable" copy.
- Economy housing and growth return stub data, so every indicator shows "Not covered".
- `/v1/reporting/*` has no DELETE, so template, schedule and run creation were not exercised, to avoid leaving permanent staging data. Only the error paths were tested: a run on an unknown template redirects with `?error=Not Found`, and an unknown artifact redirects with `?error=Not Found`.

## Not verified

- Client-side behaviour in a browser (the browser extension was unavailable): chart drawing, the customize modal, preference persistence, and the hero count-up. SSR output, status codes, `bun run check` and `bun run build` were verified.
- The happy paths for create template, schedule and run (see above), and a real artifact download redirect.
- Pro-gate rendering for a free account. The test account is Pro.
