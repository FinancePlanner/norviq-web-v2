# Money domain parity (expenses, financing, tax)

Branch `port/money`. Routes `src/routes/(app)/{expenses,tax}/**`, code `src/lib/features/money/**`.
`[x]` done · `[~]` partial · `[ ]` not done.

## /expenses — planner and modal fragments

Go loaded each modal form into `#expense-action-panel` with `hx-get`. In v2, every fragment URL is a
route with its own `load`, actions, and a `+page.svelte` that renders the panel, so direct navigation
still works. The planner opens a panel with `preloadData(url)` and renders the panel component
(`features/money/expenses/panels/*`) inside `#expense-action-dialog`. Panel forms post across routes,
and `panelEnhance` reproduces the htmx contract: on failure it re-renders the panel, and on redirect
it closes the dialog and runs `goto` with invalidation.

- [x] GET /expenses → `expenses/+page.server.ts` + `+page.svelte` (planner + command deck)
- [x] GET /expenses/tax-teaser → streamed `taxTeaser` promise in the planner load (`{#await}`), same as `hx-trigger=load`
- [x] POST /expenses/dca-ticker → `/expenses?/dcaTicker`
- [x] POST /expenses/alert-policy → `/expenses?/alertPolicy`
- [x] POST /expenses/reallocation → `/expenses?/reallocation` (Smart suggestions gate)
- [x] POST /expenses/templates → `/expenses?/templates` (gate)
- [x] POST /expenses/templates/{id}/apply → `/expenses?/templateApply` (id sent in `template_id`; gate)
- [x] POST /expenses/suggestions/{id}/dismiss → `/expenses?/dismissSuggestion` (the card is removed locally)
- [x] DELETE /expenses/category/{id} → `/expenses?/deleteCategory` (the planner reload re-renders the list)
- [x] GET/POST /expenses/record → `expenses/record/` (`?recurring=` needs Pro: "Recurring expenses")
- [x] GET/POST /expenses/salary → `expenses/salary/` (NoteGuidedAction `set_budget`)
- [x] GET/POST /expenses/partner → `expenses/partner/` (Household partner gate + isPro)
- [x] GET/POST /expenses/plan-item → `expenses/plan-item/`
- [x] GET /expenses/plan-item/{id}, PUT → `?/update`, DELETE → `?/delete` → `expenses/plan-item/[id]/`
- [x] GET/POST /expenses/category → `expenses/category/`
- [x] GET/POST /expenses/recurring → `expenses/recurring/` (Recurring templates gate + isPro)
- [x] GET /expenses/recurring/{id}, PUT → `?/update`, DELETE → `?/delete` → `expenses/recurring/[id]/`. **Ported Go oddity:** the form reads the template id from `?id=`, not from the path, so the Edit link opens an empty Add form.
- [x] DELETE /expenses/{id} → `expenses/[id]/+server.ts`. Returns 204 with an `x-redirect` header, which replaces HX-Redirect.
- [x] POST /expenses/receipt/parse-qr → `expenses/receipt/parse-qr/+server.ts`
- [x] POST /expenses/receipt/ocr → `expenses/receipt/ocr/+server.ts`. Applies the receipt scan and AI consent gates; the multipart `image` field is sent on as `file`.
- [x] GET /expenses/receipt/import → `expenses/receipt/import/`. The planner modal uses `ReceiptImportPanel`.
- [x] POST /expenses/receipt/scan → `/expenses/receipt/import?/scan` (multipart is rebuilt with the Go field names)
- [x] POST /expenses/receipt/commit → `/expenses/receipt/import?/commit`
- [x] GET /expenses/import → `expenses/import/`
- [x] POST /expenses/import/analyze → `/expenses/import?/analyze`
- [x] POST /expenses/import/{sessionID}/preview → `?/preview`. Fixed: empty decision fields are now sent as `[]`/`{}` (see backend gaps).
- [~] POST /expenses/import/{sessionID}/commit → `?/commit`. It builds its request with the same code as preview, but it was not run because it would write expenses to staging.
- [x] DELETE /expenses/import/{sessionID} → `?/discard`
- [x] GET /expenses/financing → `expenses/financing/`
- [x] POST /expenses/financing/simulate → `?/simulate`
- [x] POST /expenses/financing/save → `?/save`
- [x] GET /expenses/year → `expenses/year/` (Year overview gate)
- [x] GET /expenses/categories/{pillar} → `expenses/categories/[pillar]/`
- [x] GET /expenses/bulk → `expenses/bulk/` (Smart suggestions gate)
- [x] POST /expenses/bulk → its default action
- [~] GET /expenses/report.pdf → `expenses/report.pdf/+server.ts`. It uses a small fpdf port in `features/money/pdf/` and adds no npm dependency. A user without Pro gets a bare 402 instead of the Pro page inside the shell. Only a sample PDF was checked, because the staging user has no budget month.

