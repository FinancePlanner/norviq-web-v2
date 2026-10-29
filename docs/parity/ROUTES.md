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

### /digest (2)

- [x] `GET /digest/unsubscribe` → handlers.DigestUnsubscribePage(deps) → v2: see docs/parity/public.md
- [x] `POST /digest/unsubscribe` → handlers.DigestUnsubscribeSubmit(deps) → v2: see docs/parity/public.md

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

- [x] `GET /dashboard` → appHandler.Dashboard → v2: see dashboard.md
- [x] `GET /dashboard/pulse` → appHandler.DashboardPulse → v2: see dashboard.md
- [x] `GET /dashboard/action-queue` → appHandler.DashboardActionQueue → v2: see dashboard.md
- [x] `POST /dashboard/action/{id}/read` → appHandler.DashboardActionRead → v2: see dashboard.md
- [x] `GET /dashboard/panel/tax` → appHandler.DashboardTaxPanel → v2: see dashboard.md
- [x] `GET /dashboard/ledger` → appHandler.DashboardLedger → v2: see dashboard.md
- [x] `GET /dashboard/activity-feed` → appHandler.DashboardActivityFeed → v2: see dashboard.md
- [x] `GET /dashboard/search` → appHandler.DashboardSearch → v2: see dashboard.md
- [x] `GET /dashboard/recent-spend` → appHandler.DashboardRecentSpend → v2: see dashboard.md
- [x] `GET /dashboard/economy-pulse` → appHandler.DashboardEconomyPulse → v2: see dashboard.md
- [x] `GET /dashboard/news-ticker` → appHandler.DashboardNewsTicker → v2: see dashboard.md
- [x] `GET /dashboard/market-brief` → marketBriefHandler.Partial("/dashboard/market-brief") → v2: see dashboard.md
- [x] `POST /dashboard/quick-expense` → appHandler.DashboardQuickExpense → v2: see dashboard.md
- [x] `GET /dashboard/activity` → appHandler.DashboardActivity → v2: see dashboard.md
- [x] `GET /dashboard/activity-list` → appHandler.DashboardActivityList → v2: see dashboard.md
- [x] `GET /dashboard/insights` → appHandler.DashboardInsights → v2: see dashboard.md
- [x] `GET /dashboard/insights/ai` → appHandler.DashboardAIInsightsPartial → v2: see dashboard.md
- [x] `GET /dashboard/why-moved` → appHandler.DashboardWhyMovedPartial → v2: see dashboard.md
- [x] `GET /dashboard/mcp-status` → appHandler.DashboardMCPStatusPartial → v2: see dashboard.md
- [x] `POST /dashboard/insights/goals` → appHandler.DashboardInsightsCreateGoal → v2: see dashboard.md
- [x] `POST /dashboard/insights/goals/{id}/toggle` → appHandler.DashboardInsightsToggleGoal → v2: see dashboard.md
- [x] `GET /dashboard/insights/goals/{id}/edit` → appHandler.DashboardInsightsGoalEditForm → v2: see dashboard.md
- [x] `PATCH /dashboard/insights/goals/{id}` → appHandler.DashboardInsightsUpdateGoal → v2: see dashboard.md
- [x] `DELETE /dashboard/insights/goals/{id}` → appHandler.DashboardInsightsDeleteGoal → v2: see dashboard.md
- [x] `GET /dashboard/insights/focus-points` → appHandler.DashboardInsightsFocusPointsPartial → v2: see dashboard.md
- [x] `GET /dashboard/terminal` → h.DashboardTerminalSummary → v2: see dashboard.md

### /guided-start (4)

- [x] `GET /guided-start/start` → appHandler.GuidedStartStep → v2: see docs/parity/auth-onboarding.md
- [x] `GET /guided-start/poll` → appHandler.GuidedStartPoll → v2: see docs/parity/auth-onboarding.md
- [x] `POST /guided-start/skip` → appHandler.GuidedStartSkip → v2: see docs/parity/auth-onboarding.md
- [x] `POST /guided-start/dismiss` → appHandler.GuidedStartDismiss → v2: see docs/parity/auth-onboarding.md

### /settings (44)

