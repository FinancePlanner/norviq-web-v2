<script lang="ts">
	// stock.ChartTab — also rendered inside the overview. Go only loaded price
	// history for the chart tab, so the overview always shows the empty state.
	import { EmptyState, SectionCard } from '#lib/components/norviq/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { wealthLine } from '#lib/charts/index.js';
	import type { ChartTabVM } from '../detail.js';

	let { chart }: { chart: ChartTabVM } = $props();
	const spec = $derived(
		chart.hasData ? wealthLine('stock-price-chart', chart.labels, chart.values) : null
	);
</script>

<div class="mt-6">
	<SectionCard title="Price history">
		{#if chart.hasData}
			<div class="stock-chart-wrap overview-chart-wrap mt-2">
				{#if spec}<EChart {...spec} />{/if}
			</div>
		{:else if chart.error !== ''}
			<p class="mt-2 text-sm text-[var(--color-danger)]">{chart.error}</p>
		{:else}
			<EmptyState
				title="No price history"
				description="Market history will appear once data is available for this symbol."
			/>
		{/if}
	</SectionCard>
</div>
