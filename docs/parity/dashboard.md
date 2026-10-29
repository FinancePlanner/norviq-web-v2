# Parity: dashboard, assistant, goals, notifications, news

Branch `port/dashboard`. Scope: every Go route under `/dashboard`, `/assistant`,
`/goals`, `/notifications`, `/news` (45 routes), plus the page JS they load.

Legend: `[x]` done · `[~]` partial (why) · `[ ]` not done (why).

## /dashboard (26)

- [~] `GET /dashboard` → `src/routes/(app)/dashboard/+page.{server.ts,svelte}` (guided-start card and friends XP card omitted: they belong to the /guided-start and /xp domains)
- [x] `GET /dashboard/pulse` → `src/routes/(app)/dashboard/pulse/` (charts via `#lib/charts`; replaces `dashboard-charts.js`)
- [x] `GET /dashboard/action-queue` → `ActionQueuePanel` + JSON `+server.ts` at the same path
- [x] `POST /dashboard/action/{id}/read` → `+server.ts` (404 on bad id, returns the refreshed queue)
- [x] `GET /dashboard/panel/tax` → `TaxPanel`, streamed from the page load (Go filters `status == "open"`, which no schema status matches, so the list is always empty; kept)
- [x] `GET /dashboard/ledger` → `LedgerPanel` + JSON `+server.ts` for the domain chips
- [x] `GET /dashboard/activity-feed` → `ActivityPanel` from the command-center load
- [x] `GET /dashboard/search` → `AssetSearch` (TanStack) + JSON `+server.ts`
- [x] `GET /dashboard/recent-spend` → `RecentSpendCard` from the command-center load
- [x] `GET /dashboard/economy-pulse` → `EconomyPulseCard`, streamed from the pulse load
- [x] `GET /dashboard/news-ticker` → `NewsTickerShell` (TanStack via `/api/v1/news/ticker`, every 300 s)
- [x] `GET /dashboard/market-brief` → `MarketBriefShell` (TanStack, every 900 s) + JSON `+server.ts`; `market-brief/*` reusable by `/market-brief` and `/brief`
- [x] `POST /dashboard/quick-expense` → `QuickExpenseModal` + `+server.ts` (204 / `{error}`); replaces `quick-expense.js`
- [x] `GET /dashboard/activity` → `src/routes/(app)/dashboard/activity/` (`?limit=` honoured, clamped 20–100; filter select inert as in Go)
- [x] `GET /dashboard/activity-list` → `ActivityListSection` "Load more" (fetches `/api/v1/activities?limit=N`)
- [x] `GET /dashboard/insights` → `src/routes/(app)/dashboard/insights/`
- [~] `GET /dashboard/insights/ai` → streamed `ai` promise in the insights load + `AIInsightsSection` (no-consent path verified; consented path unverified, see below)
- [x] `GET /dashboard/why-moved` → `WhyMovedStrip`, streamed from the pulse load
- [x] `GET /dashboard/mcp-status` → `MCPStatusWidget`, streamed from the page load
- [x] `POST /dashboard/insights/goals` → `?/create`
- [x] `POST /dashboard/insights/goals/{id}/toggle` → `?/toggle`
- [x] `GET /dashboard/insights/goals/{id}/edit` → `FocusPointsSection` edit state (`FocusPointEditForm`)
- [x] `PATCH /dashboard/insights/goals/{id}` → `?/update`
- [x] `DELETE /dashboard/insights/goals/{id}` → `?/delete` (confirm() = hx-confirm)
- [x] `GET /dashboard/insights/focus-points` → `FocusPointsSection` (actions return fresh points; Cancel just leaves edit mode)
- [x] `GET /dashboard/terminal` → `TerminalSummaryCard`, streamed from the page load

## /goals (7)

- [x] `GET /goals` → `src/routes/(app)/goals/+page.{server.ts,svelte}`
- [x] `POST /goals` → form action `?/create`
- [~] `POST /goals/bulk` → form action `?/bulk` (Go's Pause/Activate buttons are `type="button"`, so they never submit; ported as-is)
- [x] `POST /goals/{id}/what-if` → form action `?/whatIf`, result rendered in `#what-if-result`
- [x] `POST /goals/{id}/contributions` → `+server.ts` at the same path (no Go page posts to it)
- [x] `POST /goals/{id}/suggestions/{suggestionID}/accept` → form action `?/accept`
- [x] `GET /goals/{id}/report.pdf` → `+server.ts`; fpdf subset ported to `features/dashboard/goals/pdf.ts` (no npm dep; WinAnsi text, so `·`/`•`/`—` no longer print as mojibake)

## /news (1)

- [x] `GET /news/view` → `src/routes/(app)/news/view/+server.ts` (records view, 302 to canonicalised external URL)

## /assistant (8)

- [x] `GET /assistant` → `src/routes/(app)/assistant/` (AIInsights feature gate + AI consent gate → `AIConsentPage`)
- [x] `POST /assistant/conversations` → form action, 303 to `/assistant?conversation=`
- [x] `GET /assistant/conversations/{id}` → `+server.ts` (303 to `/assistant?conversation=`)
- [x] `POST /assistant/conversations/{id}/turn` → `+server.ts`
- [x] `POST /assistant/conversations/{id}/stream` → `+server.ts` relaying `upstream.body` unbuffered; consent 403 → JSON with consent URL
- [x] `POST /assistant/actions/{id}/confirm` → `+server.ts`
- [x] `POST /assistant/actions/{id}/cancel` → `+server.ts`
- [x] `DELETE /assistant/tips/{id}` → `+server.ts`

## /notifications (3)

- [x] `GET /notifications` → `src/routes/(app)/notifications/+page.{server.ts,svelte}`
- [x] `POST /notifications/read-all` → `+server.ts` at the same path (plain post, 303 back)
- [x] `POST /notifications/{id}/read` → `+server.ts` at the same path (404 on bad id, 303 back)

## Out of scope but rendered by the same Go files

`wealth_automation.go` / `pages/automation/page.templ` also serve `/forecast`,
`/portfolio/screens` and `/portfolio/rebalancing-rules`. Those prefixes belong to
other domains; only `InboxPage` (notifications) is ported here.

## Shared changes

None. `src/routes/api/[...path]/+server.ts` already returns `new Response(upstream.body)`, so SSE passes through unbuffered; the assistant streams through its own route the same way.

## Backend gaps

- `DELETE /v1/goals/{id}` answers 200 on staging; the spec and Go expect 204, so Go (and this faithful port) shows "Focus points unavailable right now." after a delete that did succeed.

## Not verified

- Assistant with AI consent granted (workspace, turns, SSE stream, action confirm/cancel, tip dismiss). Granting consent on the staging test account was not permitted; only the feature gate and consent-page paths were checked.
- `/dashboard` market brief against a real brief in the normal dev setup: `PUBLIC_API_TOKEN` is not in the dev `.env`, so the card renders nothing. Checked once with a temporary token.
- Browser rendering, hydration and console of `/dashboard` and `/dashboard/pulse` (charts, quick-expense modal, action Done, ledger chips, search). No browser was connected; checked through SSR HTML and the JSON endpoints with curl.

- `/dashboard/insights/ai` with AI consent granted (the three cards). The staging test account has no consent and granting it was not permitted; only the consent-card path was checked.
- Client-side behaviour of activity "Load more", focus-point edit/delete UI and the hydrated AI consent card: no browser was available; the actions and the proxy endpoints were exercised with curl.