- [x] `POST /settings/show-me-around` → appHandler.ShowMeAround → v2: see settings-admin.md
- [x] `GET /settings` → appHandler.Settings → v2: see settings-admin.md
- [x] `POST /settings/export` → appHandler.SettingsExportSubmit → v2: see settings-admin.md
- [x] `GET /settings/export/{id}/download` → appHandler.SettingsExportDownload → v2: see settings-admin.md
- [x] `POST /settings/api-access` → appHandler.SettingsAPIAccessCreate → v2: see settings-admin.md
- [x] `POST /settings/api-access/{id}/revoke` → appHandler.SettingsAPIAccessRevoke → v2: see settings-admin.md
- [x] `GET /settings/api-access/{id}/verify` → appHandler.APIAccessVerifyPartial → v2: see settings-admin.md
- [x] `POST /settings/ai-providers` → appHandler.SettingsAIProvidersConnect → v2: see settings-admin.md
- [x] `POST /settings/ai-consent/revoke` → appHandler.SettingsAIConsentRevoke → v2: see settings-admin.md
- [x] `POST /settings/ai-providers/{id}/verify` → appHandler.SettingsAIProvidersVerify → v2: see settings-admin.md
- [x] `POST /settings/ai-providers/{id}/disconnect` → appHandler.SettingsAIProvidersDisconnect → v2: see settings-admin.md
- [x] `POST /settings/news-ticker/toggle` → appHandler.SettingsNewsTickerToggle → v2: see settings-admin.md
- [x] `POST /settings/news-ticker/feeds` → appHandler.SettingsNewsTickerAddFeed → v2: see settings-admin.md
- [x] `POST /settings/news-ticker/feeds/{id}/delete` → appHandler.SettingsNewsTickerRemoveFeed → v2: see settings-admin.md
- [x] `GET /settings/banks` → appHandler.SettingsBanks → v2: see money.md
- [x] `POST /settings/banks/link-session` → appHandler.SettingsBanksLinkSession → v2: see settings-admin.md
- [x] `POST /settings/banks/exchange` → appHandler.SettingsBanksExchange → v2: see settings-admin.md
- [x] `GET /settings/banks/institutions` → appHandler.SettingsBanksInstitutions → v2: see settings-admin.md
- [x] `POST /settings/banks/connect-eu` → appHandler.SettingsBanksConnectEU → v2: see settings-admin.md
- [x] `POST /settings/banks/{id}/sync` → appHandler.SettingsBanksSync → v2: see settings-admin.md
- [x] `POST /settings/banks/{id}/disconnect` → appHandler.SettingsBanksDisconnect → v2: see settings-admin.md
- [x] `POST /settings/banks/transactions/{id}/import` → appHandler.SettingsBanksImport → v2: see settings-admin.md
- [x] `POST /settings/banks/transactions/{id}/dismiss` → appHandler.SettingsBanksDismiss → v2: see settings-admin.md
- [x] `POST /settings/integrations/telegram` → appHandler.SettingsTelegramConnect → v2: see settings-admin.md
- [x] `POST /settings/integrations/telegram/disconnect` → appHandler.SettingsTelegramDisconnect → v2: see settings-admin.md
- [x] `POST /settings/integrations/telegram/alerts` → appHandler.SettingsTelegramAlerts → v2: see settings-admin.md
- [x] `POST /settings/integrations/ibkr/connect` → appHandler.SettingsIBKRConnect → v2: see settings-admin.md
- [x] `GET /settings/integrations/ibkr/callback` → appHandler.SettingsIBKRCallback → v2: see settings-admin.md
- [x] `POST /settings/integrations/ibkr/sync` → appHandler.SettingsIBKRSync → v2: see settings-admin.md
- [x] `POST /settings/integrations/ibkr/disconnect` → appHandler.SettingsIBKRDisconnect → v2: see settings-admin.md
- [x] `GET /settings/profile/oauth/{provider}/connect` → authHandler.OAuthLinkStart → v2: see settings-admin.md
- [x] `GET /settings/{section}` → appHandler.Settings → v2: see settings-admin.md
- [x] `POST /settings/language` → appHandler.SettingsLanguageSubmit → v2: see settings-admin.md
- [x] `POST /settings/profile` → appHandler.SettingsProfileSubmit → v2: see settings-admin.md
- [x] `POST /settings/profile/delete` → appHandler.SettingsProfileDelete → v2: see settings-admin.md
- [x] `POST /settings/passkey/register/begin` → appHandler.PasskeyRegisterBegin → v2: see settings-admin.md
- [x] `POST /settings/passkey/register/finish` → appHandler.PasskeyRegisterFinish → v2: see settings-admin.md
- [x] `POST /settings/notifications/earnings` → appHandler.SettingsNotificationsSubmit → v2: see settings-admin.md
- [x] `POST /settings/feedback` → appHandler.SettingsFeedbackSubmit → v2: see settings-admin.md
- [x] `GET /settings/subscription/status` → appHandler.SubscriptionStatusPartial → v2: see settings-admin.md
- [x] `GET /settings/friends-privacy` → h.FriendsPrivacy → v2: see settings-admin.md
- [x] `POST /settings/friends-privacy` → h.FriendsPrivacySubmit → v2: see settings-admin.md
- [x] `GET /settings/blocked` → h.BlockedUsers → v2: see settings-admin.md
- [x] `POST /settings/blocked/{userId}/unblock` → h.BlockedUserUnblock → v2: see settings-admin.md

### /goals (7)

- [x] `GET /goals` → appHandler.FinancialGoals → v2: see dashboard.md
- [x] `POST /goals` → appHandler.FinancialGoalCreate → v2: see dashboard.md
- [x] `POST /goals/bulk` → appHandler.FinancialGoalBulkUpdate → v2: see dashboard.md
- [x] `POST /goals/{id}/what-if` → appHandler.FinancialGoalWhatIf → v2: see dashboard.md
- [x] `POST /goals/{id}/contributions` → appHandler.FinancialGoalContributionCreate → v2: see dashboard.md
- [x] `POST /goals/{id}/suggestions/{suggestionID}/accept` → appHandler.FinancialGoalSuggestionAccept → v2: see dashboard.md
- [x] `GET /goals/{id}/report.pdf` → appHandler.FinancialGoalPDF → v2: see dashboard.md

### /chart-builder (1)

- [x] `GET /chart-builder` → appHandler.ChartBuilderStandalone → v2: see planning-tools.md

### /news (1)

- [x] `GET /news/view` → appHandler.NewsArticleView → v2: see dashboard.md

### /assistant (8)

- [x] `GET /assistant` → appHandler.Assistant → v2: see dashboard.md
- [x] `POST /assistant/conversations` → appHandler.AssistantCreateConversation → v2: see dashboard.md
- [x] `GET /assistant/conversations/{id}` → appHandler.AssistantConversation → v2: see dashboard.md
- [x] `POST /assistant/conversations/{id}/turn` → appHandler.AssistantTurn → v2: see dashboard.md
- [x] `POST /assistant/conversations/{id}/stream` → appHandler.AssistantStreamTurn → v2: see dashboard.md
- [x] `POST /assistant/actions/{id}/confirm` → appHandler.AssistantConfirmAction → v2: see dashboard.md
- [x] `POST /assistant/actions/{id}/cancel` → appHandler.AssistantCancelAction → v2: see dashboard.md
- [x] `DELETE /assistant/tips/{id}` → appHandler.AssistantDismissTip → v2: see dashboard.md

### /portfolio (92)

