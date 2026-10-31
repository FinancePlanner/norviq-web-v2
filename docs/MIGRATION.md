# norviq-web → norviq-web-v2 (SvelteKit) migration

**Goal:** a 1:1 feature port of `../norviq-web` (Go + chi + templ + HTMX + Alpine)
to SvelteKit 3 / Svelte 5, hosted on Cloudflare Workers. Same URLs, same
behaviour, same look. **Not a redesign.** Where the Go web does something odd,
port the oddity and leave a note; don't fix product behaviour in passing.

Source of truth for "done": `docs/parity/ROUTES.md` (all 500 Go routes) and
the domain checklists in `docs/parity/<domain>.md`.

## Stack (and SvelteKit 3 gotchas — read these)

- SvelteKit **3.1**, Svelte **5** (runes only), Vite 8, Tailwind v4, bun.
- **No `$lib`.** Shared code is imported through package subpath imports with an
  **explicit `.js` extension**: `import { api } from '#lib/server/api.js'`,
  `'#lib/i18n/context.svelte.js'`, `'#lib/components/ui/button/index.js'`.
  `.svelte` files keep `.svelte`. `scripts/fix-lib-imports.py` normalises
  extension-less imports if you slip.
- `$app/environment` is now **`$app/env`** (`browser`, `dev`, `building`).
- Env vars: declared in `src/env.ts` (`defineEnvVars`), read from
  `$app/env/private`. Never read them directly — use `config()` in
  `#lib/server/env.js`. Adding a var = add it to `src/env.ts` + `.env.example`.
- Hook types come from `@sveltejs/kit/hooks`. `handleError` input has `kind`.
- Experimental `async` components and remote functions are enabled; prefer
  plain `load` + form actions unless they clearly simplify things.
- `bun run check` (svelte-check) must be **0 errors, 0 warnings** and
  `bun run build` must pass before you report done.

## Architecture

**Backend-for-frontend, same as the Go web.** The browser never holds a backend
token.

- Session: `#lib/server/session.js` — AES-GCM sealed httpOnly cookie
  (`nq_session`), replaces scs. `locals.session.auth` holds tokens;
  `locals.session.get/set/remove(flag)` holds the same per-session flags the Go
  web kept in scs (use the **same key names** as `internal/session`).
- Backend calls from server code: `api(event)` (typed openapi-fetch client
  generated from `norviq-backend/.../openapi.yaml` into `src/lib/api/schema.d.ts`)
  or `apiJSON(event, method, path, body?, {auth, query})` — the port of Go's
  `Service.DoJSON`. `auth: 'public'` = `PUBLIC_API_TOKEN` (public pages),
  `'none'` = no token. Errors throw `APIError {status, reason, code}`.
  **The spec drifts from reality.** The Go web hand-writes many clients in
  `internal/api/*.go` for that reason. When the Go code calls an endpoint by
  hand or uses a different shape than the spec, **follow the Go code**
  (`apiJSON` + a local TS type), not the spec.
- Browser-side data (polling, infinite lists, live charts, optimistic UI):
  TanStack Query calling the same-origin proxy **`/api/v1/...`**, which attaches
  the session bearer (`src/routes/api/[...path]/+server.ts`).
- Mutations: SvelteKit **form actions** with `use:enhance` (progressive
  enhancement, like the Go forms), or `fetch('/api/v1/…')` from a component when
  the Go version was an `hx-post` that only swapped a fragment.
- Route groups (guards live in `hooks.server.ts`, keyed on `route.id`, so they
  cover pages, actions and `+server` endpoints):
  - `src/routes/(public)/…` — no auth (landing, legal, `/s`, `/p`, `/brief`, articles…)
  - `src/routes/(guest)/…` — RedirectIfAuthenticated (login, signup, reset…)
  - `src/routes/(onboarding)/…` — RequireAuth only (onboarding, `/oauth/consent`)
  - `src/routes/(app)/…` — RequireAuth + onboarding gate + `AppShell`
  - Routes outside any group (e.g. `/logout`, `/api`, `/auth/oauth/.../callback`)
    do their own checks.
- `(app)/+layout.server.ts` provides `username, email, isPro, billingUnknown,
trialExpired, features (key→bool), social, articles, sidebarItems` to every
  page via `data` / `page.data`.
- Pro/feature gates: `await requireFeature(event, Feature.X, 'Display name')`
  from `#lib/server/guards.js` in the page's `load` → 402 → `(app)/+error.svelte`
  renders the Pro gate inside the shell (= Go `RequireFeature`). Inline
  previews: `ProGate variant="overlay"`.
- Social / groups / leaderboards / articles flags → `data.social`, `data.articles`;
  when the Go route 404s on a flag, `error(404)` the same way.

### Mapping HTMX/Alpine idioms

