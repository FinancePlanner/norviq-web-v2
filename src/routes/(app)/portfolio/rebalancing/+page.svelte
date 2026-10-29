<script lang="ts">
	// pages/portfolio/rebalancing.templ RebalancingPage. The Go simulate/plan/model
	// forms were hx-post swaps of #rebalancing-page; here they are form actions
	// with use:enhance (simulate keeps the page, the others redirect back).
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import Field from '#lib/components/norviq/Field.svelte';
	import NativeInput from '#lib/components/norviq/NativeInput.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import SecondarySubmitButton from '#lib/components/norviq/SecondarySubmitButton.svelte';
	import CheckboxField from '#lib/components/norviq/CheckboxField.svelte';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import RebalancingPolicyEditor from '#lib/features/portfolio/automation/RebalancingPolicyEditor.svelte';
	import {
		basisPoints,
		defaultPlanName,
		driftBadge,
		driftTone,
		fixed,
		money,
		severityLabel,
		signedBasisPoints,
		signedTradeAmount
	} from '#lib/features/portfolio/automation/format.js';
	import type { RebalancingAllocationRow, RebalancingViewModel } from '#lib/features/portfolio/automation/types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// The simulate action renders the same page with the simulation (or its
	// error) on top of the freshly loaded view model, like the Go handler.
	const vm: RebalancingViewModel = $derived.by(() => {
		const base = data.vm;
		if (!form || !('portfolioID' in form)) return base;
		const out = { ...base };
		if ('error' in form && form.error) out.error = form.error;
		if ('simulation' in form && form.simulation) {
			out.simulation = form.simulation;
			out.cashFlow = form.cashFlow ?? 0;
		}
		return out;
	});
	const sel = $derived(vm.selected);
	const act = (name: string, extra: Record<string, string> = {}) =>
		'/portfolio/rebalancing?' + new URLSearchParams({ portfolio: sel?.id ?? '', ...extra }).toString() + '&/' + name;
	const trades = $derived(vm.simulation?.trades ?? []);
</script>

<svelte:head>
	<title>Portfolio rebalancing - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

