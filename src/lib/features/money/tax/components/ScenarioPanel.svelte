<script lang="ts">
	// tax.ScenarioPanel — swapped into #tax-workspace after POST /tax/scenarios.
	import type { SubmitFunction } from '$app/forms';
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import * as table from '#lib/components/norviq/tui/table/index.js';
	import { SubmitButton } from '#lib/components/norviq/index.js';
	import { sprintfFixed } from '#lib/format.js';
	import { money } from '../helpers.js';
	import type { TaxScenarioResponse } from '../types.js';

	let { s, submit }: { s: TaxScenarioResponse; submit: SubmitFunction } = $props();

	const signedPct = (v: number) => (v >= 0 ? '+' : '') + sprintfFixed(v, 2) + '%';
</script>

<section class="glass-card p-6">
	<h3 class="text-xl font-semibold">Harvest now vs hold</h3>
	<div class="mt-4 grid gap-4 sm:grid-cols-3">
		<vigil.Metric label="Hold · current year" value={money(s.baseline.currentYearTax)} /><vigil.Metric
			label="Harvest · current year"
			value={money(s.harvestNow.currentYearTax)}
		/><vigil.Metric label="Estimated net benefit" value={money(s.estimatedNetBenefit)} />
	</div>
	{#if s.currentYearTaxReduction || s.deferredTaxLiability || s.estimatedTransactionCosts}
		<div class="mt-4 grid gap-3 sm:grid-cols-3">
			{#if s.currentYearTaxReduction}
				<vigil.Metric label="Current-year reduction" value={money(s.currentYearTaxReduction)} />
			{/if}
			{#if s.deferredTaxLiability}
				<vigil.Metric label="Deferred liability" value={money(s.deferredTaxLiability)} />
			{/if}
			{#if s.estimatedTransactionCosts}
				<vigil.Metric label="Costs" value={money(s.estimatedTransactionCosts)} />
			{/if}
		</div>
	{/if}
	{#each s.goalImpacts ?? [] as impact, i (i)}
		{#if impact.monthsSooner != null}
			<p class="mt-3 text-sm text-success">
				Reinvesting the benefit may accelerate {impact.goalName} by {impact.monthsSooner} months.
			</p>
		{/if}
	{/each}
	{#if s.allocationImpacts && s.allocationImpacts.length > 0}
		<div class="mt-5 space-y-4">
			{#each s.allocationImpacts as impact, i (i)}
				<div class="rounded-lg border border-current/10 p-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h4 class="font-semibold">Allocation before and after</h4>
						<span class="text-xs text-muted-foreground">Largest change {sprintfFixed(impact.maximumWeightChange * 100, 2)}%</span>
					</div>
					<div class="mt-3 overflow-x-auto">
						<table.Table class="w-full text-left text-sm">
							<thead><tr class="border-b border-current/10"><th class="py-2">Holding</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
							<tbody>
								{#each impact.changes as change, j (j)}
									<tr class="border-b border-current/5"
										><td class="py-2 font-medium">{change.symbol}</td><td>{sprintfFixed(change.beforeWeight * 100, 2)}%</td><td
											>{sprintfFixed(change.afterWeight * 100, 2)}%</td
										><td>{signedPct((change.afterWeight - change.beforeWeight) * 100)}</td></tr
									>
								{/each}
							</tbody>
						</table.Table>
					</div>
				</div>
			{/each}
		</div>
	{/if}
	{#each s.warnings as warning, i (i)}
		<p class="mt-2 text-sm text-warning">{warning}</p>
	{/each}
	<form class="mt-5" method="POST" action="/tax?/actionPlans" use:enhance={submit}>
		<input type="hidden" name="scenarioId" value={s.id} /><SubmitButton>Create action plan</SubmitButton>
	</form>
</section>
