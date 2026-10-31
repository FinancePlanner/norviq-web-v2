# #lib/charts — porting a Go chart

Port of `norviq-web/internal/charts` + `internal/server/assets/{echarts-theme,echarts-loader,echarts-slim,dashboard-charts}.js`.

## How the Go web did it

1. A handler called a builder, e.g. `charts.WealthLine("wealth-chart", labels, values)`,
   and stored the returned `template.HTML` on the view model (`vm.ChartHTML`).
2. The templ page dropped it in with `@templ.Raw(vm.ChartHTML)`, usually inside a
   wrapper such as `.overview-wealth-chart` or `.stock-chart-wrap`.
3. That HTML was `<div class="container"><div class="item" id="wealth_chart" style="width:100%;height:220px">`
   plus a `<script>` pushing an init onto `window.__deferredChartInits`.
4. `dashboard-charts.js` loaded `echarts-slim.js` on idle, ran the inits, then
   re-themed every `.app-page-content .container .item[id]` from the `--chart-*`
   CSS variables, and again on theme change / HTMX swap.

## How v2 does it

Same builder, same arguments, camelCase name; it returns a `ChartSpec | null`
(`null` where Go returned `""`). Render it with `<EChart>`:

```svelte
<script lang="ts">
	import EChart from '#lib/charts/EChart.svelte';
	import { wealthLine } from '#lib/charts/index.js';
	let { data } = $props();
	// Build in the component (or $derived), NOT in +page.server.ts:
	// options can hold formatter functions, which do not serialize.
	const chart = $derived(wealthLine('wealth-chart', data.labels, data.values));
</script>

<div class="overview-wealth-chart">
	{#if chart}<EChart {...chart} />{/if}
</div>
```

Your `load` returns the plain data (labels, values, tiles…); the page builds the spec.

| Go                                                                                           | v2                                                                          |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `charts.SpendingLine / WealthLine / PriceLine`                                               | `spendingLine / wealthLine / priceLine`                                     |
| `charts.AllocationPie`, `SectorGainsBar`, `Sparkline`, `Candlestick`, `SentimentHistoryLine` | same names, camelCase                                                       |
| `charts.MultiSeriesLine / MultiSeriesBar` (`[]*float64`)                                     | `multiSeriesLine / multiSeriesBar` (`(number \| null)[]`)                   |
| `charts.MarketHeatmap(WithOptions)`, `charts.CryptoBubbles`                                  | `marketHeatmap(WithOptions)`, `cryptoBubbles` (struct fields camelCase)     |
| `charts.SpendPillarBar`, `charts.ActivityHeatmap(from, to, counts)`                          | `spendPillarBar`, `activityHeatmap(id, from, to, counts, timeZone?)`        |
| `charts.DonutSVG(slices)`                                                                    | `<DonutSVG {slices} />` (SSR, no JS) — or `donutSVG()` for the exact string |
| `charts.GrowthSparklineSVG(points, tone)`                                                    | `<GrowthSparkline {points} {tone} />` — or `growthSparklineSVG()`           |
| `charts.AllocationColor(i)`                                                                  | `allocationColor(i)`                                                        |
| `@templ.Raw(vm.X)`                                                                           | `{#if spec}<EChart {...spec} />{/if}`                                       |

A hand-built option works too: `<EChart id="my-chart" height="240px" option={…} />`.

### What `<EChart>` does

- SSR: emits only the empty sized `.container > .item#id` (what Go's HTML held
  before its script ran), so nothing shifts when the chart draws.
- Client: lazy-loads the slim ECharts bundle (idle on first page load, at once
  after a navigation), `init(node, null, {renderer:'canvas'})`, `setOption`, then the
  Norviq theme patch (`theme.ts`) — **only inside `.app-page-content`**, which is
  where Go's `refreshCharts()` looked. Force it with `themed={true|false}`.
- Re-themes when `<html>`'s `class` / `data-theme` / `data-brand` change
  (MutationObserver), resizes with its container (ResizeObserver, plus the
  `overviewChartsResize` window event), fades `.overview-wealth-chart`,
  `.stock-chart-wrap`, `.overview-allocation-chart`, `.overview-watchlist-spark`
  wrappers in, and disposes on destroy.
- A new `option` replaces the old one (`notMerge`) and is re-themed.
- `onclick` gets ECharts click params. `cryptoBubbles` sets it to Go's behaviour
  (full navigation to the bubble's `href`); pass your own to override.

### The chart id matters

Theming picks the chart's "kind" from its DOM id (`theme.ts` `chartKind`):
`spark*` = sparkline, `*spending*` / `*expenses-year*` = alt line color,
`*allocation*` / `*donut*` / `*sector*` = allocation. go-echarts builders turn
`-` into `_` (`wealth-chart` → `#wealth_chart`), exactly as Go did, so the legacy
CSS selectors keep matching. Use the same id the Go handler used.

## Deliberate differences from Go

- `title: {}` / `toolbox: {}` (added by go-echarts) and SentimentHistoryLine's
  `markLine` are omitted: the Go slim bundle never registered those components,
  so they drew nothing there and would only log "component not imported" in dev.
- `activityHeatmap` keeps the input order of `counts` (Go iterated a map, so random).
- The chart wrapper carries `style="max-width:none"`: Tailwind v4 generates a
  `.container` utility that the Go CSS did not have.

## Go oddities kept (not fixed)

- `sectorGainsBar` has no category data on its x axis (go-echarts dropped it),
  so bars are labelled 0, 1, 2…
- Every go-echarts chart has `legend: {}`, so single-series lines show a legend.
- The theme patch runs on the _current_ (already patched) option, so after a
  light/dark toggle a red (down) line whose `--chart-down` resolves to a non-hex
  color becomes the regular line color — same as Go's `theme-changed` refresh.
- The multi-series formatters use `toLocaleString(undefined, …)`: the reader's
  browser locale, as before.

## Tests and goldens

`__fixtures__/go-charts.json` is the option JSON (functions as `"__fn__"`) and
SVG markup produced by running the Go builders themselves; `charts.spec.ts`
checks every builder deep-equals it. `theme.spec.ts` covers the theme patch.

The goldens' **colour values** were rewritten on 2026-10-30 for the Precision
rebrand (docs/precision-identity.md); everything else in them is still the Go
output. The rewrite walked each golden alongside the port's output and failed on
any difference that was not a colour, so structure parity still holds. The Go
web is archived, so to change a colour now: update palette.ts, then update the
matching hex in the fixture by hand (a reviewable, colour-only diff).
Dev gallery with every builder in both appearances: `/__dev/charts`.
