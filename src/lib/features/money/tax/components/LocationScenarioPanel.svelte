<script lang="ts">
	// tax.LocationScenarioPanel — swapped into #tax-workspace after POST /tax/location-scenarios.
	import type { SubmitFunction } from '$app/forms';
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { SubmitButton } from '#lib/components/norviq/index.js';
	import { money } from '../helpers.js';
	import type { TaxLocationScenarioResponse } from '../types.js';

	let { s, submit }: { s: TaxLocationScenarioResponse; submit: SubmitFunction } = $props();
</script>

<section class="glass-card p-6">
	<h3 class="text-xl font-semibold">Asset-location scenario</h3>
	<div class="mt-4 grid gap-4 sm:grid-cols-2">
		<vigil.Metric label="Estimated annual savings" value={money(s.annualSavings)} /><vigil.Metric
			label="Immediate tax cost"
			value={money(s.immediateTaxCost)}
		/>
	</div>
	<div class="mt-5 space-y-3">
		{#each s.opportunities as opportunity (opportunity.id)}
			{#each opportunity.legs as leg (leg.id)}
				<div class="flex justify-between rounded-lg border border-current/10 p-4">
					<span>{leg.side} {leg.symbol}</span><strong>{money(leg.notional)}</strong>
				</div>
			{/each}
		{/each}
	</div>
	<form class="mt-5" method="POST" action="/tax?/placementPlans" use:enhance={submit}>
		<input type="hidden" name="scenarioId" value={s.id} /><SubmitButton
			>Create placement plan</SubmitButton
		>
	</form>
</section>