## /tax

- [x] GET /tax → `tax/+page.server.ts` + `+page.svelte`
- [x] GET /tax/filing → `tax/filing/`. The checkout link uses `TAX_PACK_CHECKOUT_URL(S)` via `config()`. Tax pages make no RevenueCat purchase, so `billingPage()` is not used.
- [x] POST /tax/profile → `/tax?/profile`
- [x] POST /tax/instruments/{id}/market-admission → `/tax?/marketAdmission&id=…`
- [x] POST /tax/instruments/{id}/fund-classification → `/tax?/fundClassification&id=…`
- [x] POST /tax/funds/annual-inputs → `/tax?/fundAnnualInputs`
- [x] POST /tax/scenarios → `/tax?/scenarios`
- [x] POST /tax/action-plans → `/tax?/actionPlans`
- [x] POST /tax/opportunities/{id}/dismiss → `/tax?/dismiss&id=…`
- [x] POST /tax/opportunities/{id}/restore → `/tax?/restore&id=…`
- [x] POST /tax/location-scenarios → `/tax?/locationScenarios`
- [x] POST /tax/placement-plans → `/tax?/placementPlans`
- [x] POST /tax/notifications → `/tax?/notifications`
- [x] POST /tax/reports → `/tax?/reports` (`filing_pack_generated` capture-once)
- [~] GET /tax/reports/{id}/status → the report row polls `/api/v1/tax/reports/{id}` every 2 s with TanStack Query. Not tested to completion, because the staging report stayed in `retry`.
- [~] GET /tax/reports/{id}/download → `tax/reports/[id]/download/+server.ts` (streams the file). Untested for the same reason.

Deviations to review in /tax:

- The Generate PDF/CSV buttons are `type="submit"`. Go rendered them as `type="button"`, so they never submitted.
- Failed actions show a banner. On htmx 4xx responses, Go showed nothing.

## Page JS → `src/lib/features/money/`

- `receipt-scan.js` → `receipt-scan.svelte.ts` (`ReceiptScan` class; same DOM ids and hidden `receipt-*` fields)
- `quick-expense.js` → `quick-expense.ts` (`quickExpenseEnhance()`). **Shared:** this is for the dashboard's `#quick-expense-form`, which this branch does not wire.
- `bank-link.js` → `bank-link.svelte.ts` (`BankLink` class). **Shared:** it is only used by `/settings/banks`, which is not ported here. Those routes (`/settings/banks`, `link-session`, `exchange`, `connect-eu`, …) must keep their Go paths, because the Enable Banking redirect URI is `PUBLIC_BASE_URL + "/settings/banks"`. `connect-eu` redirects off-site and needs `redirect(303, url, { external: true })` in whichever port owns it.
- `onboarding/pillars.go` → `pillars.ts`

## Shared files changed

None.

## Backend gaps

- **Spreadsheet import decision (probably also broken in the Go web, not tested there):** StockPlanShared v5.25.0 requires `sheets`, `categoryMappings`, `rowOverrides`, `exchangeRates`, `columns` and `sampleValues`. Go's `decisionFromForm` omits them when they are empty, which gets a 400 `No such key 'categoryMappings'`. v2 now always sends them.
- The staging tax report never left `retry`.
