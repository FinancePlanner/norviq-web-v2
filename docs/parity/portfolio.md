# Portfolio domain parity (`port/portfolio`)

Scope: every Go route under `/portfolio` and `/portfolios`, **excluding**
`/portfolio/{symbol}` and everything under it (ported later into
`src/routes/(app)/portfolio/[symbol]/` by the stock agent).

Legend: `[x]` done · `[~]` partial (why) · `[ ]` not done (why).
Work areas (feature code under `src/lib/features/portfolio/<area>/`):
holdings · watchlist · analytics (allocation, sector gains, earnings, dividends, news) ·
automation (rebalancing, rebalancing rules, smart screens) · workspace (portfolios, retirement, targets, screenshot import).

## Routes

- [x] `GET /portfolio` → appHandler.PortfolioHoldings → `src/routes/(app)/portfolio/+page.*` (TanStack Table sort/filter)
- [x] `GET /portfolio/one-page` → appHandler.PortfolioOnePage → `src/routes/(app)/portfolio/one-page/+page.*`
- [x] `POST /portfolio/one-page/share-link` → appHandler.PortfolioShareLinkCreate → `one-page/share-link/+server.ts` (JSON ShareLinkVM)
- [x] `DELETE /portfolio/one-page/share-link` → appHandler.PortfolioShareLinkRevoke → `one-page/share-link/+server.ts`
- [x] `GET /portfolio/rebalancing` → appHandler.PortfolioRebalancing → rebalancing (18a5278)
- [x] `POST /portfolio/rebalancing/{id}/model` → appHandler.PortfolioRebalancingModelSave → rebalancing (18a5278)
- [x] `POST /portfolio/rebalancing/{id}/simulate` → appHandler.PortfolioRebalancingSimulate → rebalancing (18a5278)
- [x] `POST /portfolio/rebalancing/{id}/plans` → appHandler.PortfolioRebalancingPlanSave → rebalancing (18a5278)
- [x] `POST /portfolio/rebalancing/{id}/plans/{planID}/complete` → appHandler.PortfolioRebalancingPlanComplete → rebalancing (18a5278)
- [x] `GET /portfolio/rebalancing/{id}/plans/{planID}/export.{format}` → appHandler.PortfolioRebalancingPlanExport → rebalancing (18a5278)
- [x] `POST /portfolio/rebalancing/{id}/preferences` → appHandler.PortfolioRebalancingPreferences → rebalancing (18a5278)
- [x] `POST /portfolio/rebalancing/{id}/alerts/{alertID}/acknowledge` → appHandler.PortfolioRebalancingAlertAcknowledge → rebalancing (18a5278)
- [x] `GET /portfolio/retirement` → appHandler.RetirementPlanner → `retirement/+page.*`
- [~] `POST /portfolio/retirement` → appHandler.RetirementPlannerSave → `retirement` default action — staging backend 404 on /v1/portfolios/{id}/retirement-plan
- [x] `POST /portfolio/positions` → appHandler.PortfolioCreatePosition → `positions/+server.ts` (JSON panel | redirect)
- [x] `GET /portfolio/positions/{id}/edit` → appHandler.PortfolioPositionEditForm → `positions/[id]/edit/+server.ts` → PositionActionPanel
- [x] `PUT /portfolio/positions/{id}` → appHandler.PortfolioPositionUpdate → `positions/[id]/+server.ts`
- [x] `DELETE /portfolio/positions/{id}` → appHandler.PortfolioPositionDelete → `positions/[id]/+server.ts`
- [x] `GET /portfolio/positions/{id}/sell` → appHandler.PortfolioPositionSellForm → `positions/[id]/sell/+server.ts`
- [x] `POST /portfolio/positions/{id}/sell` → appHandler.PortfolioPositionSell → `positions/[id]/sell/+server.ts`
- [x] `GET /portfolio/quotes` → appHandler.PortfolioHoldingsQuotes → `quotes/+server.ts` (JSON; TanStack Query poll 20s)
- [x] `GET /portfolio/positions/{id}/alert` → appHandler.PortfolioPositionAlertForm → `positions/[id]/alert/+server.ts` (gated TargetAlerts)
- [x] `POST /portfolio/positions/{id}/alert` → appHandler.PortfolioPositionAlertSave → `positions/[id]/alert/+server.ts` (gated)
- [x] `GET /portfolio/targets` → appHandler.PortfolioTargets → `targets/+page.*`
- [x] `GET /portfolio/targets/add` → appHandler.PortfolioTargetsAddForm → TargetFormModal
- [x] `POST /portfolio/targets` → appHandler.PortfolioTargetsCreate → `targets ?/create`
- [x] `GET /portfolio/targets/{id}/edit` → appHandler.PortfolioTargetsEditForm → TargetFormModal
- [x] `PUT /portfolio/targets/{id}` → appHandler.PortfolioTargetsUpdate → `targets ?/update`
- [x] `DELETE /portfolio/targets/{id}/remove` → appHandler.PortfolioTargetsDelete → `targets ?/remove`
- [x] `DELETE /portfolio/targets/{id}` → appHandler.PortfolioTargetDelete → `targets/[id]/+server.ts` (gated)
- [x] `GET /portfolio/allocation` → appHandler.PortfolioAllocation → analytics (abd48b8)
- [x] `GET /portfolio/sector-gains` → appHandler.PortfolioSectorGains → analytics (abd48b8)
- [x] `GET /portfolio/watchlist` → appHandler.PortfolioWatchlist → watchlist (fdaf324)
- [x] `GET /portfolio/screens` → appHandler.SmartScreens → screens ?/actions (18a5278; staging writes 400)
- [x] `POST /portfolio/screens` → appHandler.SmartScreenCreate → screens ?/actions (18a5278; staging writes 400)
- [x] `POST /portfolio/screens/{id}` → appHandler.SmartScreenUpdate → screens ?/actions (18a5278; staging writes 400)
- [x] `POST /portfolio/screens/{id}/evaluate` → appHandler.SmartScreenEvaluate → screens ?/actions (18a5278; staging writes 400)
- [x] `POST /portfolio/screens/{id}/delete` → appHandler.SmartScreenDelete → screens ?/actions (18a5278; staging writes 400)
- [x] `GET /portfolio/rebalancing-rules` → appHandler.RebalancingRules → rebalancing-rules (18a5278; staging writes 400)
- [x] `POST /portfolio/rebalancing/{id}` → appHandler.RebalancingRuleSave → rebalancing-rules (18a5278; staging writes 400)
- [x] `POST /portfolio/rebalancing/{id}/events/{eventID}/confirm` → appHandler.RebalanceEventConfirm → rebalancing-rules (18a5278; staging writes 400)
- [x] `POST /portfolio/rebalancing/{id}/events/{eventID}/dismiss` → appHandler.RebalanceEventDismiss → rebalancing-rules (18a5278; staging writes 400)
- [x] `GET /portfolio/watchlist/quotes` → appHandler.PortfolioWatchlistQuotes → watchlist (fdaf324)
- [x] `GET /portfolio/watchlist/search` → appHandler.PortfolioWatchlistSearch → watchlist (fdaf324)
- [x] `POST /portfolio/watchlist/items` → appHandler.PortfolioWatchlistAdd → watchlist (fdaf324)
- [x] `GET /portfolio/watchlist/items/{id}/edit` → appHandler.PortfolioWatchlistItemEditForm → watchlist (fdaf324)
- [x] `PATCH /portfolio/watchlist/items/{id}` → appHandler.PortfolioWatchlistItemUpdate → watchlist (fdaf324)
- [x] `DELETE /portfolio/watchlist/items/{id}` → appHandler.PortfolioWatchlistRemove → watchlist (fdaf324)
- [x] `GET /portfolio/import/screenshot` → appHandler.PortfolioScreenshotImportForm → `import/screenshot/+page.*` (in app shell; Go served a bare fragment)
- [~] `POST /portfolio/import/screenshot/preview` → appHandler.PortfolioScreenshotImportPreview → `import/screenshot ?/preview` — staging extractor 502
- [x] `POST /portfolio/import/screenshot/commit` → appHandler.PortfolioScreenshotImportCommit → `import/screenshot ?/commit`
- [x] `GET /portfolio/watchlist/import/csv` → appHandler.PortfolioWatchlistCSVImportForm → watchlist (fdaf324)
- [x] `POST /portfolio/watchlist/import/csv/preview` → appHandler.PortfolioWatchlistCSVImportPreview → watchlist (fdaf324)
- [x] `POST /portfolio/watchlist/import/csv/commit` → appHandler.PortfolioWatchlistCSVImportCommit → watchlist (fdaf324)
- [x] `GET /portfolio/watchlist/list` → appHandler.PortfolioWatchlistListForm → watchlist (fdaf324)
- [x] `GET /portfolio/watchlist/list/{id}` → appHandler.PortfolioWatchlistListForm → watchlist (fdaf324)
- [x] `POST /portfolio/watchlist/list` → appHandler.PortfolioWatchlistListCreate → watchlist (fdaf324)
- [x] `PUT /portfolio/watchlist/list/{id}` → appHandler.PortfolioWatchlistListUpdate → watchlist (fdaf324)
- [x] `DELETE /portfolio/watchlist/list/{id}` → appHandler.PortfolioWatchlistListDelete → watchlist (fdaf324)
- [x] `GET /portfolio/allocation/list` → appHandler.PortfolioAllocationListForm → analytics (abd48b8)
- [x] `GET /portfolio/allocation/list/{id}` → appHandler.PortfolioAllocationListForm → analytics (abd48b8)
- [x] `POST /portfolio/allocation/list` → appHandler.PortfolioAllocationListCreate → analytics (abd48b8)
- [x] `PUT /portfolio/allocation/list/{id}` → appHandler.PortfolioAllocationListUpdate → analytics (abd48b8)
- [x] `DELETE /portfolio/allocation/list/{id}` → appHandler.PortfolioAllocationListDelete → analytics (abd48b8)
- [x] `GET /portfolio/earnings` → appHandler.PortfolioEarnings → analytics (abd48b8)
- [x] `GET /portfolio/dividends` → appHandler.PortfolioDividends → analytics (abd48b8)
- [x] `GET /portfolio/news/article` → appHandler.PortfolioNewsArticleForm → analytics (abd48b8)
- [x] `GET /portfolio/news/article/{id}` → appHandler.PortfolioNewsArticleForm → analytics (abd48b8)
- [x] `POST /portfolio/news/article` → appHandler.PortfolioNewsArticleCreate → analytics (abd48b8)
- [x] `PUT /portfolio/news/article/{id}` → appHandler.PortfolioNewsArticleUpdate → analytics (abd48b8)
- [x] `DELETE /portfolio/news/article/{id}` → appHandler.PortfolioNewsArticleDelete → analytics (abd48b8)
- [x] `GET /portfolio/news/open` → appHandler.PortfolioNewsOpen → analytics (abd48b8)
- [x] `POST /portfolio/news/thesis-watch/{id}/feedback` → appHandler.PortfolioThesisWatchFeedback → analytics (abd48b8)
- [x] `GET /portfolio/news/thesis-watch/{id}/open` → appHandler.PortfolioThesisWatchOpen → analytics (abd48b8)
- [x] `GET /portfolio/news` → appHandler.PortfolioNews → analytics (abd48b8)
- [x] `GET /portfolios` → appHandler.PortfolioWorkspace → `portfolios/+page.*`
- [x] `POST /portfolios` → appHandler.PortfolioWorkspaceCreate → `?/create`
- [x] `POST /portfolios/{id}/clone` → appHandler.PortfolioWorkspaceClone → `?/clone` (gated)
- [x] `POST /portfolios/{id}/invite` → appHandler.PortfolioWorkspaceInvite → `?/invite` (gated)
- [x] `POST /portfolios/{id}/cash` → appHandler.PortfolioWorkspaceCash → `?/cash`
- [x] `POST /portfolios/{id}/archive` → appHandler.PortfolioWorkspaceArchive → `?/archive`
