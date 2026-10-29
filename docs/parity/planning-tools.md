# Planning and trading tools parity

Branch `port/planning-tools`. Routes `src/routes/(app)/{planning,terminal,forecast,scenarios,simulator,chart-builder,crypto,research,trading}/**`,
code `src/lib/features/planning-tools/**`.
`[x]` done · `[~]` partial · `[ ]` not done.

Go gates (server.go): `/chart-builder` Market fundamentals · `/forecast/**` Net worth forecasting ·
`/scenarios/**` Scenario planning · `/crypto/**` Crypto · `/research`, `/research/{id}/delete` Advanced research ·
`/research/memos/**` AI insights (+ AI consent). `/planning/**`, `/simulator/**`, `/trading`, `/terminal/**` are ungated
at the route level.

## /terminal (13)

- [ ] GET /terminal
- [ ] PATCH /terminal/positions/{id}
- [ ] POST /terminal/positions
- [ ] DELETE /terminal/positions/{id}
- [ ] POST /terminal/positions/{id}/duplicate
- [ ] POST /terminal/positions/{id}/move
- [ ] POST /terminal/positions/{id}/ai/facts
- [ ] POST /terminal/positions/{id}/ai/scenario
- [ ] POST /terminal/sample/dismiss
- [ ] POST /terminal/autobuys
- [ ] PATCH /terminal/autobuys/{id}
- [ ] POST /terminal/autobuys/{id}/active
- [ ] DELETE /terminal/autobuys/{id}

## /trading (1)

- [ ] GET /trading

## /chart-builder (1)

- [ ] GET /chart-builder

## /research (6)

- [ ] GET /research
- [ ] POST /research
- [ ] POST /research/{id}/delete
- [ ] GET /research/memos/{id}
- [ ] POST /research/memos/{id}/bookmark
- [ ] POST /research/memos/{id}/delete

## /scenarios (11)

- [ ] GET /scenarios
- [ ] POST /scenarios/runs
- [ ] POST /scenarios/snapshot-review
- [ ] GET /scenarios/runs/{id}
- [ ] DELETE /scenarios/runs/{id}
- [ ] GET /scenarios/runs/{id}/report.pdf
- [ ] POST /scenarios/compare
- [ ] POST /scenarios/configurations/{id}/runs
- [ ] DELETE /scenarios/configurations/{id}
- [ ] POST /scenarios/risk-profiles
- [ ] DELETE /scenarios/risk-profiles/{id}

## /forecast (5)

- [ ] GET /forecast
- [ ] POST /forecast
- [ ] POST /forecast/{id}
- [ ] POST /forecast/{id}/run
- [ ] POST /forecast/{id}/delete

## /crypto (9)

- [ ] GET /crypto/portfolio/holding
- [ ] GET /crypto/portfolio/holding/{id}
- [ ] POST /crypto/portfolio/holding
- [ ] PUT /crypto/portfolio/holding/{id}
- [ ] DELETE /crypto/portfolio/holding/{id}
- [ ] GET /crypto/markets/fragment
- [ ] GET /crypto/coin/{symbol}
- [ ] GET /crypto
- [ ] GET /crypto/{tab}

## /planning (4)

- [ ] GET /planning/grow
- [ ] POST /planning/grow/preview
- [ ] GET /planning/retire
- [ ] POST /planning/retire/preview

## /simulator (3)

- [ ] GET /simulator
- [ ] POST /simulator/preview
- [ ] POST /simulator/save

## Shared files changed

## Backend gaps

## Not verified
