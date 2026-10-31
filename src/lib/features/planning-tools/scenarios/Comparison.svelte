<script lang="ts">
	// scenarios.Comparison(runs): the POST /scenarios/compare fragment.
	import EChart from '#lib/charts/EChart.svelte';
	import { formatFloat } from '#lib/format.js';
	import { comparisonChart, comparisonFanChart, comparisonMetricChart } from './comparison.js';
	import type { ScenarioRun } from './types.js';
	import {
		formatOptionalMoney,
		formatOptionalMonths,
		formatOptionalPercent,
		numberFrom,
		optionalNumber
	} from './view.js';

	let { runs }: { runs: ScenarioRun[] } = $props();

	const valueChart = $derived(comparisonChart(runs, false));
	const returnChart = $derived(comparisonChart(runs, true));
	const fanChart = $derived(comparisonFanChart(runs));
	const drawdownChart = $derived(
		comparisonMetricChart(runs, 'maximum_drawdown', 'scenario-comparison-drawdown')
	);
	const goalChart = $derived(
		comparisonMetricChart(runs, 'goal_probability', 'scenario-comparison-goal')
	);
</script>

<section class="glass-card p-5">
	<h3 class="font-semibold">Normalized comparison</h3>
	<p class="mt-1 text-sm text-muted-foreground">
		Runs are aligned by elapsed time. Values are never mixed across snapshot currencies.
	</p>
	<div class="mt-4 grid gap-3 sm:grid-cols-2">
		{#each runs as run, index (index)}
			{#if run.result != null}
				<div class="rounded-lg border p-4">
					<p class="text-footnote font-semibold text-muted-foreground">Run {index + 1}</p>
					<p class="mt-2 text-sm">
						Portfolio Δ <strong
							>{formatOptionalPercent(
								optionalNumber(run.result, 'portfolio_change_percent')
							)}</strong
						>
					</p>
					<p class="mt-1 text-sm">
						Maximum drawdown <strong
							>{formatFloat(numberFrom(run.result, 'maximum_drawdown') * 100, 1)}%</strong
						>
					</p>
					<p class="mt-1 text-sm">
						Goal delay <strong
							>{formatOptionalMonths(optionalNumber(run.result, 'goal_delay_months'))}</strong
						>
					</p>
					<p class="mt-1 text-sm">
						Contribution Δ <strong
							>{formatOptionalMoney(optionalNumber(run.result, 'contribution_delta'))}</strong
						>
					</p>
					<p class="mt-1 text-sm">
						Goal success <strong
							>{formatOptionalPercent(optionalNumber(run.result, 'goal_probability'))}</strong
						>
					</p>
				</div>
			{/if}
		{/each}
	</div>
	<h4 class="mt-6 text-sm font-semibold">Absolute value</h4>
	<div class="mt-2">
		{#if valueChart}<EChart {...valueChart} />{/if}
	</div>
	<h4 class="mt-6 text-sm font-semibold">Percentage return</h4>
	<div class="mt-2">
		{#if returnChart}<EChart {...returnChart} />{/if}
	</div>
	<h4 class="mt-6 text-sm font-semibold">Percentile fan</h4>
	<div class="mt-2">
		{#if fanChart}<EChart {...fanChart} />{/if}
	</div>
	<h4 class="mt-6 text-sm font-semibold">Maximum drawdown</h4>
	<div class="mt-2">
		{#if drawdownChart}<EChart {...drawdownChart} />{/if}
	</div>
	<h4 class="mt-6 text-sm font-semibold">Goal success</h4>
	<div class="mt-2">
		{#if goalChart}<EChart {...goalChart} />{/if}
	</div>
</section>
