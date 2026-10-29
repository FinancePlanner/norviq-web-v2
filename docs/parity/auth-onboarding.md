# Auth & onboarding — parity checklist

Scope: Go routes under `/login`, `/signup`, `/forgot-password`, `/reset-password`,
`/mfa`, `/auth/`, `/oauth/`, `/onboarding`, `/guided-start`, `/ai-consent`
(42 routes). Branch `port/auth-onboarding`.

Route groups follow the chi groups in `norviq-web/internal/server/server.go`:
RedirectIfAuthenticated → `(guest)`, RequireAuth → `(onboarding)`,
RequireAuth + RequireOnboardingComplete → `(app)`. The OAuth callback is
registered outside every group in Go, so it is ungrouped here.

## Auth (guest)

- [x] `GET /login` → `(guest)/login/+page.server.ts` load (`?registered=1`, `?error=oauth`, `?mfa=1` / pending challenge opens the MFA modal)
- [x] `POST /login` → `(guest)/login` default action (MFA-required returns the challenge and opens the modal, like the htmx `showMfaModal` trigger)
- [x] `GET /signup` → `(guest)/signup/+page.svelte` (same `LoginPage` component, signup variant)
- [x] `POST /signup` → `(guest)/signup` default action → `/login?registered=1[&next=]`
- [x] `GET /forgot-password` → `(guest)/forgot-password`
- [x] `POST /forgot-password` → default action; the form re-renders in place (was `#forgot-form` outerHTML swap)
- [x] `GET /reset-password` → `(guest)/reset-password`
- [x] `POST /reset-password` → default action
- [x] `POST /reset-password/resend` → `(guest)/reset-password/resend` default action (the "Resend reset code" button posts there with `formaction`; GET redirects to `/reset-password`)
- [x] `GET /mfa` → `(guest)/mfa/+page.server.ts`: 400 without a pending challenge, otherwise redirect to `/login?mfa=1` (the htmx fragment is now the `MfaModal` component)
- [x] `POST /mfa/verify` → `(guest)/mfa/verify` default action (posted from the modal with `use:enhance`)
- [x] `POST /mfa/resend` → `(guest)/mfa/resend` default action
- [x] `GET /auth/oauth/{provider}/start` → `(guest)/auth/oauth/[provider]/start/+server.ts`
- [x] `POST /auth/passkey/begin` → `(guest)/auth/passkey/begin/+server.ts` (JSON proxy)
- [x] `POST /auth/passkey/finish` → `(guest)/auth/passkey/finish/+server.ts` (JSON proxy, saves the session)

## OAuth callback (ungrouped)

- [x] `GET /auth/oauth/{provider}/callback` → `auth/oauth/[provider]/callback/+page.server.ts` load (login + link intents; errors render the sign-in page with the message, as Go did)
- [x] `POST /auth/oauth/{provider}/callback` → same route, default action (Apple `form_post`; needs `csrf.trustedOrigins` for appleid.apple.com, see shared changes)

## MCP OAuth consent (onboarding group: auth, no onboarding gate)

- [x] `GET /oauth/consent` → `(onboarding)/oauth/consent` (renders inside the app shell, like Go `renderShell`)
- [x] `POST /oauth/consent/approve` → `(onboarding)/oauth/consent/approve/+server.ts`
- [x] `POST /oauth/consent/deny` → `(onboarding)/oauth/consent/deny/+server.ts`

## Onboarding funnel (onboarding group)

- [x] `GET /onboarding/questionnaire` → `(onboarding)/onboarding/questionnaire`
- [x] `POST /onboarding/questionnaire` → default action
- [x] `GET /onboarding/paywall` → `(onboarding)/onboarding/paywall` (`billingPage()` attachment, `data-continue-url="/onboarding/paywall/continue"`)
- [x] `POST /onboarding/paywall/continue` → `(onboarding)/onboarding/paywall/continue/+server.ts`
- [x] `GET /onboarding` → `(onboarding)/onboarding/+page.server.ts` (Welcome)
- [x] `GET /onboarding/import` → `(onboarding)/onboarding/import`
- [x] `GET /onboarding/import/csv` → `(onboarding)/onboarding/import/csv`
- [x] `POST /onboarding/import/csv/preview` → `?/preview` action on the CSV page (was an htmx fragment into `#csv-preview`)
- [x] `POST /onboarding/import/csv/commit` → `?/commit` action on the CSV page (the commit button keeps `form="csv-form"` + `formaction`)
- [x] `GET /onboarding/import/manual` → `(onboarding)/onboarding/import/manual`
- [x] `POST /onboarding/import/manual` → default action (`action=add_row` / `continue`)
- [x] `GET /onboarding/budget` → `(onboarding)/onboarding/budget`
- [x] `POST /onboarding/budget` → default action
- [x] `GET /onboarding/done` → `(onboarding)/onboarding/done`
- [x] `POST /onboarding/skip` → `(onboarding)/onboarding/skip/+server.ts` (posted from several pages)
- [x] `POST /onboarding/complete` → `(onboarding)/onboarding/complete/+server.ts`

