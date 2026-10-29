# norviq-web route inventory (source of truth for 1:1 parity)

Generated from norviq-web internal/server/server.go + internal/handlers/*Mount*. Every row must be ported or explicitly
mapped (HTMX fragment → component / JSON endpoint). Tick `[x]` when done; append `→ v2: <route or component>` and any deviation.


### /sw.js (1)

- [x] `GET /sw.js` → serviceWorkerHandler(staticContent) → v2: static/sw.js (existing mapping)

### /install.sh (1)

- [x] `GET /install.sh` → installScriptHandler(staticContent) → v2: see docs/parity/public.md

### /runtime-config.js (1)

- [x] `GET /runtime-config.js` → runtimeConfigHandler(deps.Config, deps.Session) → v2: not needed: root layout runtime data

### /robots.txt (1)

- [x] `GET /robots.txt` → robotsHandler(deps.Config) → v2: see docs/parity/public.md

### /.well-known (2)

- [x] `GET /.well-known/apple-app-site-association` → appleAppSiteAssociationHandler → v2: see docs/parity/public.md
- [x] `GET /.well-known/security.txt` → securityTxtHandler(deps.Config, nil) → v2: see docs/parity/public.md

### /apple-app-site-association (1)

- [x] `GET /apple-app-site-association` → appleAppSiteAssociationHandler → v2: see docs/parity/public.md

### /sitemap.xml (1)

- [x] `GET /sitemap.xml` → sitemapHandler(deps.Config, sitemapPaths(articlesHandler.SitemapPaths, → v2: see docs/parity/public.md

### /llms.txt (1)

- [x] `GET /llms.txt` → llmsTxtHandler(deps.Config) → v2: see docs/parity/public.md

### /static (1)

- [x] `HANDLE /static/*` → staticFileServer(http.FS(staticContent)) → v2: static/static/ (existing mapping)

### /thinking-orbs (1)

- [x] `HANDLE /thinking-orbs/js/*` → http.StripPrefix("/thinking-orbs/js/", http.FileServer(http.FS(orbScri → v2: dead (no orb canvas), not ported

### /root (1)

- [x] `GET /` → handlers.RootHandler(deps) → v2: see docs/parity/public.md

### /market-brief (1)

- [x] `GET /market-brief` → marketBriefHandler.Partial("/market-brief") → v2: see docs/parity/public.md

### /brief (4)

- [x] `GET /brief` → marketBriefHandler.Latest → v2: see docs/parity/public.md
- [x] `GET /brief/{date}/{slot}` → marketBriefHandler.Page → v2: see docs/parity/public.md
- [x] `GET /brief/{date}/{slot}/og.png` → marketBriefHandler.OGImage → v2: see docs/parity/public.md
- [x] `GET /brief/{date}/{slot}/card.png` → marketBriefHandler.CardImage → v2: see docs/parity/public.md

### /privacy (1)

- [x] `GET /privacy` → legalHandler.Privacy → v2: see docs/parity/public.md

### /terms (1)

- [x] `GET /terms` → legalHandler.Terms → v2: see docs/parity/public.md

### /legal (1)

- [x] `GET /legal` → legalHandler.Notice → v2: see docs/parity/public.md

### /security (1)

- [x] `GET /security` → legalHandler.Security → v2: see docs/parity/public.md

### /facebook-data-deletion (1)

- [x] `GET /facebook-data-deletion` → legalHandler.FacebookDataDeletion → v2: see docs/parity/public.md

### /s (1)

- [x] `GET /s/{symbol}` → handlers.NewPublicStockHandler(deps).Page → v2: see docs/parity/public.md

### /p (1)

- [x] `GET /p/{slug}` → handlers.NewPublicPortfolioShareHandler(deps).Page → v2: see docs/parity/public.md

### /i (1)

- [x] `GET /i/{code}` → handlers.PublicInvite(deps) → v2: see docs/parity/public.md

### /g (2)

- [x] `GET /g/{code}` → handlers.PublicGroupInvite(deps) → v2: see docs/parity/public.md
- [x] `POST /g/{code}/join` → appHandler.GroupsRedeemInvite → v2: see docs/parity/public.md

### /auth (5)

- [x] `GET /auth/oauth/{provider}/callback` → authHandler.OAuthCallback → v2: see docs/parity/auth-onboarding.md
- [x] `POST /auth/oauth/{provider}/callback` → authHandler.OAuthCallbackPost → v2: see docs/parity/auth-onboarding.md
- [x] `GET /auth/oauth/{provider}/start` → authHandler.OAuthStart → v2: see docs/parity/auth-onboarding.md
- [x] `POST /auth/passkey/begin` → authHandler.PasskeyBegin → v2: see docs/parity/auth-onboarding.md
- [x] `POST /auth/passkey/finish` → authHandler.PasskeyFinish → v2: see docs/parity/auth-onboarding.md

### /login (2)

- [x] `GET /login` → authHandler.LoginPage → v2: see docs/parity/auth-onboarding.md
- [x] `POST /login` → authHandler.LoginSubmit → v2: see docs/parity/auth-onboarding.md

### /signup (2)

- [x] `GET /signup` → authHandler.SignupPage → v2: see docs/parity/auth-onboarding.md
- [x] `POST /signup` → authHandler.SignupSubmit → v2: see docs/parity/auth-onboarding.md

### /forgot-password (2)

- [x] `GET /forgot-password` → authHandler.ForgotPasswordPage → v2: see docs/parity/auth-onboarding.md
- [x] `POST /forgot-password` → authHandler.ForgotPasswordSubmit → v2: see docs/parity/auth-onboarding.md

### /reset-password (3)

- [x] `GET /reset-password` → authHandler.ResetPasswordPage → v2: see docs/parity/auth-onboarding.md
- [x] `POST /reset-password` → authHandler.ResetPasswordSubmit → v2: see docs/parity/auth-onboarding.md
- [x] `POST /reset-password/resend` → authHandler.ResetPasswordResend → v2: see docs/parity/auth-onboarding.md

### /mfa (3)

- [x] `GET /mfa` → authHandler.MFAPartial → v2: see docs/parity/auth-onboarding.md
- [x] `POST /mfa/verify` → authHandler.MFAVerify → v2: see docs/parity/auth-onboarding.md
- [x] `POST /mfa/resend` → authHandler.MFAResend → v2: see docs/parity/auth-onboarding.md

### /onboarding (16)

- [x] `GET /onboarding/questionnaire` → onboardingHandler.Questionnaire → v2: see docs/parity/auth-onboarding.md
- [x] `POST /onboarding/questionnaire` → onboardingHandler.QuestionnaireSubmit → v2: see docs/parity/auth-onboarding.md
- [x] `GET /onboarding/paywall` → onboardingHandler.Paywall → v2: see docs/parity/auth-onboarding.md
- [x] `POST /onboarding/paywall/continue` → onboardingHandler.PaywallContinue → v2: see docs/parity/auth-onboarding.md
- [x] `GET /onboarding` → onboardingHandler.Welcome → v2: see docs/parity/auth-onboarding.md
- [x] `GET /onboarding/import` → onboardingHandler.ImportMenu → v2: see docs/parity/auth-onboarding.md
- [x] `GET /onboarding/import/csv` → onboardingHandler.ImportCSV → v2: see docs/parity/auth-onboarding.md
- [x] `POST /onboarding/import/csv/preview` → onboardingHandler.ImportCSVPreview → v2: see docs/parity/auth-onboarding.md
- [x] `POST /onboarding/import/csv/commit` → onboardingHandler.ImportCSVCommit → v2: see docs/parity/auth-onboarding.md
- [x] `GET /onboarding/import/manual` → onboardingHandler.ImportManual → v2: see docs/parity/auth-onboarding.md
- [x] `POST /onboarding/import/manual` → onboardingHandler.ImportManualSubmit → v2: see docs/parity/auth-onboarding.md
- [x] `GET /onboarding/budget` → onboardingHandler.Budget → v2: see docs/parity/auth-onboarding.md
- [x] `POST /onboarding/budget` → onboardingHandler.BudgetSubmit → v2: see docs/parity/auth-onboarding.md
- [x] `GET /onboarding/done` → onboardingHandler.Done → v2: see docs/parity/auth-onboarding.md
- [x] `POST /onboarding/skip` → onboardingHandler.Skip → v2: see docs/parity/auth-onboarding.md
- [x] `POST /onboarding/complete` → onboardingHandler.Complete → v2: see docs/parity/auth-onboarding.md

### /oauth (3)

- [x] `GET /oauth/consent` → appHandler.OAuthConsent → v2: see docs/parity/auth-onboarding.md
- [x] `POST /oauth/consent/approve` → appHandler.OAuthConsentApprove → v2: see docs/parity/auth-onboarding.md
- [x] `POST /oauth/consent/deny` → appHandler.OAuthConsentDeny → v2: see docs/parity/auth-onboarding.md

### /dashboard (26)

- [ ] `GET /dashboard` → appHandler.Dashboard
- [ ] `GET /dashboard/pulse` → appHandler.DashboardPulse
- [ ] `GET /dashboard/action-queue` → appHandler.DashboardActionQueue
- [ ] `POST /dashboard/action/{id}/read` → appHandler.DashboardActionRead
- [ ] `GET /dashboard/panel/tax` → appHandler.DashboardTaxPanel
- [ ] `GET /dashboard/ledger` → appHandler.DashboardLedger
- [ ] `GET /dashboard/activity-feed` → appHandler.DashboardActivityFeed
- [ ] `GET /dashboard/search` → appHandler.DashboardSearch
- [ ] `GET /dashboard/recent-spend` → appHandler.DashboardRecentSpend
- [ ] `GET /dashboard/economy-pulse` → appHandler.DashboardEconomyPulse
- [ ] `GET /dashboard/news-ticker` → appHandler.DashboardNewsTicker
- [ ] `GET /dashboard/market-brief` → marketBriefHandler.Partial("/dashboard/market-brief")
- [ ] `POST /dashboard/quick-expense` → appHandler.DashboardQuickExpense
- [ ] `GET /dashboard/activity` → appHandler.DashboardActivity
- [ ] `GET /dashboard/activity-list` → appHandler.DashboardActivityList
- [ ] `GET /dashboard/insights` → appHandler.DashboardInsights
- [ ] `GET /dashboard/insights/ai` → appHandler.DashboardAIInsightsPartial
- [ ] `GET /dashboard/why-moved` → appHandler.DashboardWhyMovedPartial
- [ ] `GET /dashboard/mcp-status` → appHandler.DashboardMCPStatusPartial
- [ ] `POST /dashboard/insights/goals` → appHandler.DashboardInsightsCreateGoal
- [ ] `POST /dashboard/insights/goals/{id}/toggle` → appHandler.DashboardInsightsToggleGoal
- [ ] `GET /dashboard/insights/goals/{id}/edit` → appHandler.DashboardInsightsGoalEditForm
- [ ] `PATCH /dashboard/insights/goals/{id}` → appHandler.DashboardInsightsUpdateGoal
- [ ] `DELETE /dashboard/insights/goals/{id}` → appHandler.DashboardInsightsDeleteGoal
- [ ] `GET /dashboard/insights/focus-points` → appHandler.DashboardInsightsFocusPointsPartial
- [ ] `GET /dashboard/terminal` → h.DashboardTerminalSummary

### /guided-start (4)

- [x] `GET /guided-start/start` → appHandler.GuidedStartStep → v2: see docs/parity/auth-onboarding.md
- [x] `GET /guided-start/poll` → appHandler.GuidedStartPoll → v2: see docs/parity/auth-onboarding.md
- [x] `POST /guided-start/skip` → appHandler.GuidedStartSkip → v2: see docs/parity/auth-onboarding.md
- [x] `POST /guided-start/dismiss` → appHandler.GuidedStartDismiss → v2: see docs/parity/auth-onboarding.md

### /settings (44)

- [ ] `POST /settings/show-me-around` → appHandler.ShowMeAround
- [ ] `GET /settings` → appHandler.Settings
- [ ] `POST /settings/export` → appHandler.SettingsExportSubmit
- [ ] `GET /settings/export/{id}/download` → appHandler.SettingsExportDownload
- [ ] `POST /settings/api-access` → appHandler.SettingsAPIAccessCreate
- [ ] `POST /settings/api-access/{id}/revoke` → appHandler.SettingsAPIAccessRevoke
- [ ] `GET /settings/api-access/{id}/verify` → appHandler.APIAccessVerifyPartial
- [ ] `POST /settings/ai-providers` → appHandler.SettingsAIProvidersConnect
- [ ] `POST /settings/ai-consent/revoke` → appHandler.SettingsAIConsentRevoke
- [ ] `POST /settings/ai-providers/{id}/verify` → appHandler.SettingsAIProvidersVerify
- [ ] `POST /settings/ai-providers/{id}/disconnect` → appHandler.SettingsAIProvidersDisconnect
- [ ] `POST /settings/news-ticker/toggle` → appHandler.SettingsNewsTickerToggle
- [ ] `POST /settings/news-ticker/feeds` → appHandler.SettingsNewsTickerAddFeed
- [ ] `POST /settings/news-ticker/feeds/{id}/delete` → appHandler.SettingsNewsTickerRemoveFeed
- [ ] `GET /settings/banks` → appHandler.SettingsBanks
- [ ] `POST /settings/banks/link-session` → appHandler.SettingsBanksLinkSession
- [ ] `POST /settings/banks/exchange` → appHandler.SettingsBanksExchange
- [ ] `GET /settings/banks/institutions` → appHandler.SettingsBanksInstitutions
- [ ] `POST /settings/banks/connect-eu` → appHandler.SettingsBanksConnectEU
- [ ] `POST /settings/banks/{id}/sync` → appHandler.SettingsBanksSync
- [ ] `POST /settings/banks/{id}/disconnect` → appHandler.SettingsBanksDisconnect
- [ ] `POST /settings/banks/transactions/{id}/import` → appHandler.SettingsBanksImport
- [ ] `POST /settings/banks/transactions/{id}/dismiss` → appHandler.SettingsBanksDismiss
- [ ] `POST /settings/integrations/telegram` → appHandler.SettingsTelegramConnect
- [ ] `POST /settings/integrations/telegram/disconnect` → appHandler.SettingsTelegramDisconnect
- [ ] `POST /settings/integrations/telegram/alerts` → appHandler.SettingsTelegramAlerts
- [ ] `POST /settings/integrations/ibkr/connect` → appHandler.SettingsIBKRConnect
- [ ] `GET /settings/integrations/ibkr/callback` → appHandler.SettingsIBKRCallback
- [ ] `POST /settings/integrations/ibkr/sync` → appHandler.SettingsIBKRSync
- [ ] `POST /settings/integrations/ibkr/disconnect` → appHandler.SettingsIBKRDisconnect
- [ ] `GET /settings/profile/oauth/{provider}/connect` → authHandler.OAuthLinkStart
- [ ] `GET /settings/{section}` → appHandler.Settings
- [ ] `POST /settings/language` → appHandler.SettingsLanguageSubmit
- [ ] `POST /settings/profile` → appHandler.SettingsProfileSubmit
- [ ] `POST /settings/profile/delete` → appHandler.SettingsProfileDelete
- [ ] `POST /settings/passkey/register/begin` → appHandler.PasskeyRegisterBegin
- [ ] `POST /settings/passkey/register/finish` → appHandler.PasskeyRegisterFinish
- [ ] `POST /settings/notifications/earnings` → appHandler.SettingsNotificationsSubmit
- [ ] `POST /settings/feedback` → appHandler.SettingsFeedbackSubmit
- [ ] `GET /settings/subscription/status` → appHandler.SubscriptionStatusPartial
- [ ] `GET /settings/friends-privacy` → h.FriendsPrivacy
- [ ] `POST /settings/friends-privacy` → h.FriendsPrivacySubmit
- [ ] `GET /settings/blocked` → h.BlockedUsers
- [ ] `POST /settings/blocked/{userId}/unblock` → h.BlockedUserUnblock

### /goals (7)

- [ ] `GET /goals` → appHandler.FinancialGoals
- [ ] `POST /goals` → appHandler.FinancialGoalCreate
- [ ] `POST /goals/bulk` → appHandler.FinancialGoalBulkUpdate
- [ ] `POST /goals/{id}/what-if` → appHandler.FinancialGoalWhatIf
- [ ] `POST /goals/{id}/contributions` → appHandler.FinancialGoalContributionCreate
- [ ] `POST /goals/{id}/suggestions/{suggestionID}/accept` → appHandler.FinancialGoalSuggestionAccept
- [ ] `GET /goals/{id}/report.pdf` → appHandler.FinancialGoalPDF

### /chart-builder (1)

- [ ] `GET /chart-builder` → appHandler.ChartBuilderStandalone

### /news (1)

- [ ] `GET /news/view` → appHandler.NewsArticleView

### /assistant (8)

- [ ] `GET /assistant` → appHandler.Assistant
- [ ] `POST /assistant/conversations` → appHandler.AssistantCreateConversation
- [ ] `GET /assistant/conversations/{id}` → appHandler.AssistantConversation
- [ ] `POST /assistant/conversations/{id}/turn` → appHandler.AssistantTurn
- [ ] `POST /assistant/conversations/{id}/stream` → appHandler.AssistantStreamTurn
- [ ] `POST /assistant/actions/{id}/confirm` → appHandler.AssistantConfirmAction
- [ ] `POST /assistant/actions/{id}/cancel` → appHandler.AssistantCancelAction
- [ ] `DELETE /assistant/tips/{id}` → appHandler.AssistantDismissTip

### /portfolio (92)

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

### /portfolios (6)

- [ ] `GET /portfolios` → appHandler.PortfolioWorkspace
- [ ] `POST /portfolios` → appHandler.PortfolioWorkspaceCreate
- [ ] `POST /portfolios/{id}/clone` → appHandler.PortfolioWorkspaceClone
- [ ] `POST /portfolios/{id}/invite` → appHandler.PortfolioWorkspaceInvite
- [ ] `POST /portfolios/{id}/cash` → appHandler.PortfolioWorkspaceCash
- [ ] `POST /portfolios/{id}/archive` → appHandler.PortfolioWorkspaceArchive

### /planning (4)

- [ ] `GET /planning/grow` → appHandler.PlanningGrow
- [ ] `POST /planning/grow/preview` → appHandler.PlanningGrowPreview
- [ ] `GET /planning/retire` → appHandler.PlanningRetire
- [ ] `POST /planning/retire/preview` → appHandler.PlanningRetirePreview

### /simulator (3)

- [ ] `GET /simulator` → appHandler.Simulator
- [ ] `POST /simulator/preview` → appHandler.SimulatorPreview
- [ ] `POST /simulator/save` → appHandler.SimulatorSave

### /forecast (5)

- [ ] `GET /forecast` → appHandler.NetWorthForecast
- [ ] `POST /forecast` → appHandler.NetWorthForecastCreate
- [ ] `POST /forecast/{id}` → appHandler.NetWorthForecastUpdate
- [ ] `POST /forecast/{id}/run` → appHandler.NetWorthForecastRun
- [ ] `POST /forecast/{id}/delete` → appHandler.NetWorthForecastDelete

### /notifications (3)

- [ ] `GET /notifications` → appHandler.NotificationInbox
- [ ] `POST /notifications/read-all` → appHandler.NotificationsReadAll
- [ ] `POST /notifications/{id}/read` → appHandler.NotificationRead

### /scenarios (11)

- [ ] `GET /scenarios` → appHandler.Scenarios
- [ ] `POST /scenarios/runs` → appHandler.ScenarioCreateRun
- [ ] `POST /scenarios/snapshot-review` → appHandler.ScenarioSnapshotReview
- [ ] `GET /scenarios/runs/{id}` → appHandler.ScenarioRunStatus
- [ ] `DELETE /scenarios/runs/{id}` → appHandler.ScenarioRunCancel
- [ ] `GET /scenarios/runs/{id}/report.pdf` → appHandler.ScenarioRunPDF
- [ ] `POST /scenarios/compare` → appHandler.ScenarioRunsCompare
- [ ] `POST /scenarios/configurations/{id}/runs` → appHandler.ScenarioDefinitionRun
- [ ] `DELETE /scenarios/configurations/{id}` → appHandler.ScenarioDefinitionDelete
- [ ] `POST /scenarios/risk-profiles` → appHandler.ScenarioRiskProfileSave
- [ ] `DELETE /scenarios/risk-profiles/{id}` → appHandler.ScenarioRiskProfileDelete

### /trading (1)

- [ ] `GET /trading` → appHandler.TradingDashboard

### /expenses (46)

- [ ] `GET /expenses` → appHandler.ExpensesPlanner
- [ ] `GET /expenses/tax-teaser` → appHandler.ExpensesTaxTeaser
- [ ] `POST /expenses/dca-ticker` → appHandler.ExpensesDcaTickerUpdate
- [ ] `POST /expenses/alert-policy` → appHandler.ExpensesAlertPolicyUpdate
- [ ] `POST /expenses/reallocation` → appHandler.ExpensesReallocationCommit
- [ ] `GET /expenses/bulk` → appHandler.ExpensesBulkTargets
- [ ] `POST /expenses/bulk` → appHandler.ExpensesBulkTargetsSubmit
- [ ] `POST /expenses/templates` → appHandler.ExpensesTemplateCreate
- [ ] `POST /expenses/templates/{id}/apply` → appHandler.ExpensesTemplateApply
- [ ] `GET /expenses/report.pdf` → appHandler.ExpensesBudgetPDF
- [ ] `GET /expenses/financing` → appHandler.ExpensesFinancing
- [ ] `POST /expenses/financing/simulate` → appHandler.ExpensesFinancingSimulate
- [ ] `POST /expenses/financing/save` → appHandler.ExpensesFinancingSave
- [ ] `GET /expenses/year` → appHandler.ExpensesYear
- [ ] `GET /expenses/categories/{pillar}` → appHandler.ExpensesCategory
- [ ] `GET /expenses/record` → appHandler.ExpensesRecordForm
- [ ] `POST /expenses/record` → appHandler.ExpensesRecordSubmit
- [ ] `POST /expenses/receipt/parse-qr` → receiptsHandler.ParseQR
- [ ] `POST /expenses/receipt/ocr` → receiptsHandler.ScanOCR
- [ ] `GET /expenses/receipt/import` → receiptsHandler.ReceiptImportForm
- [ ] `POST /expenses/receipt/scan` → receiptsHandler.ScanBatch
- [ ] `POST /expenses/receipt/commit` → receiptsHandler.CommitBatch
- [ ] `GET /expenses/import` → appHandler.ExpensesImportPage
- [ ] `POST /expenses/import/analyze` → appHandler.ExpensesImportAnalyze
- [ ] `POST /expenses/import/{sessionID}/preview` → appHandler.ExpensesImportPreview
- [ ] `POST /expenses/import/{sessionID}/commit` → appHandler.ExpensesImportCommit
- [ ] `DELETE /expenses/import/{sessionID}` → appHandler.ExpensesImportDiscard
- [ ] `GET /expenses/plan-item` → appHandler.ExpensesPlanItemForm
- [ ] `GET /expenses/plan-item/{id}` → appHandler.ExpensesPlanItemForm
- [ ] `POST /expenses/plan-item` → appHandler.ExpensesPlanItemCreate
- [ ] `PUT /expenses/plan-item/{id}` → appHandler.ExpensesPlanItemUpdate
- [ ] `DELETE /expenses/plan-item/{id}` → appHandler.ExpensesPlanItemDelete
- [ ] `GET /expenses/category` → appHandler.ExpensesCategoryLabelForm
- [ ] `POST /expenses/category` → appHandler.ExpensesCategoryLabelCreate
- [ ] `DELETE /expenses/category/{id}` → appHandler.ExpensesCategoryLabelDelete
- [ ] `GET /expenses/recurring` → appHandler.ExpensesRecurringForm
- [ ] `GET /expenses/recurring/{id}` → appHandler.ExpensesRecurringForm
- [ ] `POST /expenses/recurring` → appHandler.ExpensesRecurringCreate
- [ ] `PUT /expenses/recurring/{id}` → appHandler.ExpensesRecurringUpdate
- [ ] `DELETE /expenses/recurring/{id}` → appHandler.ExpensesRecurringDelete
- [ ] `POST /expenses/suggestions/{id}/dismiss` → appHandler.ExpensesDismissSuggestion
- [ ] `GET /expenses/salary` → appHandler.ExpensesSalaryForm
- [ ] `POST /expenses/salary` → appHandler.ExpensesSalarySubmit
- [ ] `GET /expenses/partner` → appHandler.ExpensesPartnerForm
- [ ] `POST /expenses/partner` → appHandler.ExpensesPartnerSubmit
- [ ] `DELETE /expenses/{id}` → appHandler.ExpensesDelete

### /reports (16)

- [ ] `GET /reports` → appHandler.Reports
- [ ] `GET /reports/advanced` → appHandler.AdvancedReports
- [ ] `POST /reports/advanced/templates` → appHandler.AdvancedReportTemplateCreate
- [ ] `POST /reports/advanced/runs` → appHandler.AdvancedReportRunCreate
- [ ] `POST /reports/advanced/schedules` → appHandler.AdvancedReportScheduleCreate
- [ ] `GET /reports/advanced/artifacts/{id}` → appHandler.AdvancedReportArtifact
- [ ] `GET /reports/deep-dive` → appHandler.ReportsDeepDiveIndex
- [ ] `GET /reports/deep-dive/calendar` → appHandler.ReportsDeepDiveCalendar
- [ ] `GET /reports/deep-dive/contribution` → appHandler.ReportsDeepDiveContribution
- [ ] `GET /reports/deep-dive/currency` → appHandler.ReportsDeepDiveCurrency
- [ ] `GET /reports/deep-dive/notes` → appHandler.ReportsDeepDiveNotes
- [ ] `GET /reports/deep-dive/sectors` → appHandler.ReportsDeepDiveSectors
- [ ] `GET /reports/deep-dive/scorecard` → appHandler.ReportsDeepDiveScorecard
- [ ] `GET /reports/deep-dive/volatility` → appHandler.ReportsDeepDiveVolatility
- [ ] `GET /reports/deep-dive/winners` → appHandler.ReportsDeepDiveWinners
- [ ] `GET /reports/{tab}` → appHandler.Reports

### /tax (16)

- [ ] `GET /tax` → appHandler.Tax
- [ ] `GET /tax/filing` → appHandler.TaxFiling
- [ ] `POST /tax/profile` → appHandler.TaxProfileSave
- [ ] `POST /tax/instruments/{id}/market-admission` → appHandler.TaxInstrumentMarketAdmissionSave
- [ ] `POST /tax/instruments/{id}/fund-classification` → appHandler.TaxInstrumentFundClassificationSave
- [ ] `POST /tax/funds/annual-inputs` → appHandler.TaxFundAnnualInputSave
- [ ] `POST /tax/scenarios` → appHandler.TaxScenarioCreate
- [ ] `POST /tax/action-plans` → appHandler.TaxActionPlanCreate
- [ ] `POST /tax/opportunities/{id}/dismiss` → appHandler.TaxOpportunityDismiss
- [ ] `POST /tax/opportunities/{id}/restore` → appHandler.TaxOpportunityRestore
- [ ] `POST /tax/location-scenarios` → appHandler.TaxLocationScenarioCreate
- [ ] `POST /tax/placement-plans` → appHandler.TaxPlacementPlanCreate
- [ ] `POST /tax/notifications` → appHandler.TaxNotificationsSave
- [ ] `POST /tax/reports` → appHandler.TaxReportCreate
- [ ] `GET /tax/reports/{id}/status` → appHandler.TaxReportStatus
- [ ] `GET /tax/reports/{id}/download` → appHandler.TaxReportDownload

### /markets (6)

- [ ] `GET /markets` → appHandler.Markets
- [ ] `GET /markets/overview` → appHandler.MarketsOverview
- [ ] `GET /markets/earnings` → appHandler.MarketsEarnings
- [ ] `GET /markets/congress` → appHandler.MarketsCongress
- [ ] `GET /markets/sentiment` → appHandler.MarketsSentiment
- [ ] `GET /markets/sentiment/board` → appHandler.MarketsSentimentBoard

### /pilots (4)

- [ ] `GET /pilots` → appHandler.PilotsBrowse
- [ ] `GET /pilots/{slug}` → appHandler.PilotDetail
- [ ] `GET /pilots/{slug}/follow` → appHandler.PilotFollowForm
- [ ] `POST /pilots/{slug}/follow` → appHandler.PilotFollowCreate

### /pilot-follows (3)

- [ ] `GET /pilot-follows/{id}` → appHandler.PilotFollowDetail
- [ ] `POST /pilot-follows/{id}/status` → appHandler.PilotFollowStatus
- [ ] `POST /pilot-follows/{id}/stop` → appHandler.PilotFollowStop

### /economy (3)

- [ ] `GET /economy` → appHandler.Economy
- [ ] `GET /economy/news` → appHandler.EconomyNews
- [ ] `GET /economy/{section}` → appHandler.Economy

### /crypto (9)

- [ ] `GET /crypto/portfolio/holding` → appHandler.CryptoPortfolioHoldingForm
- [ ] `GET /crypto/portfolio/holding/{id}` → appHandler.CryptoPortfolioHoldingForm
- [ ] `POST /crypto/portfolio/holding` → appHandler.CryptoPortfolioHoldingCreate
- [ ] `PUT /crypto/portfolio/holding/{id}` → appHandler.CryptoPortfolioHoldingUpdate
- [ ] `DELETE /crypto/portfolio/holding/{id}` → appHandler.CryptoPortfolioHoldingDelete
- [ ] `GET /crypto/markets/fragment` → appHandler.CryptoMarketsFragment
- [ ] `GET /crypto/coin/{symbol}` → appHandler.CryptoCoin
- [ ] `GET /crypto` → appHandler.Crypto
- [ ] `GET /crypto/{tab}` → appHandler.Crypto

### /research (6)

- [ ] `GET /research` → appHandler.Research
- [ ] `POST /research` → appHandler.ResearchSubmit
- [ ] `POST /research/{id}/delete` → appHandler.ResearchDelete
- [ ] `GET /research/memos/{id}` → appHandler.ResearchMemo
- [ ] `POST /research/memos/{id}/bookmark` → appHandler.ResearchMemoBookmark
- [ ] `POST /research/memos/{id}/delete` → appHandler.ResearchMemoDelete

### /boards (18)

- [ ] `GET /boards` → appHandler.BoardsDirectory
- [ ] `POST /boards` → appHandler.BoardsCreate
- [ ] `GET /boards/activity` → appHandler.BoardsActivity
- [ ] `POST /boards/activity/settings` → appHandler.BoardsActivitySettings
- [ ] `GET /boards/guidelines` → appHandler.BoardsGuidelines
- [ ] `POST /boards/guidelines` → appHandler.BoardsGuidelinesAccept
- [ ] `POST /boards/report` → appHandler.BoardsReport
- [ ] `POST /boards/block` → appHandler.BoardsBlock
- [ ] `GET /boards/p/{id}` → appHandler.BoardsPostRedirect
- [ ] `POST /boards/p/{id}/vote` → appHandler.BoardsVote
- [ ] `POST /boards/p/{id}/comments` → appHandler.BoardsComment
- [ ] `POST /boards/p/{id}/delete` → appHandler.BoardsDeletePost
- [ ] `POST /boards/c/{id}/delete` → appHandler.BoardsDeleteComment
- [ ] `GET /boards/{slug}` → appHandler.BoardsBoard
- [ ] `POST /boards/{slug}/delete` → appHandler.BoardsDeleteBoard
- [ ] `GET /boards/{slug}/submit` → appHandler.BoardsSubmitForm
- [ ] `POST /boards/{slug}/submit` → appHandler.BoardsSubmit
- [ ] `GET /boards/{slug}/p/{id}` → appHandler.BoardsPost

### /admin (4)

- [ ] `GET /admin/community` → appHandler.BoardsAdmin
- [ ] `POST /admin/community/sanctions` → appHandler.BoardsAdminSanction
- [ ] `POST /admin/community/sanctions/{id}/revoke` → appHandler.BoardsAdminRevoke
- [ ] `POST /admin/community/reports/{id}/resolve` → appHandler.BoardsAdminResolve

### /groups (31)

- [ ] `GET /groups` → appHandler.GroupsHome
- [ ] `GET /groups/unread-badge` → appHandler.GroupsUnreadBadge
- [ ] `GET /groups/rail` → appHandler.GroupsRail
- [ ] `GET /groups/events` → appHandler.GroupsEvents
- [ ] `GET /groups/discover` → appHandler.GroupsDiscover
- [ ] `GET /groups/new` → appHandler.GroupsNew
- [ ] `POST /groups/new` → appHandler.GroupsCreate
- [ ] `GET /groups/join` → appHandler.GroupsJoinLink
- [ ] `POST /groups/block` → appHandler.GroupsBlock
- [ ] `POST /groups/invitations/{invitationID}/accept` → appHandler.GroupsAcceptInvitation
- [ ] `POST /groups/invitations/{invitationID}/decline` → appHandler.GroupsDeclineInvitation
- [ ] `POST /groups/m/{messageID}/delete` → appHandler.GroupsDeleteMessage
- [ ] `POST /groups/m/{messageID}/report` → appHandler.GroupsReportMessage
- [ ] `GET /groups/{groupID}` → appHandler.GroupsOpen
- [ ] `POST /groups/{groupID}/join` → appHandler.GroupsJoin
- [ ] `GET /groups/{groupID}/c/{channelID}` → appHandler.GroupsChat
- [ ] `GET /groups/{groupID}/c/{channelID}/panel` → appHandler.GroupsChannelPanel
- [ ] `GET /groups/{groupID}/c/{channelID}/messages` → appHandler.GroupsMessages
- [ ] `POST /groups/{groupID}/c/{channelID}/messages` → appHandler.GroupsSend
- [ ] `POST /groups/{groupID}/c/{channelID}/read` → appHandler.GroupsMarkRead
- [ ] `GET /groups/{groupID}/settings` → appHandler.GroupsSettings
- [ ] `POST /groups/{groupID}/notifications` → appHandler.GroupsNotifications
- [ ] `POST /groups/{groupID}/edit` → appHandler.GroupsEdit
- [ ] `POST /groups/{groupID}/invitations` → appHandler.GroupsInviteFriends
- [ ] `POST /groups/{groupID}/invites` → appHandler.GroupsCreateInvite
- [ ] `POST /groups/{groupID}/invites/{inviteID}/revoke` → appHandler.GroupsRevokeInvite
- [ ] `POST /groups/{groupID}/channels` → appHandler.GroupsCreateChannel
- [ ] `POST /groups/{groupID}/channels/{channelID}/delete` → appHandler.GroupsDeleteChannel
- [ ] `POST /groups/{groupID}/members/{userID}/{action}` → appHandler.GroupsMember
- [ ] `POST /groups/{groupID}/leave` → appHandler.GroupsLeave
- [ ] `POST /groups/{groupID}/delete` → appHandler.GroupsDelete

### /ai-consent (2)

- [x] `GET /ai-consent` → appHandler.AIConsentPage → v2: see docs/parity/auth-onboarding.md
- [x] `POST /ai-consent` → appHandler.AIConsentGrant → v2: see docs/parity/auth-onboarding.md

### /billing (4)

- [ ] `POST /billing/restore` → appHandler.BillingRestore
- [ ] `POST /billing/coupons/redeem` → appHandler.BillingCouponRedeem
- [ ] `GET /billing/manage` → appHandler.BillingManage
- [ ] `GET /billing/checkout` → appHandler.BillingCheckout

### /logout (1)

- [ ] `POST /logout` → authHandler.Logout

### /terminal (13)

- [ ] `GET /terminal` → h.Terminal
- [ ] `PATCH /terminal/positions/{id}` → h.TerminalPositionUpdate
- [ ] `POST /terminal/positions` → h.TerminalPositionCreate
- [ ] `DELETE /terminal/positions/{id}` → h.TerminalPositionDelete
- [ ] `POST /terminal/positions/{id}/duplicate` → h.TerminalPositionDuplicate
- [ ] `POST /terminal/positions/{id}/move` → h.TerminalPositionMove
- [ ] `POST /terminal/positions/{id}/ai/facts` → h.TerminalAIFacts
- [ ] `POST /terminal/positions/{id}/ai/scenario` → h.TerminalAIScenario
- [ ] `POST /terminal/sample/dismiss` → h.TerminalSampleDismiss
- [ ] `POST /terminal/autobuys` → h.TerminalAutobuyCreate
- [ ] `PATCH /terminal/autobuys/{id}` → h.TerminalAutobuyUpdate
- [ ] `POST /terminal/autobuys/{id}/active` → h.TerminalAutobuyActive
- [ ] `DELETE /terminal/autobuys/{id}` → h.TerminalAutobuyDelete

### /friends (18)

- [ ] `GET /friends` → h.Friends
- [ ] `GET /friends/search` → h.FriendsSearch
- [ ] `POST /friends/requests` → h.FriendRequestSend
- [ ] `POST /friends/requests/{id}/accept` → h.FriendRequestAccept
- [ ] `POST /friends/requests/{id}/decline` → h.FriendRequestDecline
- [ ] `POST /friends/requests/{id}/cancel` → h.FriendRequestCancel
- [ ] `GET /friends/invite` → h.FriendsInvite
- [ ] `POST /friends/invite/{code}/accept` → h.FriendsInviteAccept
- [ ] `GET /friends/u/{userId}` → h.FriendProfile
- [ ] `POST /friends/u/{userId}/unfriend` → h.FriendRemove
- [ ] `POST /friends/u/{userId}/block` → h.FriendBlock
- [ ] `POST /friends/u/{userId}/report` → h.FriendReport
- [ ] `POST /friends/x/start` → h.FriendsXStart
- [ ] `GET /friends/x/callback` → h.FriendsXCallback
- [ ] `POST /friends/facebook/start` → h.FriendsFacebookStart
- [ ] `GET /friends/facebook/callback` → h.FriendsFacebookCallback
- [ ] `POST /friends/facebook/disconnect` → h.FriendsFacebookDisconnect
- [ ] `GET /friends/leaderboard` → h.Leaderboard

### /xp (3)

- [ ] `GET /xp` → h.XPHistory
- [ ] `GET /xp/card` → h.XPCard
- [ ] `POST /xp/check-in` → h.XPCheckIn

### /articles (16)

- [x] `GET /articles` → h.Feed → v2: see docs/parity/public.md
- [x] `GET /articles/ticker/{symbol}` → h.TickerFeed → v2: see docs/parity/public.md
- [x] `GET /articles/images/{id}` → h.Image → v2: see docs/parity/public.md
- [x] `GET /articles/{code}/og.png` → h.OGImage → v2: see docs/parity/public.md
- [x] `GET /articles/{code}/card.png` → h.CardImage → v2: see docs/parity/public.md
- [x] `POST /articles/{code}/view` → h.View → v2: see docs/parity/public.md
- [x] `GET /articles/{slugcode}` → h.Detail → v2: see docs/parity/public.md
- [x] `GET /articles/new` → h.NewForm → v2: see docs/parity/public.md
- [x] `POST /articles/new` → h.Create → v2: see docs/parity/public.md
- [x] `POST /articles/preview` → h.Preview → v2: see docs/parity/public.md
- [x] `GET /articles/{code}/edit` → h.EditForm → v2: see docs/parity/public.md
- [x] `POST /articles/{code}/edit` → h.Update → v2: see docs/parity/public.md
- [x] `POST /articles/{code}/delete` → h.Delete → v2: see docs/parity/public.md
- [x] `POST /articles/{code}/vote` → h.Vote → v2: see docs/parity/public.md
- [x] `POST /articles/{code}/report` → h.Report → v2: see docs/parity/public.md
- [x] `POST /articles/{code}/visibility` → h.Visibility → v2: see docs/parity/public.md

### /a (1)

- [x] `GET /a/{code}` → h.ShortLink → v2: see docs/parity/public.md

### /u (1)

- [x] `GET /u/{username}/articles` → h.AuthorFeed → v2: see docs/parity/public.md