<script lang="ts">
	// financing.Page (internal/pages/financing/page.templ).
	import { untrack } from 'svelte';
	import { enhance, type SubmitFunction } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { Field, SelectField, SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import FinancingResult from '#lib/features/money/financing/FinancingResult.svelte';
	import { money, type ResultViewModel } from '#lib/features/money/financing/financing.js';

	let { data, form } = $props();

	// No-JS posts land here with `form`; enhanced posts replace the panel only
	// on success, as htmx did (4xx/5xx are not swapped).
	const initial = untrack(() => ({
		form: (form as { result?: ResultViewModel; isPro?: boolean } | null) ?? null,
		isPro: data.isPro
	}));
	let result = $state<ResultViewModel | null>(initial.form?.result ?? null);
	let resultIsPro = $state<boolean>(initial.form?.isPro ?? initial.isPro);

	const swap: SubmitFunction = () => {
		return async ({ result: res }) => {
			if (res.type !== 'success') return;
			const payload = res.data as { result?: ResultViewModel; isPro?: boolean } | undefined;
			if (!payload?.result) return;
			result = payload.result;
			resultIsPro = payload.isPro ?? data.isPro;
		};
	};
</script>

<svelte:head>
	<title>Plan a purchase - Norviq</title>
</svelte:head>

<div class="app-page-content vigil-canvas-page financing-modern-page expenses-modern-page space-y-7">
	<vigil.ModernPageHeader title="Plan a purchase" />
	<vigil.CommandSplit>
		<vigil.CommandSplitMain>
			<vigil.Panel class="rounded-lg p-6" titleID="financing-form-panel">
				<form method="POST" action="?/simulate" class="space-y-5" use:enhance={withSpinner(swap)}>
					<Field id="financing-title" name="title" label="Purchase" placeholder="Tesla Model 3" required />
					<div class="grid gap-4 sm:grid-cols-2">
						<SelectField
							id="financing-type"
							name="purchaseType"
							label="Type"
							options={[
								{ value: 'vehicle', label: 'Vehicle' },
								{ value: 'home', label: 'Home or apartment' },
								{ value: 'utility', label: 'Major utility' },
								{ value: 'education', label: 'Education' },
								{ value: 'other', label: 'Other' }
							]}
						/>
						<SelectField
							id="financing-market"
							name="market"
							label="Market"
							options={[
								{ value: 'PT', label: 'Portugal' },
								{ value: 'DE', label: 'Germany' },
								{ value: 'FR', label: 'France' },
								{ value: 'IT', label: 'Italy' },
								{ value: 'ES', label: 'Spain' },
								{ value: 'NL', label: 'Netherlands' },
								{ value: 'PL', label: 'Poland' },
								{ value: 'BR', label: 'Brazil' },
								{ value: 'US', label: 'United States' }
							]}
						/>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field id="financing-price" name="purchaseAmount" label="Purchase price" type="number" required min="0.01" step="0.01" />
						<Field id="financing-deposit" name="downPayment" label="Deposit" type="number" value="0" min="0" step="0.01" />
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field id="financing-term" name="termMonths" label="Months" type="number" value="84" required min="1" max="480" />
						<Field id="financing-date" name="firstPaymentDate" label="First payment" type="date" required />
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field id="financing-payment" name="monthlyPayment" label="Quoted monthly payment" type="number" min="0" step="0.01" />
						<Field id="financing-rate" name="nominalRate" label="Nominal annual rate (%)" type="number" min="0" step="0.01" />
					</div>
					<Field id="financing-effective" name="effectiveRate" label="Disclosed TAEG / APR / CET (%)" type="number" min="0" step="0.01" />
					<SubmitButton class="w-full">Simulate affordability</SubmitButton>
				</form>
			</vigil.Panel>
		</vigil.CommandSplitMain>
		<vigil.CommandSplitAside>
			<div id="financing-result">
				{#if result}
					<FinancingResult vm={result} isPro={resultIsPro} onsave={swap} />
				{:else}
					<vigil.Panel class="rounded-lg p-7" titleID="financing-intro-panel">
						<p class="command-metric-label">Before you commit</p>
						<h2 class="mt-3 text-2xl font-semibold">See the full payment impact</h2>
						<p class="mt-3 opacity-70">Norviq keeps projected installments separate from actual spending and checks whether your current savings objective survives the plan.</p>
					</vigil.Panel>
				{/if}
			</div>
		</vigil.CommandSplitAside>
	</vigil.CommandSplit>
	{#if data.plans.length > 0}
		<vigil.Panel class="rounded-lg p-7" titleID="financing-plans-panel">
			<p class="command-metric-label">Tracked commitments</p>
			<div class="mt-4 grid gap-3 md:grid-cols-2">
				{#each data.plans as plan, i (i)}
					<article class="rounded-lg border border-black/5 p-4"><div class="flex items-start justify-between gap-4"><div><h2 class="font-semibold">{plan.title}</h2><p class="mt-1 text-xs text-muted-foreground">{plan.market} · {plan.termMonths} months</p></div><p class="font-semibold tabular-nums">{money(plan.monthlyPayment, plan.currency)} / month</p></div></article>
				{/each}
			</div>
		</vigil.Panel>
	{/if}
</div>