## Guided start (app group)

- [x] `GET /guided-start/start` → `(app)/guided-start/start/+server.ts` (redirect)
- [x] `GET /guided-start/poll` → `(app)/guided-start/poll/+server.ts` → JSON `{state, outcome?}`; the step layer polls it with the same 1/2/4/8/10s backoff
- [x] `POST /guided-start/skip` → `(app)/guided-start/skip/+server.ts` → JSON outcome
- [x] `POST /guided-start/dismiss` → `(app)/guided-start/dismiss/+server.ts` → JSON `{ok, card?}`
- Components: `GuidedStartCard` (dashboard card) and `GuidedStepLayer` (the
  `WithStepLayer` overlay + `guided-start.js` spotlight) in
  `src/lib/features/auth-onboarding/guided-start/`. Server helpers
  `guidedCardVM()` and `guidedStepLayer()` build their props.

## AI consent (app group)

- [x] `GET /ai-consent` → `(app)/ai-consent` (`AIConsentPage` kit component)
- [x] `POST /ai-consent` → default action (502 + page on failure, as Go)

## Client code

- `internal/server/assets/auth.js` → `src/lib/features/auth-onboarding/passkey.ts`
  (`signInWithPasskey`, `registerPasskey`, WebAuthn (de)serialisers) and the
  `passkeyButton()` attachment. Google / Apple / X sign-in are plain links to
  `/auth/oauth/{provider}/start` (no client SDK in Go either).
- `internal/server/assets/guided-start.js` → `GuidedStepLayer.svelte`.

## Shared changes

- `vite.config.ts`: `csrf.trustedOrigins: ['https://appleid.apple.com']` (Apple
  `form_post` to the callback; Go exempted `/auth/oauth/*/callback` from nosurf).
- `src/routes/(app)/+layout.server.ts` / `+layout.svelte`: `guidedStep` from
  `guidedStepLayer(event)` and `<GuidedStepLayer>` after the page (Go
  `renderShell` → `withGuidedStepLayer`).
- `docs/parity/ROUTES.md`: ticked the 42 rows.

## For other domains

- Dashboard: render `GuidedStartCard` with `vm = await loadGuidedCard(event)`
  (`guided-start/guided.server.js`) where Go rendered `guidedstart.Card`.
- Settings: `POST /settings/show-me-around` should call
  `patchOnboardingProgress(event, {guidedStartDismissed:false})`,
  `setGuidedShowCompleted` (when all done), `setGuidedPendingSource(event,'settings')`
  and capture `guided_start_reopened`. Passkey registration: `registerPasskey()` /
  `passkeyRegisterButton(onFeedback)` in `passkey.ts`.
- Portfolio / expenses / goals: call `noteGuidedAction(event, step)` where Go called
  `session.NoteGuidedAction`, and keep the `data-guide` targets.
- `SubscriptionPlanCards.svelte` + `subscriptionPlanOptionVMs()` are a local copy of
  the settings subscription cards; merge with the settings port.

## Deviations

- `POST /onboarding/budget` error: Go answered a native post with the bare
  `BudgetForm` fragment; v2 re-renders the whole page with the banner.
- htmx fragments (`/mfa`, `/guided-start/poll|skip|dismiss`, CSV preview) are
  components; poll/skip/dismiss answer JSON.
- Signup email check approximates Go `net/mail.ParseAddress`.

## Verification (dev server :5203, staging API)

- All GET pages 200 signed in (completed account and fresh account) or redirect
  exactly as the Go guards do; no SSR errors in the dev log.
- Exercised end to end on a new account created through `/signup`
  (`port_ao_*@norviq-staging.invalid`): signup → login → questionnaire → paywall →
  continue → welcome → import → CSV preview + commit → manual (add_row, validation) →
  budget (error + save) → done → complete → dashboard → logout.
- Not exercisable locally: OAuth start (backend rejects the localhost redirect URI,
  same as Go would; falls back to `/login?error=oauth`), passkey (backend says not
  enabled), MFA (no MFA account), `POST /ai-consent` (deliberately not run: granting
  consent on staging accounts is the user's call), MCP consent approve/deny (no flow).
