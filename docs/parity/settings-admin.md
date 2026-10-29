# settings-admin parity

Domain: `/settings`, `/admin`, `/billing`, `/pilots`, `/pilot-follows` (59 Go routes).
v2 lives in `src/routes/(app)/{settings,admin,billing,pilots,pilot-follows}/**` and
`src/lib/features/settings-admin/**`. `(app)` guards (RequireAuth +
onboarding resume) run in `hooks.server.ts`, so they cover `+server.ts` and
form actions too.

Legend: `page` = `+page.server.ts` + `+page.svelte`; `?/x` = form action `x`
on that page; `server` = `+server.ts`.

## /settings (44)

| Go route | v2 |
|---|---|
| `GET /settings` | page `settings/` (LoadSettingsIndexVM) |
| `GET /settings/{section}` | one page per section: `appearance`, `profile`, `badges`, `subscription`, `notifications`, `language`, `feedback`, `about`, `integrations`, `api-access`, `ai-providers`, `news-ticker`, `export`, `banks`. Unknown sections 404 (no route). |
| `POST /settings/show-me-around` | server `settings/show-me-around` (guided-start session keys, 303 → /dashboard) |
| `POST /settings/export` | `settings/export` default action |
| `GET /settings/export/{id}/download` | server `settings/export/[id]/download` (streams the backend file) |
| `POST /settings/api-access` | `settings/api-access?/create` |
| `POST /settings/api-access/{id}/revoke` | `settings/api-access?/revoke` (id in form) |
| `GET /settings/api-access/{id}/verify` | server `settings/api-access/[id]/verify` (JSON, polled by the page) |
| `POST /settings/ai-providers` | `settings/ai-providers?/connect` |
| `POST /settings/ai-consent/revoke` | server `settings/ai-consent/revoke` (303 → ?consent=revoked/error) |
| `POST /settings/ai-providers/{id}/verify` | `settings/ai-providers?/verify` |
| `POST /settings/ai-providers/{id}/disconnect` | `settings/ai-providers?/disconnect` |
| `POST /settings/news-ticker/toggle` | `settings/news-ticker?/toggle` |
| `POST /settings/news-ticker/feeds` | `settings/news-ticker?/addFeed` |
| `POST /settings/news-ticker/feeds/{id}/delete` | `settings/news-ticker?/removeFeed` |
| `GET /settings/banks` | page `settings/banks` (Pro gate: bank_sync) |
| `POST /settings/banks/link-session` | server `settings/banks/link-session` (Plaid link token JSON) |
| `POST /settings/banks/exchange` | server `settings/banks/exchange` |
| `GET /settings/banks/institutions` | server `settings/banks/institutions` (EU picker JSON) |
| `POST /settings/banks/connect-eu` | `settings/banks?/connectEU` (303 to the hosted bank URL after validation) |
| `POST /settings/banks/{id}/sync` | `settings/banks?/sync` |
| `POST /settings/banks/{id}/disconnect` | `settings/banks?/disconnect` |
| `POST /settings/banks/transactions/{id}/import` | `settings/banks?/import` |
| `POST /settings/banks/transactions/{id}/dismiss` | `settings/banks?/dismiss` |
| `POST /settings/integrations/telegram` | `settings/integrations?/telegramConnect` |
| `POST /settings/integrations/telegram/disconnect` | `settings/integrations?/telegramDisconnect` |
| `POST /settings/integrations/telegram/alerts` | `settings/integrations?/telegramAlerts` |
| `POST /settings/integrations/ibkr/connect` | `settings/integrations?/ibkrConnect` |
| `GET /settings/integrations/ibkr/callback` | page `settings/integrations/ibkr/callback` (load-only, 303 back to integrations) |
| `POST /settings/integrations/ibkr/sync` | `settings/integrations?/ibkrSync` |
| `POST /settings/integrations/ibkr/disconnect` | `settings/integrations?/ibkrDisconnect` |
| `GET /settings/profile/oauth/{provider}/connect` | server `settings/profile/oauth/[provider]/connect` (link-start, session keys, 303 to provider) |
| `POST /settings/language` | `settings/language` default action |
| `POST /settings/profile` | `settings/profile?/save` |
| `POST /settings/profile/delete` | `settings/profile?/delete` |
| `POST /settings/passkey/register/begin` | server `settings/passkey/register/begin` |
| `POST /settings/passkey/register/finish` | server `settings/passkey/register/finish` |
| `POST /settings/notifications/earnings` | `settings/notifications?/earnings` |
| `POST /settings/feedback` | `settings/feedback` default action |
| `GET /settings/subscription/status` | dropped: the htmx `#billing-status` fragment is replaced by `invalidateAll()` re-running the subscription load (`billing-client.ts`, page `onRestore`) |
| `GET /settings/friends-privacy` | page `settings/friends-privacy` |
| `POST /settings/friends-privacy` | `settings/friends-privacy` default action |
| `GET /settings/blocked` | page `settings/blocked` |
| `POST /settings/blocked/{userId}/unblock` | `settings/blocked?/unblock` |

