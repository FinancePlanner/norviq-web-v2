<script lang="ts">
	// @templ.Raw(vm.Chart) for charts.MultiSeriesLine(id, labels, series): the
	// spec is built here, in the browser, from the plain data the action sent.
	import EChart from '#lib/charts/EChart.svelte';
	import { multiSeriesLine } from '#lib/charts/index.js';
	import type { ChartData } from './vm.js';

	let { chart }: { chart: ChartData } = $props();
	const spec = $derived(multiSeriesLine(chart.id, chart.labels, chart.series));
</script>

{#if spec}
	<div class="mt-4">
		<EChart {...spec} />
	</div>
{/if}