- [x] `GET /portfolio` → appHandler.PortfolioHoldings → v2: see portfolio.md
- [x] `GET /portfolio/one-page` → appHandler.PortfolioOnePage → v2: see portfolio.md
- [x] `POST /portfolio/one-page/share-link` → appHandler.PortfolioShareLinkCreate → v2: see portfolio.md
- [x] `DELETE /portfolio/one-page/share-link` → appHandler.PortfolioShareLinkRevoke → v2: see portfolio.md
- [x] `GET /portfolio/rebalancing` → appHandler.PortfolioRebalancing → v2: see portfolio.md
- [x] `POST /portfolio/rebalancing/{id}/model` → appHandler.PortfolioRebalancingModelSave → v2: see portfolio.md
- [x] `POST /portfolio/rebalancing/{id}/simulate` → appHandler.PortfolioRebalancingSimulate → v2: see portfolio.md
- [x] `POST /portfolio/rebalancing/{id}/plans` → appHandler.PortfolioRebalancingPlanSave → v2: see portfolio.md
- [x] `POST /portfolio/rebalancing/{id}/plans/{planID}/complete` → appHandler.PortfolioRebalancingPlanComplete → v2: see portfolio.md
- [x] `GET /portfolio/rebalancing/{id}/plans/{planID}/export.{format}` → appHandler.PortfolioRebalancingPlanExport → v2: see portfolio.md
- [x] `POST /portfolio/rebalancing/{id}/preferences` → appHandler.PortfolioRebalancingPreferences → v2: see portfolio.md
- [x] `POST /portfolio/rebalancing/{id}/alerts/{alertID}/acknowledge` → appHandler.PortfolioRebalancingAlertAcknowledge → v2: see portfolio.md
- [x] `GET /portfolio/retirement` → appHandler.RetirementPlanner → v2: see portfolio.md
- [x] `POST /portfolio/retirement` → appHandler.RetirementPlannerSave → v2: see portfolio.md
- [x] `POST /portfolio/positions` → appHandler.PortfolioCreatePosition → v2: see portfolio.md
- [x] `GET /portfolio/positions/{id}/edit` → appHandler.PortfolioPositionEditForm → v2: see portfolio.md
- [x] `PUT /portfolio/positions/{id}` → appHandler.PortfolioPositionUpdate → v2: see portfolio.md
- [x] `DELETE /portfolio/positions/{id}` → appHandler.PortfolioPositionDelete → v2: see portfolio.md
- [x] `GET /portfolio/positions/{id}/sell` → appHandler.PortfolioPositionSellForm → v2: see portfolio.md
- [x] `POST /portfolio/positions/{id}/sell` → appHandler.PortfolioPositionSell → v2: see portfolio.md
- [x] `GET /portfolio/quotes` → appHandler.PortfolioHoldingsQuotes → v2: see portfolio.md
- [x] `GET /portfolio/positions/{id}/alert` → appHandler.PortfolioPositionAlertForm → v2: see portfolio.md
- [x] `POST /portfolio/positions/{id}/alert` → appHandler.PortfolioPositionAlertSave → v2: see portfolio.md
- [x] `GET /portfolio/targets` → appHandler.PortfolioTargets → v2: see portfolio.md
- [x] `GET /portfolio/targets/add` → appHandler.PortfolioTargetsAddForm → v2: see portfolio.md
- [x] `POST /portfolio/targets` → appHandler.PortfolioTargetsCreate → v2: see portfolio.md
- [x] `GET /portfolio/targets/{id}/edit` → appHandler.PortfolioTargetsEditForm → v2: see portfolio.md
- [x] `PUT /portfolio/targets/{id}` → appHandler.PortfolioTargetsUpdate → v2: see portfolio.md
- [x] `DELETE /portfolio/targets/{id}/remove` → appHandler.PortfolioTargetsDelete → v2: see portfolio.md
- [x] `DELETE /portfolio/targets/{id}` → appHandler.PortfolioTargetDelete → v2: see portfolio.md
- [x] `GET /portfolio/allocation` → appHandler.PortfolioAllocation → v2: see portfolio.md
- [x] `GET /portfolio/sector-gains` → appHandler.PortfolioSectorGains → v2: see portfolio.md
- [x] `GET /portfolio/watchlist` → appHandler.PortfolioWatchlist → v2: see portfolio.md
- [x] `GET /portfolio/screens` → appHandler.SmartScreens → v2: see dashboard.md
- [x] `POST /portfolio/screens` → appHandler.SmartScreenCreate → v2: see dashboard.md
- [x] `POST /portfolio/screens/{id}` → appHandler.SmartScreenUpdate → v2: see portfolio.md
- [x] `POST /portfolio/screens/{id}/evaluate` → appHandler.SmartScreenEvaluate → v2: see portfolio.md
- [x] `POST /portfolio/screens/{id}/delete` → appHandler.SmartScreenDelete → v2: see portfolio.md
- [x] `GET /portfolio/rebalancing-rules` → appHandler.RebalancingRules → v2: see dashboard.md
- [x] `POST /portfolio/rebalancing/{id}` → appHandler.RebalancingRuleSave → v2: see portfolio.md
- [x] `POST /portfolio/rebalancing/{id}/events/{eventID}/confirm` → appHandler.RebalanceEventConfirm → v2: see portfolio.md
- [x] `POST /portfolio/rebalancing/{id}/events/{eventID}/dismiss` → appHandler.RebalanceEventDismiss → v2: see portfolio.md
- [x] `GET /portfolio/watchlist/quotes` → appHandler.PortfolioWatchlistQuotes → v2: see portfolio.md
- [x] `GET /portfolio/watchlist/search` → appHandler.PortfolioWatchlistSearch → v2: see portfolio.md
- [x] `POST /portfolio/watchlist/items` → appHandler.PortfolioWatchlistAdd → v2: see portfolio.md
- [x] `GET /portfolio/watchlist/items/{id}/edit` → appHandler.PortfolioWatchlistItemEditForm → v2: see portfolio.md
- [x] `PATCH /portfolio/watchlist/items/{id}` → appHandler.PortfolioWatchlistItemUpdate → v2: see portfolio.md
- [x] `DELETE /portfolio/watchlist/items/{id}` → appHandler.PortfolioWatchlistRemove → v2: see portfolio.md
- [x] `GET /portfolio/import/screenshot` → appHandler.PortfolioScreenshotImportForm → v2: see portfolio.md
- [x] `POST /portfolio/import/screenshot/preview` → appHandler.PortfolioScreenshotImportPreview → v2: see portfolio.md
- [x] `POST /portfolio/import/screenshot/commit` → appHandler.PortfolioScreenshotImportCommit → v2: see portfolio.md
- [x] `GET /portfolio/watchlist/import/csv` → appHandler.PortfolioWatchlistCSVImportForm → v2: see portfolio.md
- [x] `POST /portfolio/watchlist/import/csv/preview` → appHandler.PortfolioWatchlistCSVImportPreview → v2: see portfolio.md
- [x] `POST /portfolio/watchlist/import/csv/commit` → appHandler.PortfolioWatchlistCSVImportCommit → v2: see portfolio.md
- [x] `GET /portfolio/watchlist/list` → appHandler.PortfolioWatchlistListForm → v2: see portfolio.md
- [x] `GET /portfolio/watchlist/list/{id}` → appHandler.PortfolioWatchlistListForm → v2: see portfolio.md
- [x] `POST /portfolio/watchlist/list` → appHandler.PortfolioWatchlistListCreate → v2: see portfolio.md
- [x] `PUT /portfolio/watchlist/list/{id}` → appHandler.PortfolioWatchlistListUpdate → v2: see portfolio.md
- [x] `DELETE /portfolio/watchlist/list/{id}` → appHandler.PortfolioWatchlistListDelete → v2: see portfolio.md
- [x] `GET /portfolio/allocation/list` → appHandler.PortfolioAllocationListForm → v2: see portfolio.md
- [x] `GET /portfolio/allocation/list/{id}` → appHandler.PortfolioAllocationListForm → v2: see portfolio.md
- [x] `POST /portfolio/allocation/list` → appHandler.PortfolioAllocationListCreate → v2: see portfolio.md
- [x] `PUT /portfolio/allocation/list/{id}` → appHandler.PortfolioAllocationListUpdate → v2: see portfolio.md
- [x] `DELETE /portfolio/allocation/list/{id}` → appHandler.PortfolioAllocationListDelete → v2: see portfolio.md
- [x] `GET /portfolio/earnings` → appHandler.PortfolioEarnings → v2: see portfolio.md
- [x] `GET /portfolio/dividends` → appHandler.PortfolioDividends → v2: see portfolio.md
- [x] `GET /portfolio/news/article` → appHandler.PortfolioNewsArticleForm → v2: see portfolio.md
- [x] `GET /portfolio/news/article/{id}` → appHandler.PortfolioNewsArticleForm → v2: see portfolio.md
- [x] `POST /portfolio/news/article` → appHandler.PortfolioNewsArticleCreate → v2: see portfolio.md
- [x] `PUT /portfolio/news/article/{id}` → appHandler.PortfolioNewsArticleUpdate → v2: see portfolio.md
- [x] `DELETE /portfolio/news/article/{id}` → appHandler.PortfolioNewsArticleDelete → v2: see portfolio.md
- [x] `GET /portfolio/news/open` → appHandler.PortfolioNewsOpen → v2: see portfolio.md
- [x] `POST /portfolio/news/thesis-watch/{id}/feedback` → appHandler.PortfolioThesisWatchFeedback → v2: see portfolio.md
- [x] `GET /portfolio/news/thesis-watch/{id}/open` → appHandler.PortfolioThesisWatchOpen → v2: see portfolio.md
- [x] `GET /portfolio/news` → appHandler.PortfolioNews → v2: see portfolio.md
- [x] `GET /portfolio/{symbol}/quote` → appHandler.StockDetailQuote → v2: see stock.md
- [x] `GET /portfolio/{symbol}/pressure` → appHandler.StockPressure → v2: see stock.md
- [x] `GET /portfolio/{symbol}/earnings/transcript` → appHandler.StockEarningsTranscript → v2: see stock.md
- [x] `GET /portfolio/{symbol}/valuation/edit` → appHandler.StockValuationForm → v2: see stock.md
- [x] `POST /portfolio/{symbol}/valuation` → appHandler.StockValuationSave → v2: see stock.md
- [x] `GET /portfolio/{symbol}/builder` → appHandler.StockDetail → v2: see planning-tools.md
- [x] `GET /portfolio/{symbol}/builder/chart` → appHandler.StockChartBuilderChart → v2: see stock.md
- [x] `GET /portfolio/{symbol}/builder/csv` → appHandler.StockChartBuilderCSV → v2: see stock.md
- [x] `GET /portfolio/{symbol}/statements` → appHandler.StockDetail → v2: see stock.md
- [x] `GET /portfolio/{symbol}/ownership` → appHandler.StockDetail → v2: see stock.md
- [x] `GET /portfolio/{symbol}/analysis` → appHandler.StockDetail → v2: see stock.md
- [x] `GET /portfolio/{symbol}/forecast` → appHandler.StockDetail → v2: see stock.md
- [x] `GET /portfolio/{symbol}/compare` → appHandler.StockDetail → v2: see stock.md
- [x] `GET /portfolio/{symbol}/earnings` → appHandler.StockDetail → v2: see stock.md
- [x] `GET /portfolio/{symbol}` → appHandler.StockDetail → v2: see portfolio.md
- [x] `GET /portfolio/{symbol}/{tab}` → appHandler.StockDetail → v2: see stock.md
- [x] `GET /portfolio/{symbol}/terminal` → h.StockTerminal → v2: see stock.md