The client half of `auth.js` passkey registration is ported locally as
`src/lib/features/settings-admin/passkey-register.ts`
(`registerPasskey()`). auth-onboarding has its own
`src/lib/features/auth-onboarding/passkey.ts`, so dedupe when merging.

## /admin (4)

| Go route | v2 |
|---|---|
| `GET /admin/community` | page `admin/community`. Backend 403 on sanctions → 404, as in Go |
| `POST /admin/community/sanctions` | `admin/community?/sanction` |
| `POST /admin/community/sanctions/{id}/revoke` | `admin/community?/revoke` |
| `POST /admin/community/reports/{id}/resolve` | `admin/community?/resolve` |

## /billing (4)

| Go route | v2 |
|---|---|
| `POST /billing/restore` | server `billing/restore`, JSON branch only (`{isPremium, plan}` / `{error}` 502). The htmx fragment branch is covered by `invalidateAll()` |
| `POST /billing/coupons/redeem` | `settings/subscription?/redeem` (success 303 → `?upgraded=1`, as Go's HX-Redirect; failure fills `#coupon-result`). The non-htmx HTML-fragment branch was not ported because nothing posts to it outside the subscription page |
| `GET /billing/manage` | server `billing/manage` (303 to an allowlisted HTTPS portal, else `?manage_error=1`) |
| `GET /billing/checkout` | server `billing/checkout` (RevenueCat web key set → /settings/subscription, else App Store) |

## /pilots (4) and /pilot-follows (3)

Gate: the backend 404s every pilots route while `PILOTS_ENABLED` is off, so
`GET /v1/pilots` is the probe (`pilots/gate.server.ts`).

| Go route | v2 |
|---|---|
| `GET /pilots` | page `pilots` |
| `GET /pilots/{slug}` | page `pilots/[slug]` (unknown slug → 404) |
| `GET /pilots/{slug}/follow` | page `pilots/[slug]/follow` |
| `POST /pilots/{slug}/follow` | `pilots/[slug]/follow` default action |
| `GET /pilot-follows/{id}` | page `pilot-follows/[id]` |
| `POST /pilot-follows/{id}/status` | `pilot-follows/[id]?/status` |
| `POST /pilot-follows/{id}/stop` | `pilot-follows/[id]?/stop` |

## SvelteKit 3 note

`redirect()` throws `redirect_external_not_allowed` for off-site targets
unless it gets `{ external: true }` or an allowlist. The four off-site
redirects here (App Store, billing portal, OAuth consent, EU bank hosted
link) pass `{ external: true }`. The URL is validated first, the same way Go
validates it.

## Backend / staging gaps (not faked)

- `POST /v1/billing/restore` returns 502 "RevenueCat subscriber lookup failed
  with status 403" and `/v1/billing/management-url` returns 502 "... status 404"
  for the staging test user, so `/billing/manage` lands on `?manage_error=1`.
- Staging has neither Plaid (`Bank provider plaid is not configured.`) nor
  Telegram (`Telegram is not configured.`), so those flows end on their error
  branches.
