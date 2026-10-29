# Stock detail pages (`/portfolio/{symbol}/…`) — parity checklist

Go sources: `internal/handlers/{app.go (StockDetail, StockEarningsTranscript), stock_detail_*.go,
stock_chart_builder.go, stock_valuation.go, stock_pressure.go, stock_terminal.go, quote_refresh.go,
stock_ownership.go, market_signals_data.go, earnings_streak.go}`, `internal/pages/stock/*`,
`internal/pages/earningsviz/*`, `assets/stock-analysis.js`.

v2 layout:

- `src/routes/(app)/portfolio/[symbol]/+page.*` — overview (`GET /portfolio/{symbol}`)
- `src/routes/(app)/portfolio/[symbol]/[tab]/+page.*` — every other tab (`{tab}` + the explicit
  gated rows; the per-tab feature gate is applied in the load, as the chi `r.With(require…)` did)
- `src/lib/features/stock/` — loaders, view models and tab components
  (`analysis/`, `builder/`, the rest at the top level)

## Routes (17/17 done)

- [x] `GET /portfolio/{symbol}` → `[symbol]/+page.server.ts` + `DetailPage.svelte` / `tabs/OverviewTab.svelte`
- [x] `GET /portfolio/{symbol}/{tab}` → `[symbol]/[tab]/+page.*` (chart, overview, news, sentiment; 404 on unknown tab)
- [x] `GET /portfolio/{symbol}/builder` → `[tab]` + gate MarketFundamentals → `builder/ChartBuilderTab.svelte`
- [x] `GET /portfolio/{symbol}/statements` → `[tab]` + gate MarketFundamentals → `tabs/StatementsTab.svelte`
- [x] `GET /portfolio/{symbol}/ownership` → `[tab]` + gate MarketFundamentals → `tabs/OwnershipTab.svelte`
- [x] `GET /portfolio/{symbol}/analysis` → `[tab]` + gate MarketFundamentals → `analysis/AnalysisTab.svelte` (+ scroll-spy)
- [x] `GET /portfolio/{symbol}/forecast` → `[tab]` + gate MarketFundamentals → `tabs/ForecastTab.svelte`
- [x] `GET /portfolio/{symbol}/compare` → `[tab]` + gate PeerComparison → `tabs/CompareTab.svelte`
- [x] `GET /portfolio/{symbol}/earnings` → `[tab]` + gate EarningsText → `tabs/EarningsTab.svelte` (reuses `features/portfolio/earningsviz`)
- [x] `GET /portfolio/{symbol}/quote` → `[symbol]/quote/+server.ts` (JSON; HeroCard polls it every 20s while visible)
- [x] `GET /portfolio/{symbol}/pressure` → component `tabs/PressureCard.svelte` (TanStack on `/api/v1/market/pressure/{symbol}`; fragment URL retired)
- [x] `GET /portfolio/{symbol}/terminal` → component `tabs/TerminalCard.svelte` (TanStack on `/api/v1/terminal-positions?ticker=`; fragment URL retired)
- [x] `GET /portfolio/{symbol}/earnings/transcript` → `[symbol]/earnings/transcript/+server.ts` (JSON) → `tabs/TranscriptPanel.svelte` in `#transcript-dialog` (speechSynthesis player ported)
- [x] `GET /portfolio/{symbol}/valuation/edit` → `[symbol]/valuation/edit/+server.ts` (JSON) → `tabs/ValuationPanel.svelte`
- [x] `POST /portfolio/{symbol}/valuation` → `[symbol]/valuation/+server.ts` (JSON for the dialog, 303 for a plain post)
- [x] `GET /portfolio/{symbol}/builder/chart` → `[symbol]/builder/chart/+server.ts` (JSON result VM) → `builder/ChartBuilderResult.svelte`
- [x] `GET /portfolio/{symbol}/builder/csv` → `[symbol]/builder/csv/+server.ts`

## Notes

- Position menu (Edit / Sell / Price alert) reuses the portfolio feature's `PositionActionPanel` + `positionAction`; its dialog sits next to the menu instead of at the end of the page.
- AI consent: no stock route calls an AI-consent-gated endpoint in Go, so no gate is wired.
- Go oddities kept: the overview's "Price history" and "Thesis confidence" cards always show their empty state (Go never loaded history or sentiment for the overview); valuation save treats a backend 4xx/5xx as success (Go checked only the transport error); market cap renders as "$5038567.65M"; the compare chart plots only the primary symbol; the analysis scroll-spy never activates (no section has an id); chart-builder growth losses on currency series show without a minus sign.

## Shared changes

- `src/lib/components/shell/StockSubNav.svelte`: optional `activePath` prop (Go passed the lower-cased stock path, so `/portfolio/AAPL` still marks its tab).

## Backend gaps / unverified

- Staging market data is rate limited/sparse: price history ("No price history available"), technicals, statements, insider/13F/congress, income statements and chart-builder CSV (502 "Rate limit exceeded") returned errors, so those tabs were only verified in their empty/error branches.
- Not browser-verified: ECharts rendering, dialogs, quote polling, pressure/terminal client fetches. Valuation save success path not exercised (would write staging data).
