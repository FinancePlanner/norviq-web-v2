<script lang="ts">
	// planning.RetireResultPanel(vm) — internal/pages/planning/retire.templ.
	import { EmptyState } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import PlanningChart from './PlanningChart.svelte';
	import type { RetireViewModel } from './vm.js';

	let { vm }: { vm: RetireViewModel } = $props();
</script>

{#if !vm.result}
	<EmptyState
		title="Nothing checked yet"
		description="Tell it what a month costs you and what you are putting away, and it will say whether that adds up."
	/>
{:else}
	{@const result = vm.result}
	<vigil.Panel titleID="retire-result-title">
		<vigil.PanelHeader id="retire-result-title" title="You will need" desc={result.verdict} />
		<p class="command-metric-value text-[length:var(--font-size-40,2.5rem)] tabular-nums">
			{result.needHeadline}
		</p>
		<vigil.MetricStrip>
			<vigil.Metric label="You will have" value={result.willHave} />
			<vigil.Metric label="Gap" value={result.gap} sentiment={result.gapTone} />
			{#if result.probability !== ''}
				<vigil.Metric label="Lasts to plan-to age" value={result.probability} />
			{/if}
		</vigil.MetricStrip>
		<!-- leverPanel: naming the exact move is the product. -->
		{#if result.onTrack}
			<div class="mt-4 rounded-[var(--radius-control)] border border-border bg-muted/40 px-4 py-3">
				<p class="command-metric-label">On track</p>
				<p class="text-footnote text-muted-foreground">
					On these assumptions the plan already covers the life you described.
				</p>
			</div>
		{:else if result.levers.length > 0}
			<div class="mt-4 rounded-[var(--radius-control)] border border-border bg-muted/40 px-4 py-3">
				<p class="command-metric-label mb-2">To close it, any one of these</p>
				<ul class="flex flex-col gap-2">
					{#each result.levers as lever, i (i)}
						<li>
							<span class="command-metric-value">{lever.label}</span>
							<span class="text-footnote text-muted-foreground">{lever.detail}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if vm.chart}
			<PlanningChart chart={vm.chart} />
		{/if}
		<p class="mt-4 text-footnote text-muted-foreground">
			{#if result.shortfallAge !== ''}
				At this rate the money runs out at {result.shortfallAge}, after {result.runwayYears} years of
				retirement. First-year spending would be {result.annualSpending}.
			{:else}
				The money lasts the full {result.runwayYears} years. First-year spending would be {result.annualSpending}.
			{/if}
		</p>
		{#if result.depletion.length > 0}
			<details class="mt-6">
				<summary class="command-metric-label cursor-pointer">Year by year in retirement</summary>
				<vigil.DataTable class="mt-2">
					<thead>
						<tr>
							<th scope="col">Age</th>
							<th scope="col" class="text-right">Spending</th>
							<th scope="col" class="text-right">Left</th>
						</tr>
					</thead>
					<tbody>
						{#each result.depletion as row, i (i)}
							<tr>
								<th scope="row" class="font-normal">{row.age}</th>
								<td class="text-right tabular-nums">{row.spending}</td>
								<td class="text-right tabular-nums">{row.balance}</td>
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
