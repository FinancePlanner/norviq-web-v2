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

## Routes

- [ ] `GET /portfolio/{symbol}/quote` → appHandler.StockDetailQuote
- [ ] `GET /portfolio/{symbol}/pressure` → appHandler.StockPressure
- [ ] `GET /portfolio/{symbol}/earnings/transcript` → appHandler.StockEarningsTranscript
- [ ] `GET /portfolio/{symbol}/valuation/edit` → appHandler.StockValuationForm
- [ ] `POST /portfolio/{symbol}/valuation` → appHandler.StockValuationSave
- [ ] `GET /portfolio/{symbol}/builder` → appHandler.StockDetail
- [ ] `GET /portfolio/{symbol}/builder/chart` → appHandler.StockChartBuilderChart
- [ ] `GET /portfolio/{symbol}/builder/csv` → appHandler.StockChartBuilderCSV
- [ ] `GET /portfolio/{symbol}/statements` → appHandler.StockDetail
- [ ] `GET /portfolio/{symbol}/ownership` → appHandler.StockDetail
- [ ] `GET /portfolio/{symbol}/analysis` → appHandler.StockDetail
- [ ] `GET /portfolio/{symbol}/forecast` → appHandler.StockDetail
- [ ] `GET /portfolio/{symbol}/compare` → appHandler.StockDetail
- [ ] `GET /portfolio/{symbol}/earnings` → appHandler.StockDetail
- [ ] `GET /portfolio/{symbol}` → appHandler.StockDetail
- [ ] `GET /portfolio/{symbol}/{tab}` → appHandler.StockDetail
- [ ] `GET /portfolio/{symbol}/terminal` → h.StockTerminal
