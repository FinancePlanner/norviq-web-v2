<script lang="ts">
	// simulator.Page(vm) — internal/pages/simulator/page.templ. Rendered by
	// GET /simulator and, after a no-JS post, by POST /simulator/preview and
	// POST /simulator/save.
	//
	// With JS: "Simulate" swaps the results panel only (Go hx-target
	// #simulator-result). "Add position" and "Save" answer the whole page in Go
	// (renderSimulator), which htmx then swapped into #simulator-result,
	// nesting a full page inside the panel; here they re-render the page.
	import { enhance } from '$app/forms';
	import { Field, SecondarySubmitButton, SelectField, SubmitButton, SwitchField } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { previewEnhance } from '../planning/preview-enhance.js';
	import SimulatorResult from './SimulatorResult.svelte';
	import {
		capitalValue,
		cashBasisPoints,
		claimedBasisPoints,
		isOverAllocated,
		percent,
		weightValue,
		type PageViewModel,
		type SimulatorActionData
	} from './vm.js';

	let { vm }: { vm: PageViewModel } = $props();

	let pageOverride = $state<PageViewModel | null>(null);
	let resultOverride = $state<PageViewModel | null>(null);
	let formKey = $state(0);
	const pageVM = $derived(pageOverride ?? vm);
	const resultVM = $derived(resultOverride ?? pageVM);
	const overAllocated = $derived(isOverAllocated(pageVM.draft));
	let resultEl = $state<HTMLElement | null>(null);

	function onData(data: SimulatorActionData) {
		if (data.scope === 'page') {
			pageOverride = data.vm;
			resultOverride = null;
			formKey++;
		} else {
			resultOverride = data.vm;
		}
	}

	const portfolioOptions = $derived(
		pageVM.portfolios.map((p) => ({ value: p.id, label: p.name, selected: p.id === pageVM.selectedID }))
	);
</script>

<vigil.CanvasPage
	pageClass="simulator-page"
	title="Portfolio simulator"
	subtitle="Price a portfolio before you own it. Pick the positions, set the weights, and see what building it would cost."
>
	{#if pageVM.error}
		<div
			class="mb-4 rounded-[var(--radius-control)] border border-destructive/40 bg-destructive/10 px-4 py-3 text-footnote text-destructive"
			role="alert"
		>
			{pageVM.error}
		</div>
	{/if}
	{#if pageVM.notice}
		<div class="mb-4 rounded-[var(--radius-control)] border border-border bg-muted/40 px-4 py-3 text-footnote" role="status">
			{pageVM.notice}
		</div>
	{/if}
	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<vigil.Panel titleID="simulator-builder-title">
			<vigil.PanelHeader
				id="simulator-builder-title"
				title="Positions"
				desc="Weights are percentages of the finished portfolio. They need not add up to 100% — whatever is left over is held as cash."
			/>
			{#key formKey}
				<form
					method="post"
					action="/simulator/preview"
					class="flex flex-col gap-4"
					use:enhance={previewEnhance<SimulatorActionData>(() => resultEl, onData)}
				>
					<Field name="name" label="Name" type="text" value={pageVM.draft.name} />
					<div class="grid gap-4 sm:grid-cols-2">
						<Field
							name="targetCapital"
							label="Capital to deploy"
							type="number"
							value={capitalValue(pageVM.draft.targetCapital)}
							description="The total you would put in."
							min="0"
							step="100"
						/>
						<Field name="baseCurrency" label="Currency" type="text" value={pageVM.draft.baseCurrency} />
					</div>
					{#if pageVM.portfolios.length > 0}
						<SelectField
							name="sourcePortfolioId"
							label="Compare against"
							placeholder="Start from scratch"
							description="Pick a portfolio to seed the starting holdings and see the trades as a diff."
							options={portfolioOptions}
						/>
					{/if}
					<vigil.DataTable>
						<thead>
							<tr>
								<th scope="col">Ticker</th>
								<th scope="col">Weight %</th>
							</tr>
						</thead>
						<tbody>
							{#each pageVM.draft.legs as leg, index (index)}
								<tr>
									<td>
										<Field
											name="symbol"
											type="text"
											value={leg.symbol}
											placeholder="AAPL"
											aria-label={'Ticker ' + (index + 1)}
											autocapitalize="characters"
										/>
									</td>
									<td>
										<Field
											name="weight"
											type="number"
											value={weightValue(leg.targetBasisPoints)}
											aria-label={'Weight ' + (index + 1)}
											min="0"
											max="100"
											step="0.01"
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</vigil.DataTable>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<p class={['text-footnote', overAllocated && 'text-destructive', !overAllocated && 'text-muted-foreground']}>
							{#if overAllocated}
								{'Weights total ' + percent(claimedBasisPoints(pageVM.draft)) + ' — that is more than the whole portfolio.'}
							{:else}
								{percent(claimedBasisPoints(pageVM.draft)) + ' allocated, ' + percent(cashBasisPoints(pageVM.draft)) + ' held as cash.'}
							{/if}
						</p>
						<SecondarySubmitButton name="action" value="add-row" formnovalidate>Add position</SecondarySubmitButton>
					</div>
					<SwitchField
						name="fractionalShares"
						label="Allow fractional shares"
						description="Off means whole shares only, which is what most brokers allow — and why there is usually cash left over."
						checked={pageVM.draft.fractionalSharesEnabled}
						value="true"
					/>
					<div class="flex flex-wrap gap-2">
						<SubmitButton disabled={overAllocated}>Simulate</SubmitButton>
						<SecondarySubmitButton disabled={overAllocated} formaction="/simulator/save">Save</SecondarySubmitButton>
					</div>
				</form>
			{/key}
		</vigil.Panel>
		<div id="simulator-result" bind:this={resultEl}>
			<SimulatorResult vm={resultVM} />
		</div>
	</div>
</vigil.CanvasPage>
