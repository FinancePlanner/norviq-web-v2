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

Every load, action and `+server` handler checks RequireFeature(ScenarioPlanning). Go's fragment routes stay at the same paths and answer JSON.

- [x] GET /scenarios → `scenarios/+page.server.ts` + `+page.svelte`
- [x] POST /scenarios/runs → `runs/+server.ts` (`{redirect}`, then `goto`)
- [x] POST /scenarios/snapshot-review → `snapshot-review/+server.ts` (rendered by `SnapshotReview.svelte`)
- [x] GET /scenarios/runs/{id} → `runs/[id]/+server.ts`; `RunCard.svelte` polls it every 2s with TanStack
- [x] DELETE /scenarios/runs/{id} → `runs/[id]/+server.ts`
- [x] GET /scenarios/runs/{id}/report.pdf → `runs/[id]/report.pdf/+server.ts` (`features/planning-tools/scenarios/pdf.ts`, fpdf port; no Title/Author metadata)
- [x] POST /scenarios/compare → `compare/+server.ts` (`Comparison.svelte`, EChart)
- [x] POST /scenarios/configurations/{id}/runs → `configurations/[id]/runs/+server.ts`
- [x] DELETE /scenarios/configurations/{id} → `configurations/[id]/+server.ts`
- [x] POST /scenarios/risk-profiles → `risk-profiles/+server.ts`
- [x] DELETE /scenarios/risk-profiles/{id} → `risk-profiles/[id]/+server.ts`
- **Deviations to review:** Go rendered `Management` once per run and inside the compare `<form>`, which broke its forms. v2 renders it once, after the runs list, and only when runs exist. Go's htmx dropped 4xx responses, so 422 validation messages never showed; v2 shows them.

## /forecast (5)

- [x] GET /forecast → `forecast/+page.server.ts` + `+page.svelte` (Net worth forecasting gate)
- [x] POST /forecast → default action
- [x] POST /forecast/{id} → `forecast/[id]/+server.ts` (303 or plain-text error, as in Go)
- [x] POST /forecast/{id}/run → `forecast/[id]/run/+server.ts`
- [x] POST /forecast/{id}/delete → `forecast/[id]/delete/+server.ts`

## /crypto (9)

Every load and action checks RequireFeature(Crypto).

- [~] GET /crypto/portfolio/holding → `crypto/portfolio/holding/` (opened with `preloadData()` in the portfolio tab's dialog); the create action is blocked by a backend gap
- [~] GET /crypto/portfolio/holding/{id} → `crypto/portfolio/holding/[id]/`
- [~] POST /crypto/portfolio/holding → default action (blocked by the backend gap)
- [~] PUT /crypto/portfolio/holding/{id} → `?/update` (blocked by the backend gap)
- [x] DELETE /crypto/portfolio/holding/{id} → `?/delete` (only the missing-id 502 path tried)
- [x] GET /crypto/markets/fragment → component `CryptoMarkets` (TanStack query on `/api/v1/crypto/markets`; view model and charts built in the browser; the toggles navigate to Go's push URLs)
- [x] GET /crypto/coin/{symbol} → `crypto/coin/[symbol]/` (same `…USD` symbol rule, so anything else 404s)
- [x] GET /crypto → `crypto/[[tab]]/`
- [x] GET /crypto/{tab} → `crypto/[[tab]]/` (overview, market, bubbles, news, portfolio; case-insensitive; anything else 404s)

## /planning (4)

The preview calls the backend, so it stays server-side. With `use:enhance` only `#grow-result` / `#retire-result` swaps; without JS the full page renders. A GET on a preview URL 303s to the page (Go answered 405). Go oddity kept: with JS on, preview errors don't show, because the banner is outside the swapped panel.

- [x] GET /planning/grow → `planning/grow/+page.server.ts`
- [x] POST /planning/grow/preview → `planning/grow/preview/` default action
- [x] GET /planning/retire → `planning/retire/+page.server.ts`
- [x] POST /planning/retire/preview → `planning/retire/preview/` default action

## /simulator (3)

- [x] GET /simulator → `simulator/+page.server.ts`
- [x] POST /simulator/preview → `simulator/preview/` default action ("Simulate" swaps the result panel; "Add position" re-renders the page)
- [x] POST /simulator/save → `simulator/save/` default action. Go's htmx swapped a whole page into `#simulator-result` for Add position and Save; v2 re-renders the page instead.

## Shared files changed

- `5c1368c` shared: `src/lib/features/money/pdf/fpdf.ts` gains `getX`, `setLineWidth` and `rect` (additive, for the scenario PDF).
- No new npm dependencies. Reused from other features: dashboard `ai-consent.server.ts` and `loadAssetSearchResults`; goals `parseUUID` and `portfolioAPIErrorMessage`; settings-admin `go-time` `shortDate`.

## Backend gaps (staging)

- `/v1/scenarios*`, `/v1/scenario-runs*` and `/v1/holding-risk-profiles` answer 404, because `SCENARIO_PLANNING_ENABLED` is unset on staging. /scenarios shows its "temporarily unavailable" banner.
- `POST /v1/net-worth-forecasts/{id}/run` answers 422 "Portfolio has no holdings or cash" and, once a holding exists, 400 "No such key 'values'".
- `POST /v1/crypto/portfolio` answers 400 "No such key 'average_buy_price'" for both camelCase and snake_case bodies, so no client can save a holding (Go included).
- `/v1/crypto/list`, `/v1/crypto/batch-quotes`, `/v1/crypto/news` and `/v1/crypto/quote` answer 500 "Market data provider is rate limited".

## Not verified

- **Client-side behaviour in a real browser:** the Chrome extension was not connected. This covers terminal cell edits and focus retention, workspace and autobuy swaps, trading row clicks and search, the crypto dialog and markets query, the planning/simulator `use:enhance` swaps, and scenario run polling.
- **AI-consented paths** (AI consent is deliberately not granted on the test account): the terminal AI suggestions (Pro and consent checks verified; the consent card is returned) and the rendered memo page.
- **Happy paths with no staging data:** the scenario flows (snapshot, run, compare, PDF), the forecast results table, crypto holding create/update, and the trading chart (the test account has no stocks and AAPL history is empty).

## Staging test data left

None. The terminal rows and autobuy, the research note, the forecast and its temporary AAPL holding, and the saved simulation were all deleted.
