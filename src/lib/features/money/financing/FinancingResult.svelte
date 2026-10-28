<script lang="ts">
	// financing.Result(vm, isPro) — the projection panel swapped into #financing-result.
	import { enhance, type SubmitFunction } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { PrimaryButton, SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import { formatFloat } from '#lib/format.js';
	import { benchmarkTitle, money, showGuidanceBand, type ResultViewModel } from './financing.js';

	let { vm, isPro, onsave }: { vm: ResultViewModel; isPro: boolean; onsave: SubmitFunction } = $props();
</script>

<vigil.Panel class="rounded-lg p-7 space-y-5" titleID="financing-result-panel">
	{#if vm.saved}
		<p class="rounded-lg bg-success/10 p-4 font-semibold text-success">Plan saved. Future installments now appear in Expenses.</p>
	{/if}
	<div><p class="command-metric-label">Projection</p><h2 class="mt-2 text-2xl font-semibold">{vm.title}</h2></div>
	<div class="grid grid-cols-2 gap-3"><div class="rounded-lg border border-black/5 p-4"><p class="text-xs text-muted-foreground">Monthly</p><p class="mt-1 text-xl font-semibold tabular-nums">{money(vm.monthlyPayment, vm.currency)}</p></div><div class="rounded-lg border border-black/5 p-4"><p class="text-xs text-muted-foreground">Total paid</p><p class="mt-1 text-xl font-semibold tabular-nums">{money(vm.totalPaid, vm.currency)}</p></div></div>
	<div class="rounded-lg border border-black/5 p-4">
		<p class="font-semibold">{vm.cashFlowStatus}</p>
		<p class="mt-2 text-sm text-muted-foreground">{vm.cashFlowMessage}</p>
	</div>
	<div class="rounded-lg border border-black/5 p-4 space-y-2">
		<p class="command-metric-label">Debt-service guidance</p>
		<p class="font-semibold">{benchmarkTitle(vm)}</p>
		{#if vm.benchmarkRatio !== null}
			<p class="text-sm">Calculated ratio: <span class="font-semibold tabular-nums">{formatFloat(vm.benchmarkRatio, 1)}%</span>
				{#if vm.incomeBasis !== null}
					<span class="opacity-55"> of {vm.incomeBasis} income</span>
				{/if}
			</p>
		{/if}
		{#if showGuidanceBand(vm)}
			<p class="text-sm text-muted-foreground">
				Published band:
				{#if vm.guidanceMinimum !== null && vm.guidanceMaximum !== null}
					{formatFloat(vm.guidanceMinimum, 0)}–{formatFloat(vm.guidanceMaximum, 0)}%
				{:else if vm.guidanceMaximum !== null}
					up to {formatFloat(vm.guidanceMaximum, 0)}%
				{:else if vm.guidanceMinimum !== null}
					from {formatFloat(vm.guidanceMinimum, 0)}%
				{/if}
			</p>
		{:else}
			<p class="text-sm text-muted-foreground">This market has no universal consumer pass/fail threshold in Norviq. The ratio is informational only.</p>
		{/if}
		<p class="text-xs text-muted-foreground">{vm.benchmarkMessage}</p>
	</div>
	{#if isPro}
		<form method="POST" action="?/save" use:enhance={withSpinner(onsave)}>
			{#each vm.planPayloadFields as [key, value] (key)}
				<input type="hidden" name={key} {value} />
			{/each}
			<SubmitButton class="w-full">Save to Expenses</SubmitButton>
		</form>
	{:else}
		<PrimaryButton href="/settings/subscription" class="inline-flex justify-center">Upgrade to save and track</PrimaryButton>
	{/if}
	<p class="text-xs text-muted-foreground">Planning guidance only, not lender approval. Confirm every term against the provider disclosure.</p>
</vigil.Panel>