### /portfolios (6)

- [x] `GET /portfolios` → appHandler.PortfolioWorkspace → v2: see portfolio.md
- [x] `POST /portfolios` → appHandler.PortfolioWorkspaceCreate → v2: see portfolio.md
- [x] `POST /portfolios/{id}/clone` → appHandler.PortfolioWorkspaceClone → v2: see portfolio.md
- [x] `POST /portfolios/{id}/invite` → appHandler.PortfolioWorkspaceInvite → v2: see portfolio.md
- [x] `POST /portfolios/{id}/cash` → appHandler.PortfolioWorkspaceCash → v2: see portfolio.md
- [x] `POST /portfolios/{id}/archive` → appHandler.PortfolioWorkspaceArchive → v2: see portfolio.md

### /planning (4)

- [x] `GET /planning/grow` → appHandler.PlanningGrow → v2: see planning-tools.md
- [x] `POST /planning/grow/preview` → appHandler.PlanningGrowPreview → v2: see planning-tools.md
- [x] `GET /planning/retire` → appHandler.PlanningRetire → v2: see planning-tools.md
- [x] `POST /planning/retire/preview` → appHandler.PlanningRetirePreview → v2: see planning-tools.md

### /simulator (3)

- [x] `GET /simulator` → appHandler.Simulator → v2: see planning-tools.md
- [x] `POST /simulator/preview` → appHandler.SimulatorPreview → v2: see planning-tools.md
- [x] `POST /simulator/save` → appHandler.SimulatorSave → v2: see planning-tools.md

