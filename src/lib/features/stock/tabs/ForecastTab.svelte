<script lang="ts">
	// stock.ForecastTab + ForecastScenarioTable
	import { EmptyState, SectionCard } from '#lib/components/norviq/index.js';
	import * as table from '#lib/components/norviq/tui/table/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { wealthLine } from '#lib/charts/index.js';
	import type { ForecastTabVM } from '../detail.js';

	let { vm }: { vm: ForecastTabVM } = $props();
	const spec = $derived(
		vm.chart ? wealthLine('stock-forecast-chart', vm.chart.labels, vm.chart.values) : null
	);
</script>

<div class="mt-6 space-y-4">
	{#if vm.hasData}
		{#if spec}
			<SectionCard title="Base scenario outlook">
				<div class="stock-chart-wrap overview-chart-wrap mt-2">
					<EChart {...spec} />
				</div>
			</SectionCard>
		{/if}
		{#each vm.scenarios as scenario, i (i)}
			<SectionCard title={scenario.kind + ' scenario'}>
				{#if scenario.years.length === 0}
					<p class="text-sm text-muted-foreground">No projected years on file.</p>
				{:else}
					<div class="stock-forecast-table-wrap mt-4 overflow-x-auto">
						<table.Table class="stock-forecast-table">
							<thead>
								<tr>
									<th>Year</th>
									<th>Revenue</th>
									<th>Growth</th>
									<th>EPS</th>
									<th>Price range</th>
								</tr>
							</thead>
							<tbody>
								{#each scenario.years as year, j (j)}
									<tr>
										<td>{year.year}</td>
										<td class="spring-pop" data-motion="spring">{year.revenue}</td>
										<td class="spring-pop" data-motion="spring">{year.revenueGrowth}</td>
										<td class="spring-pop" data-motion="spring">{year.eps}</td>
										<td class="spring-pop" data-motion="spring"
											>{year.sharePriceLow} - {year.sharePriceHigh}</td
										>
									</tr>
								{/each}
							</tbody>
						</table.Table>
					</div>
				{/if}
			</SectionCard>
		{/each}
	{:else}
		<SectionCard title="Forecast">
			<EmptyState
				title="No projections yet"
				description="Scenario projections will appear when insights data is available."
			/>
		</SectionCard>
	{/if}
</div>
