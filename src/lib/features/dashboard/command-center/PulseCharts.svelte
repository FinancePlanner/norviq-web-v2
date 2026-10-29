<script lang="ts">
	// dashboard.PulseCharts: Go embedded server-built chart HTML; here the specs
	// are built in the browser from the load's plain data (#lib/charts).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { activityHeatmap, spendingLine, spendPillarBar, type ChartSpec } from '#lib/charts/index.js';
	import type { CommandCenterViewModel } from './types.js';

	let { vm }: { vm: CommandCenterViewModel } = $props();

	const spending = $derived(vm.overview.spendingChart ? spendingLine('spending-chart', vm.overview.spendingChart.labels, vm.overview.spendingChart.values) : null);
	const pillars = $derived(vm.pillarSlices ? spendPillarBar('cc-pillar-chart', vm.pillarSlices) : null);
	const heatmap = $derived(vm.heatmap ? activityHeatmap('cc-heatmap-chart', vm.heatmap.from, vm.heatmap.to, vm.heatmap.counts) : null);
</script>

{#snippet tile(title: string, spec: ChartSpec | null, emptyNote: string)}
	<vigil.Panel class="cc-pulse-tile">
		<div class="cc-panel-head">
			<div class="cc-panel-head-copy">
				<h3 class="cc-pulse-title">{title}</h3>
			</div>
		</div>
		{#if spec}
			<EChart {...spec} />
		{:else}
			<p class="cc-panel-note">{emptyNote}</p>
		{/if}
	</vigil.Panel>
{/snippet}

<div class="cc-pulse-grid">
	{@render tile('Monthly spend', spending, 'Spending trend needs a few months of expenses.')}
	{@render tile('Spend by pillar · ' + vm.rangeLabel, pillars, 'No expenses recorded in this window.')}
	{#if heatmap}
		{@render tile('Events per day · ' + vm.rangeLabel, heatmap, '')}
	{/if}
</div>