### /forecast (5)

- [x] `GET /forecast` → appHandler.NetWorthForecast → v2: see dashboard.md
- [x] `POST /forecast` → appHandler.NetWorthForecastCreate → v2: see dashboard.md
- [x] `POST /forecast/{id}` → appHandler.NetWorthForecastUpdate → v2: see planning-tools.md
- [x] `POST /forecast/{id}/run` → appHandler.NetWorthForecastRun → v2: see planning-tools.md
- [x] `POST /forecast/{id}/delete` → appHandler.NetWorthForecastDelete → v2: see planning-tools.md

### /notifications (3)

- [x] `GET /notifications` → appHandler.NotificationInbox → v2: see dashboard.md
- [x] `POST /notifications/read-all` → appHandler.NotificationsReadAll → v2: see dashboard.md
- [x] `POST /notifications/{id}/read` → appHandler.NotificationRead → v2: see dashboard.md

### /scenarios (11)

- [x] `GET /scenarios` → appHandler.Scenarios → v2: see planning-tools.md
- [x] `POST /scenarios/runs` → appHandler.ScenarioCreateRun → v2: see planning-tools.md
- [x] `POST /scenarios/snapshot-review` → appHandler.ScenarioSnapshotReview → v2: see planning-tools.md
- [x] `GET /scenarios/runs/{id}` → appHandler.ScenarioRunStatus → v2: see planning-tools.md
- [x] `DELETE /scenarios/runs/{id}` → appHandler.ScenarioRunCancel → v2: see planning-tools.md
- [x] `GET /scenarios/runs/{id}/report.pdf` → appHandler.ScenarioRunPDF → v2: see planning-tools.md
- [x] `POST /scenarios/compare` → appHandler.ScenarioRunsCompare → v2: see planning-tools.md
- [x] `POST /scenarios/configurations/{id}/runs` → appHandler.ScenarioDefinitionRun → v2: see planning-tools.md
- [x] `DELETE /scenarios/configurations/{id}` → appHandler.ScenarioDefinitionDelete → v2: see planning-tools.md
- [x] `POST /scenarios/risk-profiles` → appHandler.ScenarioRiskProfileSave → v2: see planning-tools.md
- [x] `DELETE /scenarios/risk-profiles/{id}` → appHandler.ScenarioRiskProfileDelete → v2: see planning-tools.md

### /trading (1)

- [x] `GET /trading` → appHandler.TradingDashboard → v2: see planning-tools.md

### /expenses (46)

- [x] `GET /expenses` → appHandler.ExpensesPlanner → v2: see money.md
- [x] `GET /expenses/tax-teaser` → appHandler.ExpensesTaxTeaser → v2: see money.md
- [x] `POST /expenses/dca-ticker` → appHandler.ExpensesDcaTickerUpdate → v2: see money.md
- [x] `POST /expenses/alert-policy` → appHandler.ExpensesAlertPolicyUpdate → v2: see money.md
- [x] `POST /expenses/reallocation` → appHandler.ExpensesReallocationCommit → v2: see money.md
- [x] `GET /expenses/bulk` → appHandler.ExpensesBulkTargets → v2: see money.md
- [x] `POST /expenses/bulk` → appHandler.ExpensesBulkTargetsSubmit → v2: see money.md
- [x] `POST /expenses/templates` → appHandler.ExpensesTemplateCreate → v2: see money.md
- [x] `POST /expenses/templates/{id}/apply` → appHandler.ExpensesTemplateApply → v2: see money.md
- [x] `GET /expenses/report.pdf` → appHandler.ExpensesBudgetPDF → v2: see money.md
- [x] `GET /expenses/financing` → appHandler.ExpensesFinancing → v2: see money.md
- [x] `POST /expenses/financing/simulate` → appHandler.ExpensesFinancingSimulate → v2: see money.md
- [x] `POST /expenses/financing/save` → appHandler.ExpensesFinancingSave → v2: see money.md
- [x] `GET /expenses/year` → appHandler.ExpensesYear → v2: see money.md
- [x] `GET /expenses/categories/{pillar}` → appHandler.ExpensesCategory → v2: see money.md
- [x] `GET /expenses/record` → appHandler.ExpensesRecordForm → v2: see money.md
- [x] `POST /expenses/record` → appHandler.ExpensesRecordSubmit → v2: see money.md
- [x] `POST /expenses/receipt/parse-qr` → receiptsHandler.ParseQR → v2: see money.md
- [x] `POST /expenses/receipt/ocr` → receiptsHandler.ScanOCR → v2: see money.md
- [x] `GET /expenses/receipt/import` → receiptsHandler.ReceiptImportForm → v2: see money.md
- [x] `POST /expenses/receipt/scan` → receiptsHandler.ScanBatch → v2: see money.md
- [x] `POST /expenses/receipt/commit` → receiptsHandler.CommitBatch → v2: see money.md
- [x] `GET /expenses/import` → appHandler.ExpensesImportPage → v2: see money.md
- [x] `POST /expenses/import/analyze` → appHandler.ExpensesImportAnalyze → v2: see money.md
- [x] `POST /expenses/import/{sessionID}/preview` → appHandler.ExpensesImportPreview → v2: see money.md
- [x] `POST /expenses/import/{sessionID}/commit` → appHandler.ExpensesImportCommit → v2: see money.md
- [x] `DELETE /expenses/import/{sessionID}` → appHandler.ExpensesImportDiscard → v2: see money.md
- [x] `GET /expenses/plan-item` → appHandler.ExpensesPlanItemForm → v2: see money.md
- [x] `GET /expenses/plan-item/{id}` → appHandler.ExpensesPlanItemForm → v2: see money.md
- [x] `POST /expenses/plan-item` → appHandler.ExpensesPlanItemCreate → v2: see money.md
- [x] `PUT /expenses/plan-item/{id}` → appHandler.ExpensesPlanItemUpdate → v2: see money.md
- [x] `DELETE /expenses/plan-item/{id}` → appHandler.ExpensesPlanItemDelete → v2: see money.md
- [x] `GET /expenses/category` → appHandler.ExpensesCategoryLabelForm → v2: see money.md
- [x] `POST /expenses/category` → appHandler.ExpensesCategoryLabelCreate → v2: see money.md
- [x] `DELETE /expenses/category/{id}` → appHandler.ExpensesCategoryLabelDelete → v2: see money.md
- [x] `GET /expenses/recurring` → appHandler.ExpensesRecurringForm → v2: see money.md
- [x] `GET /expenses/recurring/{id}` → appHandler.ExpensesRecurringForm → v2: see money.md
- [x] `POST /expenses/recurring` → appHandler.ExpensesRecurringCreate → v2: see money.md
- [x] `PUT /expenses/recurring/{id}` → appHandler.ExpensesRecurringUpdate → v2: see money.md
- [x] `DELETE /expenses/recurring/{id}` → appHandler.ExpensesRecurringDelete → v2: see money.md
- [x] `POST /expenses/suggestions/{id}/dismiss` → appHandler.ExpensesDismissSuggestion → v2: see money.md
- [x] `GET /expenses/salary` → appHandler.ExpensesSalaryForm → v2: see money.md
- [x] `POST /expenses/salary` → appHandler.ExpensesSalarySubmit → v2: see money.md
- [x] `GET /expenses/partner` → appHandler.ExpensesPartnerForm → v2: see money.md
- [x] `POST /expenses/partner` → appHandler.ExpensesPartnerSubmit → v2: see money.md
- [x] `DELETE /expenses/{id}` → appHandler.ExpensesDelete → v2: see money.md

