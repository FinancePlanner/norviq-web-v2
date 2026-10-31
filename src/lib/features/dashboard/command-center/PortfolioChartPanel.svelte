<script lang="ts">
	// dashboard.PortfolioChartPanel.
	import EChart from '#lib/charts/EChart.svelte';
	import { wealthLine } from '#lib/charts/index.js';
	import type { OverviewViewModel } from './types.js';

	let { vm }: { vm: OverviewViewModel } = $props();
	const chart = $derived(
		vm.wealthChart ? wealthLine('wealth-chart', vm.wealthChart.labels, vm.wealthChart.values) : null
	);
</script>

{#snippet message(text: string)}
	<div class="overview-chart-empty">
		<p>{text}</p>
	</div>
{/snippet}

<div class="dash-panel overview-chart-card">
	<div class="activity-panel-header">
		<div>
			<p class="dash-panel-label">Portfolio performance</p>
			<p class="activity-panel-lead">Wealth trajectory · holdings weighted</p>
		</div>
		<a href="/portfolio" class="dash-panel-link">Open holdings</a>
	</div>
	<div class="overview-wealth-chart overview-wealth-chart-glow">
		{#if vm.loadErrors.dashboard && vm.loadErrors.reports}
			{@render message('Portfolio value is unavailable right now.')}
		{:else if vm.loadErrors.performance}
			{@render message('Portfolio chart is unavailable right now.')}
		{:else if !chart}
			{@render message('Add holdings to build your portfolio chart.')}
		{:else}
			<EChart {...chart} />
		{/if}
	</div>
</div>
