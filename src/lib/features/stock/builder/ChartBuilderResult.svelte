<!--
	ChartBuilderFragment (pages/stock/chart_builder_fragment.templ): the result
	of GET /portfolio/{symbol}/builder/chart. The chart spec is built here from
	the VM's labels/series with the same Go builder (MultiSeriesLine / Bar).
-->
<script lang="ts">
	import EChart from '#lib/charts/EChart.svelte';
	import { multiSeriesBar, multiSeriesLine } from '#lib/charts/index.js';
	import * as table from '#lib/components/norviq/tui/table/index.js';
	import { chartBuilderPeriodLabel, type ChartBuilderResultVM } from './types.js';

	let { result }: { result: ChartBuilderResultVM } = $props();

	const chart = $derived(
		result.hasData
			? result.chartType === 'line'
				? multiSeriesLine(result.chartID, result.labels, result.series)
				: multiSeriesBar(result.chartID, result.labels, result.series)
			: null
	);
</script>

{#if result.error !== ''}
	<section class="glass-card p-6" role="alert">
		<p class="font-semibold">Chart not built</p>
		<p class="mt-2 text-sm text-[var(--color-danger)]">{result.error}</p>
	</section>
{:else if !result.hasData}
	<section class="glass-card p-6">
		<p class="text-sm text-[var(--muted-foreground)]">No chart data is available for this selection.</p>
	</section>
{:else}
	<section class="glass-card p-5 md:p-6">
		<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
			<div class="min-w-0">
				<p class="text-footnote font-semibold text-[var(--muted-foreground)]">
					{chartBuilderPeriodLabel(result.period)} · {result.seriesCount} series
				</p>
				<h3 class="mt-1 text-xl font-semibold tracking-tight">{result.title}</h3>
			</div>
			<a
				href={result.csvURL}
				data-sveltekit-reload
				class="btn-secondary inline-flex w-auto shrink-0 items-center px-4 py-2 text-sm">Download CSV</a
			>
		</div>
		{#if result.mixedUnits}
			<p
				class="mt-4 rounded-xl border border-[var(--border)] bg-[var(--color-elevated-card)] px-3 py-2 text-xs text-[var(--muted-foreground)]"
			>
				Mixed units share one Y-axis. Use the legend and tooltips to identify each series.
			</p>
		{/if}
		<div class="stock-chart-wrap overview-chart-wrap mt-5 min-w-0">
			{#if chart}<EChart {...chart} />{/if}
		</div>
		<p class="mt-3 text-xs text-[var(--muted-foreground)]">
			Missing peer periods are left blank; values are aligned to the primary company’s fiscal calendar.
		</p>
	</section>

	{#if result.showGrowth}
		<section class="mt-4 glass-card p-5 md:p-6">
			<div>
				<p class="text-footnote font-semibold text-[var(--muted-foreground)]">Backend-calculated</p>
				<h3 class="mt-1 text-lg font-semibold">Growth</h3>
			</div>
			{#if result.growth.rows.length === 0}
				<p class="mt-4 text-sm text-[var(--muted-foreground)]">Growth needs at least two comparable periods.</p>
			{:else}
				<div class="stock-forecast-table-wrap mt-4 overflow-x-auto">
					<table.Table class="stock-forecast-table min-w-max">
						<thead>
							<tr>
								<th class="sticky left-0 z-10 bg-[var(--color-surface)] text-left">Series</th>
								{#each result.growth.periods as period, i (i)}
									<th>{period} YoY</th>
								{/each}
								<th>Total change</th>
								<th>CAGR</th>
							</tr>
						</thead>
						<tbody>
							{#each result.growth.rows as row, r (r)}
								<tr>
									<td class="sticky left-0 z-10 bg-[var(--color-surface)] font-semibold">{row.label}</td>
									{#each row.yoy as value, i (i)}
										<td>{value}</td>
									{/each}
									<td>{row.totalChange}</td>
									<td>{row.cagr}</td>
								</tr>
							{/each}
						</tbody>
					</table.Table>
				</div>
			{/if}
		</section>
	{/if}
{/if}