### /reports (16)

- [x] `GET /reports` → appHandler.Reports → v2: see insights.md
- [x] `GET /reports/advanced` → appHandler.AdvancedReports → v2: see insights.md
- [x] `POST /reports/advanced/templates` → appHandler.AdvancedReportTemplateCreate → v2: see insights.md
- [x] `POST /reports/advanced/runs` → appHandler.AdvancedReportRunCreate → v2: see insights.md
- [x] `POST /reports/advanced/schedules` → appHandler.AdvancedReportScheduleCreate → v2: see insights.md
- [x] `GET /reports/advanced/artifacts/{id}` → appHandler.AdvancedReportArtifact → v2: see insights.md
- [x] `GET /reports/deep-dive` → appHandler.ReportsDeepDiveIndex → v2: see insights.md
- [x] `GET /reports/deep-dive/calendar` → appHandler.ReportsDeepDiveCalendar → v2: see insights.md
- [x] `GET /reports/deep-dive/contribution` → appHandler.ReportsDeepDiveContribution → v2: see insights.md
- [x] `GET /reports/deep-dive/currency` → appHandler.ReportsDeepDiveCurrency → v2: see insights.md
- [x] `GET /reports/deep-dive/notes` → appHandler.ReportsDeepDiveNotes → v2: see insights.md
- [x] `GET /reports/deep-dive/sectors` → appHandler.ReportsDeepDiveSectors → v2: see insights.md
- [x] `GET /reports/deep-dive/scorecard` → appHandler.ReportsDeepDiveScorecard → v2: see insights.md
- [x] `GET /reports/deep-dive/volatility` → appHandler.ReportsDeepDiveVolatility → v2: see insights.md
- [x] `GET /reports/deep-dive/winners` → appHandler.ReportsDeepDiveWinners → v2: see insights.md
- [x] `GET /reports/{tab}` → appHandler.Reports → v2: see insights.md

### /tax (16)

- [x] `GET /tax` → appHandler.Tax → v2: see money.md
- [x] `GET /tax/filing` → appHandler.TaxFiling → v2: see money.md
- [x] `POST /tax/profile` → appHandler.TaxProfileSave → v2: see money.md
- [x] `POST /tax/instruments/{id}/market-admission` → appHandler.TaxInstrumentMarketAdmissionSave → v2: see money.md
- [x] `POST /tax/instruments/{id}/fund-classification` → appHandler.TaxInstrumentFundClassificationSave → v2: see money.md
- [x] `POST /tax/funds/annual-inputs` → appHandler.TaxFundAnnualInputSave → v2: see money.md
- [x] `POST /tax/scenarios` → appHandler.TaxScenarioCreate → v2: see money.md
- [x] `POST /tax/action-plans` → appHandler.TaxActionPlanCreate → v2: see money.md
- [x] `POST /tax/opportunities/{id}/dismiss` → appHandler.TaxOpportunityDismiss → v2: see money.md
- [x] `POST /tax/opportunities/{id}/restore` → appHandler.TaxOpportunityRestore → v2: see money.md
- [x] `POST /tax/location-scenarios` → appHandler.TaxLocationScenarioCreate → v2: see money.md
- [x] `POST /tax/placement-plans` → appHandler.TaxPlacementPlanCreate → v2: see money.md
- [x] `POST /tax/notifications` → appHandler.TaxNotificationsSave → v2: see money.md
- [x] `POST /tax/reports` → appHandler.TaxReportCreate → v2: see money.md
- [x] `GET /tax/reports/{id}/status` → appHandler.TaxReportStatus → v2: see money.md
- [x] `GET /tax/reports/{id}/download` → appHandler.TaxReportDownload → v2: see money.md

### /markets (6)

- [x] `GET /markets` → appHandler.Markets → v2: see insights.md
- [x] `GET /markets/overview` → appHandler.MarketsOverview → v2: see insights.md
- [x] `GET /markets/earnings` → appHandler.MarketsEarnings → v2: see insights.md
- [x] `GET /markets/congress` → appHandler.MarketsCongress → v2: see insights.md
- [x] `GET /markets/sentiment` → appHandler.MarketsSentiment → v2: see insights.md
- [x] `GET /markets/sentiment/board` → appHandler.MarketsSentimentBoard → v2: see insights.md

### /pilots (4)

- [x] `GET /pilots` → appHandler.PilotsBrowse → v2: see settings-admin.md
- [x] `GET /pilots/{slug}` → appHandler.PilotDetail → v2: see settings-admin.md
- [x] `GET /pilots/{slug}/follow` → appHandler.PilotFollowForm → v2: see settings-admin.md
- [x] `POST /pilots/{slug}/follow` → appHandler.PilotFollowCreate → v2: see settings-admin.md

### /pilot-follows (3)

