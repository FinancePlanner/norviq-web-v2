<script lang="ts">
	// expenses.YearPage (internal/pages/expenses/year.templ).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { CardHeader, ChartPlaceholder } from '#lib/components/norviq/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { spendingLine } from '#lib/charts/index.js';
	import { formatFloat } from '#lib/format.js';

	let { data } = $props();
	const chart = $derived(spendingLine('expenses-year-chart', data.labels, data.values));
</script>

<svelte:head>
	<title>Year overview - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<vigil.CanvasPage
	pageClass="expenses-year-page expenses-modern-page"
	title="Year overview"
	subtitle={String(data.year)}
>
	<vigil.MetricStrip>
		<vigil.Metric label="Total spent" value={data.totalSpent} />
		<vigil.Metric label="Total planned" value={data.totalPlanned} />
		<vigil.Metric label="Spending vs last year" value={data.yoySpent} />
		<vigil.Metric label="Plan vs last year" value={data.yoyPlanned} />
	</vigil.MetricStrip>
	<vigil.CommandSplit>
		<vigil.CommandSplitMain>
			{#if chart}
				<vigil.Panel class="p-5">
					<CardHeader title="Monthly spending" />
					<div class="overview-chart-wrap mt-3">
						<EChart {...chart} />
					</div>
				</vigil.Panel>
			{:else}
				<ChartPlaceholder label="Monthly spending" />
			{/if}
		</vigil.CommandSplitMain>
		<vigil.CommandSplitAside>
			<section class="year-heatmap" aria-label="Month heatmap">
				<CardHeader title="Month heatmap" />
				<div class="month-heatmap-grid">
					{#each data.months as month (month.monthQuery)}
						<a href={'/expenses?month=' + month.monthQuery} class="month-heatmap-cell">
							<p class="month-heatmap-label">{month.label}</p>
							<p class="month-heatmap-spent tabular-nums">{month.spent}</p>
							<p class="month-heatmap-plan">Plan {month.planned}</p>
							<div
								class="month-heatmap-bar mt-2 h-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"
							>
								<div
									class="pillar-progress-fill h-full rounded-full"
									style={`width:${formatFloat(month.heatPct, 0)}%`}
								></div>
							</div>
						</a>
					{/each}
				</div>
			</section>
		</vigil.CommandSplitAside>
	</vigil.CommandSplit>
</vigil.CanvasPage>
