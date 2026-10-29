# Deliberate deviations from the Go web

v2 is a 1:1 port of `norviq-web` at `ec05890`. These are the places where it
intentionally behaves differently. Each was a Go bug, and the owner approved
keeping the fix on 2026-10-29. Everything else that looks different is a
regression; report it.

| Area | Go behaviour | v2 behaviour | Details |
|---|---|---|---|
| Landing `/` JSON-LD | Serves the literal text `@templ.Raw(StructuredData(vm))` as JSON-LD (templ treats `<script>` content as raw text) | Serves the intended `@graph` from `structuredData()` | public.md |
| `/tax` reports | Generate PDF/CSV buttons are `type="button"` and never submit; htmx drops 4xx responses silently | Buttons submit; failed actions show an error banner | money.md |
| Portfolio Thesis Watch feedback | `hx-vals` mangled by the formatter, so every click is a 400 | Each button sends the signal it names | portfolio.md |
| `/scenarios` | Management panel rendered once per run, which breaks its forms; 422 validation messages dropped | Panel rendered once; 422 messages shown | planning-tools.md |
| `/simulator` | Add/Save nest a whole page inside the result panel | Add/Save re-render the page | planning-tools.md |
| Spreadsheet expense import | Omits `sheets`, `categoryMappings`, `rowOverrides`, `exchangeRates`, `columns`, `sampleValues` when empty, and the backend answers 400 "No such key" | Always sends them | money.md |

## Kept as in Go (looks wrong, is parity)

- `/goals` bulk Pause/Activate buttons never submit (`type="button"`).
- `DELETE /v1/goals/{id}` returns 200 where Go expects 204, so both show "unavailable" after a successful delete (backend gap).
- Dashboard tax panel filters `status == "open"`, which no schema status has, so it is always empty.
- Stock overview price-history and thesis-confidence cards always show their empty state; the compare chart plots only the main symbol; valuation save treats a backend 4xx/5xx as success.
- `/expenses/recurring/{id}` reads the template id from `?id=`, so Edit opens an empty Add form.
- Research memos have no up-front AI consent gate (Go has none); a backend 403 `AI_CONSENT_REQUIRED` shows the consent prompt.

## Architecture differences (not behaviour)

HTMX fragment endpoints became components, streamed load promises or JSON `+server.ts` routes. Each per-domain parity doc maps every fragment.