| Go web                                                            | v2                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| full page `GET /x` (templ page)                                   | `src/routes/(group)/x/+page.svelte` + `+page.server.ts` load, **same URL**                                                                                                                                                                                        |
| `hx-get` fragment route (partial)                                 | Svelte component; data from the page load, or TanStack Query on `/api/v1/...`, or a `+server.ts` JSON endpoint **only** if the Go handler aggregated several backend calls server-side. Fragment URLs need not survive; mark them in ROUTES.md as `→ component X` |
| `hx-post` form                                                    | form action (`?/name`) on the page, or `+server.ts` at the **same path** when the URL is posted to from elsewhere                                                                                                                                                 |
| `hx-trigger="every Ns"`                                           | `createQuery({ refetchInterval })`                                                                                                                                                                                                                                |
| `hx-boost`                                                        | native SvelteKit navigation                                                                                                                                                                                                                                       |
| Alpine `x-data` state                                             | `$state` / `$derived` in the component                                                                                                                                                                                                                            |
| templUI dialog/popover/select/tabs/toast JS                       | shadcn-svelte (`#lib/components/ui/*`, bits-ui) styled with the **same Norviq classes**                                                                                                                                                                           |
| `NorviqMotion.staggerReveal / animateValue / flashChange`         | `#lib/motion.js` (Phase 1)                                                                                                                                                                                                                                        |
| ECharts via `echarts-slim.js` + `internal/charts` option builders | `#lib/charts/*` (Phase 1)                                                                                                                                                                                                                                         |
| SSE / streaming (`assistant_stream.go`)                           | `fetch('/api/v1/...')` stream reader in the browser                                                                                                                                                                                                               |
| `i18n.T(ctx, "Text")`                                             | `t('Text')` from `#lib/i18n/context.svelte.js` (components) / `locals.t('Text')` (server). Keep the **exact English id** so pt-PT applies.                                                                                                                        |
| CSRF token fields                                                 | not needed — SvelteKit rejects cross-origin form posts                                                                                                                                                                                                            |
| PostHog capture-once session flag (`posthogCaptureEvent`)         | set the same flag; root layout fires it client-side (Phase 1)                                                                                                                                                                                                     |

## Styling — visual parity

`src/lib/styles/legacy/` is the Go web's CSS, imported verbatim (tokens in
`theme.css`, component classes in `styles.css` + `css/*`). **Copy the markup
and class names from the `.templ` files** so pages render identically. Tailwind
scans `src/`, so utility classes copied from templ work as-is. Static assets
keep their `/static/...` URLs (`static/static/`).

Shared Norviq components (Phase 1) live in `#lib/components/norviq/` — use
them instead of re-porting `internal/pages/components/*.templ` or
`internal/components/*` (templUI). Check that folder's `README.md` for the
mapping templ component → Svelte component.

## Ownership rules (parallel porting)

Each domain agent works in **its own git worktree** on branch `port/<domain>`:

```bash
cd ~/Work/production/apps/norviq/norviq-web-v2
git worktree add ../norviq-web-v2-wt/<domain> -b port/<domain> main
cd ../norviq-web-v2-wt/<domain> && bun install && cp ../../norviq-web-v2/.env .env
```

- Create files only under **your** route paths and `src/lib/features/<domain>/`.
- Shared code (`src/lib/*` outside `features/`, `hooks.server.ts`,
  `app.d.ts`, `src/env.ts`, legacy CSS, `package.json`): **avoid**. If you
  truly need a change, keep it additive (new export / new file), commit it
  separately with message prefix `shared:`, and list it in your report.
  Never reformat or reorganise shared files.
- Don't run `prettier --write .` or any repo-wide formatter.
- Commit often on your branch. **Do not merge, push or rebase onto main** — the
  orchestrator merges.
- Never touch `../norviq-web` (read-only reference), the backend repos, or the
  infra repo.

## Running and verifying

- Staging API: `kubectl -n norviq-staging port-forward svc/api 18080:8080`
  (KUBECONFIG=~/.kube/maat.yaml) — usually already running; check
  `curl -s localhost:18080/health`.
- Dev server: `bun run dev --port <your port> --strictPort` (ports 5201–5220,
  one per agent; 5173/5199 are taken).
- Sign in: open `http://localhost:<port>/__dev/login` (onboarded test user) or
  `/__dev/login?as=onboarding&next=/onboarding` (fresh user). Staging data is
  sparse; create test data through the UI you are porting when needed. These
  are staging-only accounts.
- Side-by-side reference: the Go web can run against the same staging API:
  `cd ../norviq-web && BACKEND_URL=http://localhost:18080 BACKEND_PORT=<port> go run .`
  (needs `GOFLAGS=-mod=mod`; its own login page works with the same test
  credentials from `.env`).
- Before reporting: `bun run check` clean, `bun run build` passes, and every
  page you ported returns 200 signed-in (curl with the dev-login cookie jar is
  fine) and renders without console errors.

## Reporting

Write `docs/parity/<domain>.md`: one line per Go route in your scope —
`[x] GET /path → v2 file` / `[~] partial: why` / `[ ] not done: why`. Then
list: shared files you changed, backend contract gaps (endpoint missing/odd —
**don't work around silently**), and anything you could not verify.