- [x] `GET /pilot-follows/{id}` → appHandler.PilotFollowDetail → v2: see settings-admin.md
- [x] `POST /pilot-follows/{id}/status` → appHandler.PilotFollowStatus → v2: see settings-admin.md
- [x] `POST /pilot-follows/{id}/stop` → appHandler.PilotFollowStop → v2: see settings-admin.md

### /economy (3)

- [x] `GET /economy` → appHandler.Economy → v2: see insights.md
- [x] `GET /economy/news` → appHandler.EconomyNews → v2: see insights.md
- [x] `GET /economy/{section}` → appHandler.Economy → v2: see insights.md

### /crypto (9)

- [x] `GET /crypto/portfolio/holding` → appHandler.CryptoPortfolioHoldingForm → v2: see planning-tools.md
- [x] `GET /crypto/portfolio/holding/{id}` → appHandler.CryptoPortfolioHoldingForm → v2: see planning-tools.md
- [x] `POST /crypto/portfolio/holding` → appHandler.CryptoPortfolioHoldingCreate → v2: see planning-tools.md
- [x] `PUT /crypto/portfolio/holding/{id}` → appHandler.CryptoPortfolioHoldingUpdate → v2: see planning-tools.md
- [x] `DELETE /crypto/portfolio/holding/{id}` → appHandler.CryptoPortfolioHoldingDelete → v2: see planning-tools.md
- [x] `GET /crypto/markets/fragment` → appHandler.CryptoMarketsFragment → v2: see planning-tools.md
- [x] `GET /crypto/coin/{symbol}` → appHandler.CryptoCoin → v2: see planning-tools.md
- [x] `GET /crypto` → appHandler.Crypto → v2: see planning-tools.md
- [x] `GET /crypto/{tab}` → appHandler.Crypto → v2: see planning-tools.md

### /research (6)

- [x] `GET /research` → appHandler.Research → v2: see planning-tools.md
- [x] `POST /research` → appHandler.ResearchSubmit → v2: see planning-tools.md
- [x] `POST /research/{id}/delete` → appHandler.ResearchDelete → v2: see planning-tools.md
- [x] `GET /research/memos/{id}` → appHandler.ResearchMemo → v2: see planning-tools.md
- [x] `POST /research/memos/{id}/bookmark` → appHandler.ResearchMemoBookmark → v2: see planning-tools.md
- [x] `POST /research/memos/{id}/delete` → appHandler.ResearchMemoDelete → v2: see planning-tools.md

### /boards (18)

- [x] `GET /boards` → appHandler.BoardsDirectory → v2: see social.md
- [x] `POST /boards` → appHandler.BoardsCreate → v2: see social.md
- [x] `GET /boards/activity` → appHandler.BoardsActivity → v2: see social.md
- [x] `POST /boards/activity/settings` → appHandler.BoardsActivitySettings → v2: see social.md
- [x] `GET /boards/guidelines` → appHandler.BoardsGuidelines → v2: see social.md
- [x] `POST /boards/guidelines` → appHandler.BoardsGuidelinesAccept → v2: see social.md
- [x] `POST /boards/report` → appHandler.BoardsReport → v2: see social.md
- [x] `POST /boards/block` → appHandler.BoardsBlock → v2: see social.md
- [x] `GET /boards/p/{id}` → appHandler.BoardsPostRedirect → v2: see social.md
- [x] `POST /boards/p/{id}/vote` → appHandler.BoardsVote → v2: see social.md
- [x] `POST /boards/p/{id}/comments` → appHandler.BoardsComment → v2: see social.md
- [x] `POST /boards/p/{id}/delete` → appHandler.BoardsDeletePost → v2: see social.md
- [x] `POST /boards/c/{id}/delete` → appHandler.BoardsDeleteComment → v2: see social.md
- [x] `GET /boards/{slug}` → appHandler.BoardsBoard → v2: see social.md
- [x] `POST /boards/{slug}/delete` → appHandler.BoardsDeleteBoard → v2: see social.md
- [x] `GET /boards/{slug}/submit` → appHandler.BoardsSubmitForm → v2: see social.md
- [x] `POST /boards/{slug}/submit` → appHandler.BoardsSubmit → v2: see social.md
- [x] `GET /boards/{slug}/p/{id}` → appHandler.BoardsPost → v2: see social.md

### /admin (4)

- [x] `GET /admin/community` → appHandler.BoardsAdmin → v2: see settings-admin.md
- [x] `POST /admin/community/sanctions` → appHandler.BoardsAdminSanction → v2: see settings-admin.md
- [x] `POST /admin/community/sanctions/{id}/revoke` → appHandler.BoardsAdminRevoke → v2: see settings-admin.md
- [x] `POST /admin/community/reports/{id}/resolve` → appHandler.BoardsAdminResolve → v2: see settings-admin.md

### /groups (31)