{#snippet simMetric(label: string, value: string)}
	<div class="rounded-xl bg-current/5 p-3">
		<p class="text-xs text-muted-foreground">{label}</p>
		<p class="mt-1 font-semibold tabular-nums">{value}</p>
	</div>
{/snippet}

{#snippet simulationHidden()}
	{#if vm.overview.model}
		<input type="hidden" name="modelId" value={vm.overview.model.id} />
		<input type="hidden" name="modelRevision" value={String(vm.overview.model.revision)} />
	{/if}
	<input type="hidden" name="cashFlow" value={fixed(vm.cashFlow, 2)} />
{/snippet}

{#snippet driftTableRow(row: RebalancingAllocationRow, currency: string, child: boolean)}
	<tr class={['border-b border-current/5', child && 'opacity-75']}>
		<td class={['py-3 font-medium', child && 'pl-5 text-xs']}
			>{row.label}
			{#if row.symbol}
				<span class="ml-2 tabular-nums text-xs text-muted-foreground">{row.symbol}</span>
			{/if}
		</td>
		<td class="py-3 text-right tabular-nums">{basisPoints(row.currentBasisPoints)}</td><td
			class="py-3 text-right tabular-nums text-muted-foreground">{basisPoints(row.targetBasisPoints)}</td
		><td class={['py-3 text-right font-medium tabular-nums', driftTone(row.severity)]}>{signedBasisPoints(row.driftBasisPoints)}</td><td
			class="py-3 text-right tabular-nums text-muted-foreground">{money(row.driftValue, currency)}</td
		>
	</tr>
{/snippet}

<div id="rebalancing-page" class="app-page-content vigil-canvas-page portfolio-modern-page">
	<vigil.ModernPageHeader title="Rebalancing" />
	{#if vm.notice}
		<div class="mt-5 rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm" role="status">{vm.notice}</div>
	{/if}
	{#if vm.error}
		<div class="mt-5 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm" role="alert">{vm.error}</div>
	{/if}
	<nav class="mt-5 flex flex-wrap gap-2" aria-label="Portfolio scope">
		{#each vm.portfolios as item (item.id)}
			{@const active = sel !== null && sel.id === item.id}
			<a
				href={'/portfolio/rebalancing?portfolio=' + item.id}
				class={[
					'rounded-xl px-3 py-2 text-sm font-medium transition active:scale-[.98]',
					active && 'bg-[var(--color-accent)] text-white',
					!active && 'bg-current/5 hover:bg-current/10'
				]}>{item.name}</a
			>
		{/each}
	</nav>
	{#if sel === null}
		<section class="mt-6 rounded-lg border border-dashed border-current/20 p-10 text-center">
			<h2 class="text-xl font-semibold">Create a portfolio first</h2>
			<p class="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
				Allocation policies belong to a portfolio so cash, positions, and base currency stay isolated.
			</p>
			<PrimaryButton href="/portfolios" class="mt-5 inline-flex" fullWidth>Open portfolios</PrimaryButton>
		</section>
	{:else}
		<div class="vigil-command-split mt-6">
			<div class="vigil-command-split-main space-y-5">
				<!-- rebalancingOverview -->
				<section class="glass-card overflow-hidden" aria-labelledby="drift-title">
					<div class="grid gap-px bg-current/10 md:grid-cols-[1.1fr_.9fr]">
						<div class="bg-[var(--color-card-bg)] p-6 md:p-8">
							<p class="text-footnote font-semibold text-muted-foreground">{sel.name.toUpperCase()}</p>
							<div class="mt-4 flex flex-wrap items-end justify-between gap-4">
								<div>
									<p class="text-4xl font-semibold tabular-nums">{money(vm.overview.totalValue, vm.overview.baseCurrency)}</p>
									<p class="mt-2 text-sm text-muted-foreground">Current portfolio value</p>
								</div>
								<div class="text-right">
									<p class={['text-3xl font-semibold tabular-nums', driftTone(vm.overview.severity)]}>
										{basisPoints(vm.overview.totalDriftBasisPoints)}
									</p>
									<p class="mt-2 text-sm text-muted-foreground">total allocation drift</p>
								</div>
							</div>
							<div class="mt-6 flex flex-wrap items-center gap-3 text-sm">
								<span class={['rounded-lg px-2.5 py-1 font-medium', driftBadge(vm.overview.severity)]}>{severityLabel(vm.overview.severity)}</span>
								<span class="opacity-55">Prices: {vm.overview.priceQuality}</span>
								{#if vm.overview.pricedAt}
									<span class="opacity-55">as of {vm.overview.pricedAt}</span>
								{/if}
							</div>
						</div>
						<div class="bg-[var(--color-card-bg)] p-6 md:p-8">
							<h2 id="drift-title" class="text-lg font-semibold">Current vs target</h2>
							{#if !vm.overview.model}
								<p class="mt-3 text-sm leading-6 text-muted-foreground">
									Set a policy allocation to turn portfolio tracking into a repeatable review process.
								</p>
							{:else}
								<div class="mt-4 space-y-4">
									{#each vm.overview.rows ?? [] as row, i (i)}
										<div>
											<div class="flex justify-between gap-3 text-sm">
												<span>{row.label}</span><span class="tabular-nums opacity-65"
													>{basisPoints(row.currentBasisPoints)} / {basisPoints(row.targetBasisPoints)}</span
												>
											</div>
											<div class="mt-2 grid grid-cols-2 gap-2">
												<progress
													class="h-2 w-full accent-[var(--color-accent)]"
													max="10000"
													value={row.currentBasisPoints}
													aria-label={row.label + ' current allocation'}
												></progress><progress
													class="h-2 w-full opacity-45"
													max="10000"
													value={row.targetBasisPoints}
													aria-label={row.label + ' target allocation'}
												></progress>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
					{#if (vm.overview.warnings ?? []).length > 0}
						<div class="border-t border-current/10 px-6 py-4">
							{#each vm.overview.warnings ?? [] as warning, i (i)}
								<p class="text-sm text-warning">{warning.message}</p>
							{/each}
						</div>
					{/if}
				</section>
				{#if vm.overview.model}
					<!-- rebalancingDriftTable -->
					<section class="glass-card p-5 md:p-6" aria-labelledby="allocation-drift-title">
						<div class="flex items-end justify-between gap-4">
							<div>
								<h2 id="allocation-drift-title" class="text-lg font-semibold">Allocation drift</h2>
								<p class="mt-1 text-sm text-muted-foreground">Positive drift is overweight; negative drift is underweight.</p>
							</div>
							<span class="text-sm tabular-nums text-muted-foreground">{vm.overview.openAlertCount} alerts</span>
						</div>
						<div class="mt-5 overflow-x-auto">
							<vigil.DataTable>
								<thead
									><tr
										><th>Group / holding</th><th class="text-right">Current</th><th class="text-right">Target</th><th class="text-right"
											>Drift</th
										><th class="text-right">Value gap</th></tr
									></thead
								>
								<tbody>
									{#each vm.overview.rows ?? [] as row, i (i)}
										{@render driftTableRow(row, vm.overview.baseCurrency, false)}
										{#each row.children ?? [] as child, j (j)}
											{@render driftTableRow(child, vm.overview.baseCurrency, true)}
										{/each}
									{/each}
								</tbody>
							</vigil.DataTable>
						</div>
					</section>
					<!-- rebalancingSimulator -->
					<section class="glass-card p-5 md:p-6" aria-labelledby="simulator-title">
						<div class="flex flex-wrap items-start justify-between gap-4">
							<div>
								<h2 id="simulator-title" class="text-lg font-semibold">What-if simulator</h2>
								<p class="mt-1 max-w-2xl text-sm text-muted-foreground">
									Adjust cash flow or exact trade amounts. Calculations never submit an order or modify a holding.
								</p>
							</div>
							<span class="rounded-lg bg-current/5 px-2.5 py-1 text-xs font-medium">Planning only</span>
						</div>
						<form
							method="POST"
							action={act('simulate')}
							use:enhance={withSpinner(() => async ({ update }) => update({ reset: false }))}
							class="mt-5"
						>
							{@render simulationHidden()}
							<div class="flex flex-col gap-3 sm:flex-row">
								<Field
									name="cashFlow"
									label="Cash contribution or withdrawal"
									type="number"
									value={fixed(vm.cashFlow, 2)}
									class="w-full tabular-nums"
									wrapperClass="flex-1 text-sm"
									step="0.01"
								/><SubmitButton class="self-end">Calculate plan</SubmitButton>
							</div>
							{#if vm.simulation}
								<div class="mt-6 grid gap-3 sm:grid-cols-4">
									{@render simMetric('Drift before', basisPoints(vm.simulation.driftBeforeBasisPoints))}
									{@render simMetric('Drift after', basisPoints(vm.simulation.driftAfterBasisPoints))}
									{@render simMetric('Estimated fees', money(vm.simulation.estimatedFees, vm.simulation.baseCurrency))}
									{@render simMetric('Est. realized G/L', money(vm.simulation.estimatedRealizedGainLoss, vm.simulation.baseCurrency))}
								</div>
								<div class="mt-5 space-y-2">
									{#each trades as trade, i (i)}
										<div class="grid items-center gap-3 rounded-lg bg-current/5 px-4 py-3 sm:grid-cols-[5rem_1fr_8rem_10rem]">
											<span class={['text-xs font-semibold', trade.side === 'buy' && 'text-success', trade.side === 'sell' && 'text-warning']}
												>{trade.side.toUpperCase()}</span
											>
											<div>
												<p class="tabular-nums font-semibold">{trade.symbol}</p>
												<p class="text-xs text-muted-foreground">{fixed(trade.quantity, 4)} shares @ {money(trade.price, trade.currency)}</p>
											</div>
											<span class="text-right tabular-nums">{money(trade.notional, trade.currency)}</span><label
												><span class="sr-only">Override {trade.symbol} amount</span><NativeInput
													name="overrideAmount[]"
													type="number"
													value={fixed(signedTradeAmount(trade), 2)}
													class="w-full text-right tabular-nums"
													step="0.01"
													aria-label="Override amount"
												/><input type="hidden" name="overrideSymbol[]" value={trade.symbol} /></label
											>
										</div>
									{/each}
								</div>
							{/if}
						</form>
						{#if vm.simulation}
							<form
								method="POST"
								action={act('plans')}
								use:enhance={withSpinner()}
								class="mt-4 flex flex-col gap-3 border-t border-current/10 pt-5 sm:flex-row"
							>
								{@render simulationHidden()}
								{#each trades as trade, i (i)}
									<input type="hidden" name="overrideSymbol[]" value={trade.symbol} />
									<input type="hidden" name="overrideAmount[]" value={fixed(signedTradeAmount(trade), 2)} />
								{/each}
								<Field name="name" label="Plan name" placeholder="Plan name (optional)" class="w-full" wrapperClass="flex-1" /><SubmitButton
									>Save planning record</SubmitButton
								>
							</form>
						{/if}
					</section>
				{/if}
			</div>
			<vigil.CommandSplitAside>
				<div class="space-y-5">
					{#key data.vm}
						<RebalancingPolicyEditor {vm} />
					{/key}
					<!-- rebalancingAlerts -->
					<section class="glass-card p-5 md:p-6">
						<div class="flex items-center justify-between gap-4">
							<div>
								<h2 class="text-lg font-semibold">Drift alerts</h2>
								<p class="mt-1 text-sm text-muted-foreground">Resolve automatically below 80% of the threshold.</p>
							</div>
							<span class="text-2xl font-semibold tabular-nums">{vm.alerts.length}</span>
						</div>
						<div class="mt-4 space-y-2">
							{#each vm.alerts as alert (alert.id)}
								<div class="rounded-lg bg-current/5 p-3">
									<div class="flex justify-between gap-3">
										<div>
											<p class="font-medium">{alert.scopeName}</p>
											<p class="mt-1 text-xs text-muted-foreground">
												{signedBasisPoints(alert.driftBasisPoints)} · threshold {basisPoints(alert.thresholdBasisPoints)}
											</p>
										</div>
										{#if alert.status === 'open'}
											<form method="POST" action={act('acknowledge', { alert: alert.id })} use:enhance={withSpinner()}>
												<NativeButton type="submit" class="text-xs font-medium text-muted-foreground hover:opacity-100">Acknowledge</NativeButton>
											</form>
										{/if}
									</div>
								</div>
							{/each}
						</div>
						<form
							method="POST"
							action={act('preferences')}
							use:enhance={withSpinner()}
							class="mt-4 flex items-center justify-between border-t border-current/10 pt-4"
						>
							<CheckboxField
								name="pushEnabled"
								label="Push notifications"
								checked={vm.preferences.pushEnabled}
								wrapperClass="flex items-center gap-2 text-sm"
							/><SecondarySubmitButton>Save</SecondarySubmitButton>
						</form>
					</section>
					<!-- rebalancingDiscipline -->
					<section class="glass-card p-5 md:p-6">
						<h2 class="text-lg font-semibold">Discipline record</h2>
						<div class="mt-4 grid grid-cols-2 gap-3">
							{@render simMetric('Completed', String(vm.history.completedCount))}
							{@render simMetric('Avg. drift before', basisPoints(vm.history.averageDriftBeforeBasisPoints))}
							{@render simMetric('Avg. drift after', basisPoints(vm.history.averageDriftAfterBasisPoints))}
							{#if vm.history.averageDaysBetweenRebalances !== null && vm.history.averageDaysBetweenRebalances !== undefined}
								{@render simMetric('Avg. cadence', `${fixed(vm.history.averageDaysBetweenRebalances, 0)} days`)}
							{/if}
						</div>
					</section>
				</div>
			</vigil.CommandSplitAside>
		</div>
		<!-- rebalancingPlanHistory -->
		<section class="mt-5 glass-card p-5 md:p-6" aria-labelledby="plan-history-title">
			<div>
				<h2 id="plan-history-title" class="text-lg font-semibold">Plan history</h2>
				<p class="mt-1 text-sm text-muted-foreground">Exports are instructions for manual review. Norviq never places these orders.</p>
			</div>
			<div class="mt-5 grid gap-3 lg:grid-cols-2">
				{#each vm.plans as plan (plan.id)}
					<article class="rounded-lg bg-current/5 p-4">
						<div class="flex items-start justify-between gap-3">
							<div>
								<h3 class="font-semibold">{defaultPlanName(plan.name)}</h3>
								<p class="mt-1 text-xs text-muted-foreground">{plan.createdAt}</p>
							</div>
							<span class="rounded-lg bg-current/5 px-2 py-1 text-xs capitalize">{plan.status}</span>
						</div>
						<div class="mt-4 grid grid-cols-3 gap-3 text-sm">
							<div>
								<p class="text-xs text-muted-foreground">Trades</p>
								<p class="mt-1 font-semibold tabular-nums">{(plan.trades ?? []).length}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Before</p>
								<p class="mt-1 font-semibold tabular-nums">{basisPoints(plan.driftBeforeBasisPoints)}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">After</p>
								<p class="mt-1 font-semibold tabular-nums">{basisPoints(plan.driftAfterBasisPoints)}</p>
							</div>
						</div>
						<div class="mt-4 flex flex-wrap gap-2">
							<a class="btn-secondary" data-sveltekit-reload href={`/portfolio/rebalancing/${sel.id}/plans/${plan.id}/export.csv`}>CSV</a><a
								class="btn-secondary"
								data-sveltekit-reload
								href={`/portfolio/rebalancing/${sel.id}/plans/${plan.id}/export.pdf`}>PDF</a
							>
							{#if plan.status === 'draft' || plan.status === 'exported'}
								<form method="POST" action={act('complete', { plan: plan.id })} use:enhance={withSpinner()} class="flex flex-1 gap-2">
									<Field name="note" placeholder="Completion note" class="min-w-0" wrapperClass="flex-1" aria-label="Completion note" /><SubmitButton
										>Log complete</SubmitButton
									>
								</form>
							{/if}
						</div>
					</article>
				{/each}
			</div>
			{#if vm.plans.length === 0}
				<div class="mt-5 rounded-lg border border-dashed border-current/20 p-8 text-center">
					<p class="font-medium">No planning records yet</p>
					<p class="mt-2 text-sm text-muted-foreground">Run the simulator, review the exact trades, then save a plan.</p>
				</div>
			{/if}
		</section>
	{/if}
</div>
