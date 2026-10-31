<script lang="ts">
	// tax.ActionPlanPanel — swapped into #tax-workspace after POST /tax/action-plans or /tax/placement-plans.
	import { money } from '../helpers.js';
	import type { TaxActionPlanResponse } from '../types.js';

	let { plan }: { plan: TaxActionPlanResponse } = $props();
</script>

<section class="glass-card p-6">
	<div class="flex items-start justify-between">
		<div>
			<h3 class="text-xl font-semibold">Action plan</h3>
			<p class="mt-1 text-sm text-muted-foreground">
				Accepted · broker import will reconcile unambiguous matches.
			</p>
		</div>
		<span class="rounded-full border border-current/10 px-3 py-1 text-xs">{plan.status}</span>
	</div>
	{#if plan.legs}
		<div class="mt-4 overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead
					><tr class="border-b border-current/10"
						><th class="py-2">Side</th><th>Symbol</th><th>Notional</th><th>Lots</th><th>Status</th
						></tr
					></thead
				>
				<tbody>
					{#each plan.legs as leg (leg.id)}
						<tr class="border-b border-current/5"
							><td class="py-3">{leg.side}</td><td>{leg.symbol}</td><td>{money(leg.notional)}</td
							><td>{leg.lotIds.length}</td><td>{leg.status}</td></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	{#if plan.rebalancingPlanIds && plan.rebalancingPlanIds.length > 0}
		<p class="mt-4 text-sm text-success">
			Created {plan.rebalancingPlanIds.length} linked rebalancing draft(s).
		</p>
	{/if}
	<ol class="mt-4 space-y-3">
		{#each plan.steps as step (step.id)}
			<li class="rounded-lg border border-current/10 p-4">
				<p class="font-semibold">{step.order}. {step.title}</p>
				<p class="mt-1 text-sm text-muted-foreground">{step.detail}</p>
			</li>
		{/each}
	</ol>
	<p class="mt-4 text-sm text-muted-foreground">{plan.disclaimer}</p>
</section>
