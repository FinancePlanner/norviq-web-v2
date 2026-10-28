# Domain porting playbook

Placeholders ({{DOMAIN}}, {{SLUG}}, {{PORT}}, {{PREFIXES}}, {{PAGES}}, {{GROUP}}, {{EXTRA}}) are filled in by the orchestrator in your task message.

You are porting one feature domain of Norviq's web app, "{{DOMAIN}}", as part of a 1:1 migration from `~/Work/production/apps/norviq/norviq-web` (Go + chi + templ + HTMX + Alpine) to `~/Work/production/apps/norviq/norviq-web-v2` (SvelteKit 3, Svelte 5 runes, Tailwind v4, shadcn-svelte, TanStack Query, ECharts, Cloudflare Workers). Other agents are porting the other domains in parallel. The foundation is already built: shell, session/BFF, API client, i18n, the UI kit, charts and formatting.

The goal is parity. Same URLs, same features, same behaviour, same markup and classes, so the legacy CSS renders pages identically. This is not a redesign. Port everything in scope, including the less obvious bits: empty states, error branches, Pro gates, feature-flag 404s, pt-PT strings, loading states, polling, keyboard behaviour and PostHog capture flags.

READ FIRST, in this order:
1. `norviq-web-v2/docs/MIGRATION.md`. It has the SvelteKit 3 gotchas (`#lib/...js` imports with explicit extensions, `$app/env`), the architecture, the HTMX/Alpine → Svelte mapping, styling, ownership rules, and how to run and verify.
2. `norviq-web-v2/src/lib/components/norviq/README.md` (templ → Svelte component map) and `src/lib/charts/README.md`.
3. The foundation modules you will use: `src/lib/server/{api,session,guards,app-context,onboarding}.ts`, `src/lib/{nav,billing,format,timerange}.ts`, `src/routes/(app)/+layout.server.ts`.

Setup:
  cd ~/Work/production/apps/norviq/norviq-web-v2 && git worktree add ../norviq-web-v2-wt/{{SLUG}} -b port/{{SLUG}} main && cd ../norviq-web-v2-wt/{{SLUG}} && bun install && cp ../../norviq-web-v2/.env .env
Your dev server port is {{PORT}}. The staging API port-forward should already be up on localhost:18080 (`curl -s localhost:18080/health`). If it is down, restart it as MIGRATION.md describes.

YOUR SCOPE: every Go route whose path starts with {{PREFIXES}}, listed in `docs/parity/ROUTES.md`. That covers its handlers in `norviq-web/internal/handlers/`, its templ pages in `norviq-web/internal/pages/{{PAGES}}`, its `internal/api/*.go` client code, and any page-specific JS in `norviq-web/internal/server/assets/*.js`.
{{EXTRA}}
Route group: {{GROUP}}.
You own `src/routes/{{GROUP}}/<those paths>/**` and `src/lib/features/{{SLUG}}/**`.

METHOD:
- Start by writing `docs/parity/{{SLUG}}.md`, listing every in-scope Go route and what it maps to in v2. Work through that list.
- For each full page: read the handler (what it fetches, in what order, which errors it tolerates, which flags/gates it checks, what it puts in the session) and the templ (markup and classes). Then write `+page.server.ts` (load + form actions) and `+page.svelte`, using the kit components. Keep page titles, meta and i18n ids identical.
- When the Go code hand-writes an API call or its shapes differ from `src/lib/api/schema.d.ts`, follow the Go code: use `apiJSON` with a local TS type in `src/lib/features/{{SLUG}}/`.
- For HTMX fragments, follow the mapping table in MIGRATION.md. Polling becomes a TanStack Query on `/api/v1/...`. Mutations become form actions with `use:enhance`, or a fetch to `/api/v1/...`.

RULES:
- Do not edit shared files (anything outside your owned paths). If one blocks you, make the smallest additive change in a separate commit prefixed `shared:` and list it in your report. Never reformat shared files or add npm deps without reporting them.
- Never write to `norviq-web`, the backend repos, or the infra repo. Never deploy. Use only the staging test accounts.
- If a backend endpoint the Go web uses is missing or broken on staging, do not fake data. Port the code faithfully, note it under "backend gaps", and move on.
- Commit often on `port/{{SLUG}}`. Do not merge, rebase or push.
- Before you finish: `bun run check` must show 0 errors and 0 warnings in your files (report any pre-existing errors in files you don't own, but don't fix them), and `bun run build` must pass. Every ported GET page must return 200 when signed in via `/__dev/login`, and render its main content with no SSR error in the dev-server log.

REPORT (final message, at most 350 words): the routes done, partial and not done (counts plus the not-done list), shared changes, backend gaps, verification status, and anything the orchestrator must do when merging.

## Kit notes (from Phase 1)

- Components: `#lib/components/norviq/` (README.md has the templ → Svelte table). templUI primitives in `#lib/components/norviq/tui/`, vigil in `norviq/vigil/`. `Icon` takes the Go kebab icon name.
- Forms: `withSpinner()` for `use:enhance` keeps the `.htmx-request` spinner CSS working.
- `PinesSearchField` does not fetch: your page fetches and renders results in its `results` snippet.
- `ChartEmbed` renders Go chart HTML inertly; live charts must use `<EChart>` from `#lib/charts` (see its README).
- Formatting: `#lib/format.js` (Go names: formatCurrency, formatSignedPercent, …). Never hand-roll number/date formatting.
- PostHog capture-once: `setPostHogCaptureOnce(locals, event, props)` from `#lib/analytics/runtime.server.js` wherever Go calls `session.SetPostHogCaptureOnce`.
- Dialogs: native `<dialog>` via `tui/dialog`, `openDialog(id)` replaces `window.tui.dialog`.
- RevenueCat (Go `billing.js`): `billingPage()` attachment from `#lib/billing-client.js`. Same DOM contract as Go (`#subscription-root` data attributes, `[data-action="purchase"]`, `[data-rc-price]`, `#billing-error`). After a purchase it calls `invalidateAll()` instead of the htmx `#billing-status` swap. `POST /billing/restore` (+server.ts) is owned by settings-admin.
- Badges: `NavBadge` fetches its URL and expects JSON `{count}` (e.g. `/groups/unread-badge`), not the Go HTML fragment.
