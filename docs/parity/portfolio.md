# Portfolio domain parity (`port/portfolio`)

Scope: every Go route under `/portfolio` and `/portfolios`, **excluding**
`/portfolio/{symbol}` and everything under it (ported later into
`src/routes/(app)/portfolio/[symbol]/` by the stock agent).

Legend: `[x]` done · `[~]` partial (why) · `[ ]` not done (why).
Work areas (feature code under `src/lib/features/portfolio/<area>/`):
holdings · watchlist · analytics (allocation, sector gains, earnings, dividends, news) ·
automation (rebalancing, rebalancing rules, smart screens) · workspace (portfolios, retirement, targets, screenshot import).

## Routes

- [ ] `GET /portfolio` → appHandler.PortfolioHoldings
- [ ] `GET /portfolio/one-page` → appHandler.PortfolioOnePage
- [ ] `POST /portfolio/one-page/share-link` → appHandler.PortfolioShareLinkCreate
- [ ] `DELETE /portfolio/one-page/share-link` → appHandler.PortfolioShareLinkRevoke
- [ ] `GET /portfolio/rebalancing` → appHandler.PortfolioRebalancing
- [ ] `POST /portfolio/rebalancing/{id}/model` → appHandler.PortfolioRebalancingModelSave
- [ ] `POST /portfolio/rebalancing/{id}/simulate` → appHandler.PortfolioRebalancingSimulate
- [ ] `POST /portfolio/rebalancing/{id}/plans` → appHandler.PortfolioRebalancingPlanSave
- [ ] `POST /portfolio/rebalancing/{id}/plans/{planID}/complete` → appHandler.PortfolioRebalancingPlanComplete
- [ ] `GET /portfolio/rebalancing/{id}/plans/{planID}/export.{format}` → appHandler.PortfolioRebalancingPlanExport
- [ ] `POST /portfolio/rebalancing/{id}/preferences` → appHandler.PortfolioRebalancingPreferences
- [ ] `POST /portfolio/rebalancing/{id}/alerts/{alertID}/acknowledge` → appHandler.PortfolioRebalancingAlertAcknowledge
- [ ] `GET /portfolio/retirement` → appHandler.RetirementPlanner
- [ ] `POST /portfolio/retirement` → appHandler.RetirementPlannerSave
- [ ] `POST /portfolio/positions` → appHandler.PortfolioCreatePosition
- [ ] `GET /portfolio/positions/{id}/edit` → appHandler.PortfolioPositionEditForm
- [ ] `PUT /portfolio/positions/{id}` → appHandler.PortfolioPositionUpdate
- [ ] `DELETE /portfolio/positions/{id}` → appHandler.PortfolioPositionDelete
- [ ] `GET /portfolio/positions/{id}/sell` → appHandler.PortfolioPositionSellForm
- [ ] `POST /portfolio/positions/{id}/sell` → appHandler.PortfolioPositionSell
- [ ] `GET /portfolio/quotes` → appHandler.PortfolioHoldingsQuotes
- [ ] `GET /portfolio/positions/{id}/alert` → appHandler.PortfolioPositionAlertForm
- [ ] `POST /portfolio/positions/{id}/alert` → appHandler.PortfolioPositionAlertSave
- [ ] `GET /portfolio/targets` → appHandler.PortfolioTargets
- [ ] `GET /portfolio/targets/add` → appHandler.PortfolioTargetsAddForm
- [ ] `POST /portfolio/targets` → appHandler.PortfolioTargetsCreate
- [ ] `GET /portfolio/targets/{id}/edit` → appHandler.PortfolioTargetsEditForm
- [ ] `PUT /portfolio/targets/{id}` → appHandler.PortfolioTargetsUpdate
- [ ] `DELETE /portfolio/targets/{id}/remove` → appHandler.PortfolioTargetsDelete
- [ ] `DELETE /portfolio/targets/{id}` → appHandler.PortfolioTargetDelete
- [ ] `GET /portfolio/allocation` → appHandler.PortfolioAllocation
- [ ] `GET /portfolio/sector-gains` → appHandler.PortfolioSectorGains
- [ ] `GET /portfolio/watchlist` → appHandler.PortfolioWatchlist
- [ ] `GET /portfolio/screens` → appHandler.SmartScreens
- [ ] `POST /portfolio/screens` → appHandler.SmartScreenCreate
- [ ] `POST /portfolio/screens/{id}` → appHandler.SmartScreenUpdate
- [ ] `POST /portfolio/screens/{id}/evaluate` → appHandler.SmartScreenEvaluate
- [ ] `POST /portfolio/screens/{id}/delete` → appHandler.SmartScreenDelete
- [ ] `GET /portfolio/rebalancing-rules` → appHandler.RebalancingRules
- [ ] `POST /portfolio/rebalancing/{id}` → appHandler.RebalancingRuleSave
- [ ] `POST /portfolio/rebalancing/{id}/events/{eventID}/confirm` → appHandler.RebalanceEventConfirm
- [ ] `POST /portfolio/rebalancing/{id}/events/{eventID}/dismiss` → appHandler.RebalanceEventDismiss
- [ ] `GET /portfolio/watchlist/quotes` → appHandler.PortfolioWatchlistQuotes
- [ ] `GET /portfolio/watchlist/search` → appHandler.PortfolioWatchlistSearch
- [ ] `POST /portfolio/watchlist/items` → appHandler.PortfolioWatchlistAdd
- [ ] `GET /portfolio/watchlist/items/{id}/edit` → appHandler.PortfolioWatchlistItemEditForm
- [ ] `PATCH /portfolio/watchlist/items/{id}` → appHandler.PortfolioWatchlistItemUpdate
- [ ] `DELETE /portfolio/watchlist/items/{id}` → appHandler.PortfolioWatchlistRemove
- [ ] `GET /portfolio/import/screenshot` → appHandler.PortfolioScreenshotImportForm
- [ ] `POST /portfolio/import/screenshot/preview` → appHandler.PortfolioScreenshotImportPreview
- [ ] `POST /portfolio/import/screenshot/commit` → appHandler.PortfolioScreenshotImportCommit
- [ ] `GET /portfolio/watchlist/import/csv` → appHandler.PortfolioWatchlistCSVImportForm
- [ ] `POST /portfolio/watchlist/import/csv/preview` → appHandler.PortfolioWatchlistCSVImportPreview
- [ ] `POST /portfolio/watchlist/import/csv/commit` → appHandler.PortfolioWatchlistCSVImportCommit
- [ ] `GET /portfolio/watchlist/list` → appHandler.PortfolioWatchlistListForm
- [ ] `GET /portfolio/watchlist/list/{id}` → appHandler.PortfolioWatchlistListForm
- [ ] `POST /portfolio/watchlist/list` → appHandler.PortfolioWatchlistListCreate
- [ ] `PUT /portfolio/watchlist/list/{id}` → appHandler.PortfolioWatchlistListUpdate
- [ ] `DELETE /portfolio/watchlist/list/{id}` → appHandler.PortfolioWatchlistListDelete
- [ ] `GET /portfolio/allocation/list` → appHandler.PortfolioAllocationListForm
- [ ] `GET /portfolio/allocation/list/{id}` → appHandler.PortfolioAllocationListForm
- [ ] `POST /portfolio/allocation/list` → appHandler.PortfolioAllocationListCreate
- [ ] `PUT /portfolio/allocation/list/{id}` → appHandler.PortfolioAllocationListUpdate
- [ ] `DELETE /portfolio/allocation/list/{id}` → appHandler.PortfolioAllocationListDelete
- [ ] `GET /portfolio/earnings` → appHandler.PortfolioEarnings
- [ ] `GET /portfolio/dividends` → appHandler.PortfolioDividends
- [ ] `GET /portfolio/news/article` → appHandler.PortfolioNewsArticleForm
- [ ] `GET /portfolio/news/article/{id}` → appHandler.PortfolioNewsArticleForm
- [ ] `POST /portfolio/news/article` → appHandler.PortfolioNewsArticleCreate
- [ ] `PUT /portfolio/news/article/{id}` → appHandler.PortfolioNewsArticleUpdate
- [ ] `DELETE /portfolio/news/article/{id}` → appHandler.PortfolioNewsArticleDelete
- [ ] `GET /portfolio/news/open` → appHandler.PortfolioNewsOpen
- [ ] `POST /portfolio/news/thesis-watch/{id}/feedback` → appHandler.PortfolioThesisWatchFeedback
- [ ] `GET /portfolio/news/thesis-watch/{id}/open` → appHandler.PortfolioThesisWatchOpen
- [ ] `GET /portfolio/news` → appHandler.PortfolioNews
- [ ] `GET /portfolios` → appHandler.PortfolioWorkspace
- [ ] `POST /portfolios` → appHandler.PortfolioWorkspaceCreate
- [ ] `POST /portfolios/{id}/clone` → appHandler.PortfolioWorkspaceClone
- [ ] `POST /portfolios/{id}/invite` → appHandler.PortfolioWorkspaceInvite
- [ ] `POST /portfolios/{id}/cash` → appHandler.PortfolioWorkspaceCash
- [ ] `POST /portfolios/{id}/archive` → appHandler.PortfolioWorkspaceArchive
