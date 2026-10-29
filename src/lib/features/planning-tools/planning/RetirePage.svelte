<script lang="ts">
	// planning.RetirePage(vm) — internal/pages/planning/retire.templ. Rendered by
	// GET /planning/retire and, after a no-JS post, by POST /planning/retire/preview.
	import { enhance } from '$app/forms';
	import { Field, SubmitButton } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import RetireResultPanel from './RetireResultPanel.svelte';
	import { previewEnhance } from './preview-enhance.js';
	import { retireCostHint, retireValueHint, type RetireViewModel } from './vm.js';

	let { vm }: { vm: RetireViewModel } = $props();

	// hx-target="#retire-result": a preview replaces the results panel only.
	let swapped = $state<RetireViewModel | null>(null);
	const resultVM = $derived(swapped ?? vm);
	let resultEl = $state<HTMLElement | null>(null);
</script>

<vigil.CanvasPage
	pageClass="planning-retire-page"
	title="Retire"
	subtitle="What your life costs, what that means you need, and the shortest way to close the difference."
>
	{#if vm.error}
		<div
			class="mb-4 rounded-[var(--radius-control)] border border-destructive/40 bg-destructive/10 px-4 py-3 text-footnote text-destructive"
			role="alert"
		>
			{vm.error}
		</div>
	{/if}
	{#if vm.noBudget}
		<div class="mb-4 rounded-[var(--radius-control)] border border-border bg-muted/40 px-4 py-3 text-footnote" role="status">
			There is no budget to read your cost of life from yet, so these figures start from a typical month rather than yours. Setting up
			a budget makes this accurate.
		</div>
	{/if}
	<div class="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
		<vigil.Panel titleID="retire-form-title">
			<vigil.PanelHeader
				id="retire-form-title"
				title="Your life, and your plan"
				desc="Costs are monthly and in today's money. Everything here is an assumption you can change."
			/>
			<form
				method="post"
				action="/planning/retire/preview"
				class="flex flex-col gap-4"
				use:enhance={previewEnhance<{ vm: RetireViewModel }>(
					() => resultEl,
					(data) => (swapped = data.vm)
				)}
			>
				<div class="grid gap-4 sm:grid-cols-3">
					<Field name="currentAge" label="Age now" type="number" value={vm.draft.currentAge} min="18" max="99" step="1" />
					<Field name="retirementAge" label="Retire at" type="number" value={vm.draft.retirementAge} min="19" max="100" step="1" />
					<Field name="longevityAge" label="Plan to" type="number" value={vm.draft.longevityAge} min="20" max="120" step="1" />
				</div>
				<Field
					name="monthlyCost"
					label="Cost of life (monthly)"
					type="number"
					value={vm.draft.monthlyCost}
					description={retireCostHint(vm)}
					min="0"
					step="50"
				/>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field
						name="monthlyHousing"
						label="Of which housing"
						type="number"
						value={vm.draft.monthlyHousing}
						description="Part of the figure above, not on top of it."
						min="0"
						step="50"
					/>
					<Field
						name="housingEndsAtAge"
						label="Housing ends at age"
						type="number"
						value={vm.draft.housingEndsAtAge}
						description="Leave blank if it never stops. A mortgage being paid off changes the answer a lot."
						min="0"
						max="120"
						step="1"
					/>
				</div>
				<Field
					name="monthlyOther"
					label="Other income in retirement (monthly)"
					type="number"
					value={vm.draft.monthlyOther}
					description="State pension, rental income, anything the portfolio does not have to cover."
					min="0"
					step="50"
				/>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field
						name="initialAmount"
						label="Invested today"
						type="number"
						value={vm.draft.initialAmount}
						description={retireValueHint(vm)}
						min="0"
						step="100"
					/>
					<Field
						name="monthlyContribution"
						label="Adding monthly"
						type="number"
						value={vm.draft.monthlyContribution}
						min="0"
						step="50"
					/>
				</div>
				<div class="grid gap-4 sm:grid-cols-3">
					<Field name="returnPercent" label="Return (%)" type="number" value={vm.draft.returnPercent} min="-99" max="100" step="0.5" />
					<Field
						name="inflationPercent"
						label="Inflation (%)"
						type="number"
						value={vm.draft.inflationPercent}
						min="-99"
						max="100"
						step="0.1"
					/>
					<Field
						name="withdrawalRate"
						label="Withdrawal (%)"
						type="number"
						value={vm.draft.withdrawalRate}
						min="0.1"
						max="20"
						step="0.1"
					/>
				</div>
				<div class="flex gap-3">
					<SubmitButton class="w-auto px-6">Check the plan</SubmitButton>
				</div>
			</form>
		</vigil.Panel>
		<div id="retire-result" bind:this={resultEl}>
			<RetireResultPanel vm={resultVM} />
		</div>
	</div>
</vigil.CanvasPage>
