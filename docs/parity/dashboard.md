# Parity: dashboard, assistant, goals, notifications, news

Branch `port/dashboard`. Scope: every Go route under `/dashboard`, `/assistant`,
`/goals`, `/notifications`, `/news` (45 routes), plus the page JS they load.

Legend: `[x]` done · `[~]` partial (why) · `[ ]` not done (why).

## /dashboard (26)

- [ ] `GET /dashboard` → `src/routes/(app)/dashboard/+page.{server.ts,svelte}`
- [ ] `GET /dashboard/pulse` → `src/routes/(app)/dashboard/pulse/`
- [ ] `GET /dashboard/action-queue` → component
- [ ] `POST /dashboard/action/{id}/read` → component
- [ ] `GET /dashboard/panel/tax` → component
- [ ] `GET /dashboard/ledger` → component
- [ ] `GET /dashboard/activity-feed` → component
- [ ] `GET /dashboard/search` → component
- [ ] `GET /dashboard/recent-spend` → component
- [ ] `GET /dashboard/economy-pulse` → component
- [ ] `GET /dashboard/news-ticker` → component
- [ ] `GET /dashboard/market-brief` → component
- [ ] `POST /dashboard/quick-expense` → component
- [ ] `GET /dashboard/activity` → `src/routes/(app)/dashboard/activity/`
- [ ] `GET /dashboard/activity-list` → component
- [ ] `GET /dashboard/insights` → `src/routes/(app)/dashboard/insights/`
- [ ] `GET /dashboard/insights/ai` → component
- [ ] `GET /dashboard/why-moved` → component
- [ ] `GET /dashboard/mcp-status` → component
- [ ] `POST /dashboard/insights/goals` → form action
- [ ] `POST /dashboard/insights/goals/{id}/toggle` → form action
- [ ] `GET /dashboard/insights/goals/{id}/edit` → component state
- [ ] `PATCH /dashboard/insights/goals/{id}` → form action
- [ ] `DELETE /dashboard/insights/goals/{id}` → form action
- [ ] `GET /dashboard/insights/focus-points` → component
- [ ] `GET /dashboard/terminal` → component

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

- [ ] `GET /assistant`
- [ ] `POST /assistant/conversations`
- [ ] `GET /assistant/conversations/{id}`
- [ ] `POST /assistant/conversations/{id}/turn`
- [ ] `POST /assistant/conversations/{id}/stream`
- [ ] `POST /assistant/actions/{id}/confirm`
- [ ] `POST /assistant/actions/{id}/cancel`
- [ ] `DELETE /assistant/tips/{id}`

## /notifications (3)

- [x] `GET /notifications` → `src/routes/(app)/notifications/+page.{server.ts,svelte}`
- [x] `POST /notifications/read-all` → `+server.ts` at the same path (plain post, 303 back)
- [x] `POST /notifications/{id}/read` → `+server.ts` at the same path (404 on bad id, 303 back)

## Out of scope but rendered by the same Go files

`wealth_automation.go` / `pages/automation/page.templ` also serve `/forecast`,
`/portfolio/screens` and `/portfolio/rebalancing-rules`. Those prefixes belong to
other domains; only `InboxPage` (notifications) is ported here.

## Shared changes

## Backend gaps

## Not verified