- [x] `GET /groups` → appHandler.GroupsHome → v2: see social.md
- [x] `GET /groups/unread-badge` → appHandler.GroupsUnreadBadge → v2: see social.md
- [x] `GET /groups/rail` → appHandler.GroupsRail → v2: see social.md
- [x] `GET /groups/events` → appHandler.GroupsEvents → v2: see social.md
- [x] `GET /groups/discover` → appHandler.GroupsDiscover → v2: see social.md
- [x] `GET /groups/new` → appHandler.GroupsNew → v2: see social.md
- [x] `POST /groups/new` → appHandler.GroupsCreate → v2: see social.md
- [x] `GET /groups/join` → appHandler.GroupsJoinLink → v2: see social.md
- [x] `POST /groups/block` → appHandler.GroupsBlock → v2: see social.md
- [x] `POST /groups/invitations/{invitationID}/accept` → appHandler.GroupsAcceptInvitation → v2: see social.md
- [x] `POST /groups/invitations/{invitationID}/decline` → appHandler.GroupsDeclineInvitation → v2: see social.md
- [x] `POST /groups/m/{messageID}/delete` → appHandler.GroupsDeleteMessage → v2: see social.md
- [x] `POST /groups/m/{messageID}/report` → appHandler.GroupsReportMessage → v2: see social.md
- [x] `GET /groups/{groupID}` → appHandler.GroupsOpen → v2: see social.md
- [x] `POST /groups/{groupID}/join` → appHandler.GroupsJoin → v2: see social.md
- [x] `GET /groups/{groupID}/c/{channelID}` → appHandler.GroupsChat → v2: see social.md
- [x] `GET /groups/{groupID}/c/{channelID}/panel` → appHandler.GroupsChannelPanel → v2: see social.md
- [x] `GET /groups/{groupID}/c/{channelID}/messages` → appHandler.GroupsMessages → v2: see social.md
- [x] `POST /groups/{groupID}/c/{channelID}/messages` → appHandler.GroupsSend → v2: see social.md
- [x] `POST /groups/{groupID}/c/{channelID}/read` → appHandler.GroupsMarkRead → v2: see social.md
- [x] `GET /groups/{groupID}/settings` → appHandler.GroupsSettings → v2: see social.md
- [x] `POST /groups/{groupID}/notifications` → appHandler.GroupsNotifications → v2: see social.md
- [x] `POST /groups/{groupID}/edit` → appHandler.GroupsEdit → v2: see social.md
- [x] `POST /groups/{groupID}/invitations` → appHandler.GroupsInviteFriends → v2: see social.md
- [x] `POST /groups/{groupID}/invites` → appHandler.GroupsCreateInvite → v2: see social.md
- [x] `POST /groups/{groupID}/invites/{inviteID}/revoke` → appHandler.GroupsRevokeInvite → v2: see social.md
- [x] `POST /groups/{groupID}/channels` → appHandler.GroupsCreateChannel → v2: see social.md
- [x] `POST /groups/{groupID}/channels/{channelID}/delete` → appHandler.GroupsDeleteChannel → v2: see social.md
- [x] `POST /groups/{groupID}/members/{userID}/{action}` → appHandler.GroupsMember → v2: see social.md
- [x] `POST /groups/{groupID}/leave` → appHandler.GroupsLeave → v2: see social.md
- [x] `POST /groups/{groupID}/delete` → appHandler.GroupsDelete → v2: see social.md

### /ai-consent (2)

- [x] `GET /ai-consent` → appHandler.AIConsentPage → v2: see docs/parity/auth-onboarding.md
- [x] `POST /ai-consent` → appHandler.AIConsentGrant → v2: see docs/parity/auth-onboarding.md

### /billing (4)

- [x] `POST /billing/restore` → appHandler.BillingRestore → v2: see settings-admin.md
- [x] `POST /billing/coupons/redeem` → appHandler.BillingCouponRedeem → v2: see settings-admin.md
- [x] `GET /billing/manage` → appHandler.BillingManage → v2: see settings-admin.md
- [x] `GET /billing/checkout` → appHandler.BillingCheckout → v2: see settings-admin.md

### /logout (1)

- [x] `POST /logout` → authHandler.Logout → v2: see (foundation: src/routes/logout)

### /terminal (13)

- [x] `GET /terminal` → h.Terminal → v2: see planning-tools.md
- [x] `PATCH /terminal/positions/{id}` → h.TerminalPositionUpdate → v2: see planning-tools.md
- [x] `POST /terminal/positions` → h.TerminalPositionCreate → v2: see planning-tools.md
- [x] `DELETE /terminal/positions/{id}` → h.TerminalPositionDelete → v2: see planning-tools.md
- [x] `POST /terminal/positions/{id}/duplicate` → h.TerminalPositionDuplicate → v2: see planning-tools.md
- [x] `POST /terminal/positions/{id}/move` → h.TerminalPositionMove → v2: see planning-tools.md
- [x] `POST /terminal/positions/{id}/ai/facts` → h.TerminalAIFacts → v2: see planning-tools.md
- [x] `POST /terminal/positions/{id}/ai/scenario` → h.TerminalAIScenario → v2: see planning-tools.md
- [x] `POST /terminal/sample/dismiss` → h.TerminalSampleDismiss → v2: see planning-tools.md
- [x] `POST /terminal/autobuys` → h.TerminalAutobuyCreate → v2: see planning-tools.md
- [x] `PATCH /terminal/autobuys/{id}` → h.TerminalAutobuyUpdate → v2: see planning-tools.md
- [x] `POST /terminal/autobuys/{id}/active` → h.TerminalAutobuyActive → v2: see planning-tools.md
- [x] `DELETE /terminal/autobuys/{id}` → h.TerminalAutobuyDelete → v2: see planning-tools.md

### /friends (18)

- [x] `GET /friends` → h.Friends → v2: see social.md
- [x] `GET /friends/search` → h.FriendsSearch → v2: see social.md
- [x] `POST /friends/requests` → h.FriendRequestSend → v2: see social.md
- [x] `POST /friends/requests/{id}/accept` → h.FriendRequestAccept → v2: see social.md
- [x] `POST /friends/requests/{id}/decline` → h.FriendRequestDecline → v2: see social.md
- [x] `POST /friends/requests/{id}/cancel` → h.FriendRequestCancel → v2: see social.md
- [x] `GET /friends/invite` → h.FriendsInvite → v2: see social.md
- [x] `POST /friends/invite/{code}/accept` → h.FriendsInviteAccept → v2: see social.md
- [x] `GET /friends/u/{userId}` → h.FriendProfile → v2: see social.md
- [x] `POST /friends/u/{userId}/unfriend` → h.FriendRemove → v2: see social.md
- [x] `POST /friends/u/{userId}/block` → h.FriendBlock → v2: see social.md
- [x] `POST /friends/u/{userId}/report` → h.FriendReport → v2: see social.md
- [x] `POST /friends/x/start` → h.FriendsXStart → v2: see social.md
- [x] `GET /friends/x/callback` → h.FriendsXCallback → v2: see social.md
- [x] `POST /friends/facebook/start` → h.FriendsFacebookStart → v2: see social.md
- [x] `GET /friends/facebook/callback` → h.FriendsFacebookCallback → v2: see social.md
- [x] `POST /friends/facebook/disconnect` → h.FriendsFacebookDisconnect → v2: see social.md
- [x] `GET /friends/leaderboard` → h.Leaderboard → v2: see social.md

### /xp (3)

- [x] `GET /xp` → h.XPHistory → v2: see dashboard.md
- [x] `GET /xp/card` → h.XPCard → v2: see social.md
- [x] `POST /xp/check-in` → h.XPCheckIn → v2: see social.md

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
