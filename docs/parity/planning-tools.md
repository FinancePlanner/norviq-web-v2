# Planning and trading tools parity

Branch `port/planning-tools`. Routes `src/routes/(app)/{planning,terminal,forecast,scenarios,simulator,chart-builder,crypto,research,trading}/**`,
code `src/lib/features/planning-tools/**`.
`[x]` done · `[~]` partial · `[ ]` not done.

Go gates (server.go): `/chart-builder` Market fundamentals · `/forecast/**` Net worth forecasting ·
`/scenarios/**` Scenario planning · `/crypto/**` Crypto · `/research`, `/research/{id}/delete` Advanced research ·
`/research/memos/**` AI insights (+ AI consent). `/planning/**`, `/simulator/**`, `/trading`, `/terminal/**` are ungated
at the route level.

## /terminal (13)

Go answered each write with an htmx fragment (the workspace, the autobuys panel, or out-of-band slots for one
row). v2 keeps every URL and method as a `+server.ts` that answers the same view model as JSON
(`features/planning-tools/terminal/terminal.server.ts`); the page re-renders that region. A cell edit only updates
the edited inputs, the derived values, the error and the footer, and never re-creates inputs, so focus and
half-typed text in other cells survive, as in Go. There were no keyboard shortcuts: cells save on `change`
(blur or Enter); focus order is the same DOM order. `terminal.js` is ported in `vm.ts` (`compactLabel`) and the
autobuy form (chip prefill focuses Amount; percent field follows cadence).

- [x] GET /terminal → `terminal/+page.server.ts` + `+page.svelte` (`?ticker=` opens the create form; 401 clears the session and goes to login)
- [x] PATCH /terminal/positions/{id} → `terminal/positions/[id]/+server.ts` (RowEditResult: edit / gone / unknown)
- [x] POST /terminal/positions → `terminal/positions/+server.ts` (Idempotency-Key forwarded; "Use this row" posts the sample values)
- [x] DELETE /terminal/positions/{id} → `terminal/positions/[id]/+server.ts` (confirm() like hx-confirm)
- [x] POST /terminal/positions/{id}/duplicate → `…/duplicate/+server.ts`
- [x] POST /terminal/positions/{id}/move → `…/move/+server.ts` (PUT full order)
- [x] POST /terminal/positions/{id}/ai/facts → `…/ai/facts/+server.ts` (Pro check, then AI consent; consent → in-place dismissible AIConsentCard)
- [x] POST /terminal/positions/{id}/ai/scenario → `…/ai/scenario/+server.ts`
- [x] POST /terminal/sample/dismiss → `terminal/sample/dismiss/+server.ts` (cookie `nq_terminal_sample_dismissed`, path /terminal, 1 year)
- [x] POST /terminal/autobuys → `terminal/autobuys/+server.ts`
- [x] PATCH /terminal/autobuys/{id} → `terminal/autobuys/[id]/+server.ts` (rejected save reopens that item's edit form)
- [x] POST /terminal/autobuys/{id}/active → `…/active/+server.ts`
- [x] DELETE /terminal/autobuys/{id} → `terminal/autobuys/[id]/+server.ts`

## /trading (1)

- [~] GET /trading → `trading/+page.server.ts` + `+page.svelte`. A prototype in Go; oddities kept: the Buy form posts to
  `/portfolio/positions` and the Short form to the literal `/portfolio/positions/{id}/sell` (portfolio domain); the
  watchlist search's Add buttons do nothing (their hx-target is not on the page). **Deviation:** Go's range buttons and
  row clicks hx-got the whole `/portfolio/{symbol}/chart` page into `#main-chart`; v2 fetches the same price history
  (`/api/v1/market/history`) and draws the chart tab's `wealthLine('stock-price-chart')`. Rows are built from
  `/v1/stocks` + `/v1/pnl` + `/v1/market/quote/batch` (only the columns LoadHoldingsViewModel fed this page).

## /chart-builder (1)

- [x] GET /chart-builder → `chart-builder/+page.server.ts` (Stock fundamentals gate; reuses dashboard `loadAssetSearchResults`; results link to `/portfolio/{sym}/builder`)

## /research (6)

- [x] GET /research → `research/+page.server.ts` (Advanced research gate; saved memos `?bookmarked=true`, empty on failure)
- [x] POST /research → default action of `research/` (303 `/research?saved=1`; errors in `#research-feedback`)
- [x] POST /research/{id}/delete → `research/[id]/delete/+server.ts` (303, or bare 400/502 that changes nothing)
- [x] GET /research/memos/{id} → `research/memos/[id]/` (AI insights gate; bad/unknown id → 404 rendered as MemoNotFound by `+error.svelte`; 502 otherwise)
- [x] POST /research/memos/{id}/bookmark → `…/bookmark/+server.ts` (answers the PositionMemoCard JSON; `MemoSaveButton` re-renders)
- [x] POST /research/memos/{id}/delete → `…/delete/+server.ts`
- **Added per orchestrator brief:** the three memo routes check AI consent (`dashboard/ai-consent.server.ts`). Go's server.go
  mounts only RequireFeature(AIInsights) on them; the backend's `/v1/ai/*` refuses without consent anyway.

## /scenarios (11)

- [ ] GET /scenarios
- [ ] POST /scenarios/runs
- [ ] POST /scenarios/snapshot-review
- [ ] GET /scenarios/runs/{id}
- [ ] DELETE /scenarios/runs/{id}
- [ ] GET /scenarios/runs/{id}/report.pdf
- [ ] POST /scenarios/compare
- [ ] POST /scenarios/configurations/{id}/runs
- [ ] DELETE /scenarios/configurations/{id}
- [ ] POST /scenarios/risk-profiles
- [ ] DELETE /scenarios/risk-profiles/{id}

## /forecast (5)

- [ ] GET /forecast
- [ ] POST /forecast
- [ ] POST /forecast/{id}
- [ ] POST /forecast/{id}/run
- [ ] POST /forecast/{id}/delete

## /crypto (9)

- [ ] GET /crypto/portfolio/holding
- [ ] GET /crypto/portfolio/holding/{id}
- [ ] POST /crypto/portfolio/holding
- [ ] PUT /crypto/portfolio/holding/{id}
- [ ] DELETE /crypto/portfolio/holding/{id}
- [ ] GET /crypto/markets/fragment
- [ ] GET /crypto/coin/{symbol}
- [ ] GET /crypto
- [ ] GET /crypto/{tab}

## /planning (4)

- [ ] GET /planning/grow
- [ ] POST /planning/grow/preview
- [ ] GET /planning/retire
- [ ] POST /planning/retire/preview

## /simulator (3)

- [ ] GET /simulator
- [ ] POST /simulator/preview
- [ ] POST /simulator/save

## Shared files changed

## Backend gaps

## Not verified
