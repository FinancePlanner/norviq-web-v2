<script lang="ts">
	// planning.GrowResultPanel(vm) — internal/pages/planning/grow.templ. Swapped
	// on its own after a preview, so changing a field does not re-render the form.
	import { EmptyState } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import PlanningChart from './PlanningChart.svelte';
	import { growHorizonLabel, type GrowViewModel } from './vm.js';

	let { vm }: { vm: GrowViewModel } = $props();
</script>

{#if !vm.result}
	<EmptyState
		title="Nothing projected yet"
		description="Fill in a starting amount, a monthly contribution and a horizon, then project."
	/>
{:else}
	{@const result = vm.result}
	<vigil.Panel titleID="grow-result-title">
		<vigil.PanelHeader id="grow-result-title" title="What it becomes" desc={growHorizonLabel(vm)} />
		<p class="command-metric-value text-[length:var(--font-size-40,2.5rem)] tabular-nums">
			{#if result.showReal}{result.endingValueReal}{:else}{result.endingValue}{/if}
		</p>
		<p class="text-footnote text-muted-foreground">
			{#if result.showReal}
				In today's money. Nominal: {result.endingValue}.
			{:else}
				Nominal. In today's money: {result.endingValueReal}.
			{/if}
		</p>
		<vigil.MetricStrip>
			<vigil.Metric label="You put in" value={result.totalContributed} />
			<vigil.Metric label="Growth" value={result.totalGrowth} sentiment="positive" />
			<vigil.Metric label="Growth share" value={result.growthShare} />
		</vigil.MetricStrip>
		{#if vm.chart}
			<PlanningChart chart={vm.chart} />
		{/if}
		{#if result.sensitivity.length > 0}
			<div class="mt-6">
				<h3 class="command-metric-label mb-2">If the return is different</h3>
				<vigil.DataTable>
					<thead>
						<tr>
							<th scope="col">Return</th>
							<th scope="col" class="text-right">Ending value</th>
						</tr>
					</thead>
					<tbody>
						{#each result.sensitivity as row, i (i)}
							<tr>
								<th scope="row" class="font-normal">
									{row.rate}
									{#if row.isBase}
										<span class="text-footnote text-muted-foreground">(your assumption)</span>
									{/if}
								</th>
								<td class="text-right tabular-nums">{row.endingValue}</td>
							</tr>
						{/each}
					</tbody>
				</vigil.DataTable>
			</div>
		{/if}
		{#if result.years.length > 0}
			<details class="mt-6">
				<summary class="command-metric-label cursor-pointer">Year by year</summary>
				<vigil.DataTable class="mt-2">
					<thead>
						<tr>
							<th scope="col">Year</th>
							<th scope="col" class="text-right">Contributed</th>
							<th scope="col" class="text-right">Balance</th>
							<th scope="col" class="text-right">Growth</th>
						</tr>
					</thead>
					<tbody>
						{#each result.years as row, i (i)}
							<tr>
								<th scope="row" class="font-normal">{row.year}</th>
								<td class="text-right tabular-nums">{row.contributed}</td>
								<td class="text-right tabular-nums">{row.balance}</td>
								<td class="text-right tabular-nums">{row.growth}</td>
							</tr>
						{/each}
					</tbody>
				</vigil.DataTable>
			</details>
		{/if}
		{#if result.notes.length > 0}
			<div class="mt-6">
				<h3 class="command-metric-label mb-2">What this assumes</h3>
				<ul class="flex flex-col gap-1 text-footnote text-muted-foreground">
					{#each result.notes as note, i (i)}
						<li>{note}</li>
					{/each}
				</ul>
			</div>
		{/if}
	</vigil.Panel>
{/if}
