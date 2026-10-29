<script lang="ts">
	// pages/automation/page.templ RebalancingPage (rebalancing rules).
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import Field from '#lib/components/norviq/Field.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import CheckboxField from '#lib/components/norviq/CheckboxField.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import {
		fixed,
		money,
		policyCadence,
		policyCurrency,
		policyDrift,
		policyEnabled,
		portfolioOptions,
		targetText
	} from '#lib/features/portfolio/automation/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
	const cadence = $derived(policyCadence(vm.policy));
	const eventAct = (eventID: string, name: string) =>
		`/portfolio/rebalancing-rules?id=${encodeURIComponent(vm.selectedID)}&event=${encodeURIComponent(eventID)}&/${name}`;
</script>

<svelte:head>
	<title>Rebalancing rules - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

<div class="app-page-content vigil-deck-page automation-modern-page space-y-6">
	<vigil.ModernPageHeader title="Rebalancing rules" subtitle="Draft trades are review-only and never execute automatically." />
	{#if vm.error}
		<div class="rounded-xl border border-danger p-4" role="alert">{vm.error}</div>
	{/if}
	<section class="glass-card p-5 md:p-6">
		<form class="flex flex-wrap items-end gap-4" method="get" action="/portfolio/rebalancing-rules">
			<SelectField
				name="portfolio"
				label="Portfolio"
				required
				wrapperClass="grid gap-1 text-sm"
				options={portfolioOptions(vm.portfolios, (id) => vm.selectedID === id, '')}
			/>
			<SubmitButton>Open</SubmitButton>
		</form>
	</section>
	{#if vm.selectedID}
		{#key vm}
			<section class="glass-card p-5 md:p-6">
				<h2 class="font-semibold">Policy</h2>
				<form
					class="mt-4 grid gap-4 md:grid-cols-3"
					method="POST"
					action={`/portfolio/rebalancing-rules?id=${encodeURIComponent(vm.selectedID)}&/save`}
					use:enhance={withSpinner()}
				>
					<SelectField
						name="cadence"
						label="Cadence"
						wrapperClass="grid gap-1 text-sm"
						options={[
							{ value: 'quarterly', label: 'Quarterly', selected: cadence === 'quarterly' },
							{ value: 'monthly', label: 'Monthly', selected: cadence === 'monthly' },
							{ value: 'semiannual', label: 'Semi-annual', selected: cadence === 'semiannual' },
							{ value: 'annual', label: 'Annual', selected: cadence === 'annual' },
							{ value: 'disabled', label: 'Drift only', selected: cadence === 'disabled' }
						]}
					/><Field
						name="drift"
						label="Drift threshold %"
						type="number"
						value={policyDrift(vm.policy)}
						wrapperClass="grid gap-1 text-sm"
						step="0.1"
						min="0.1"
						max="100"
					/><Field
						name="base_currency"
						label="Base currency"
						value={policyCurrency(vm.policy)}
						required
						class="tabular-nums"
						wrapperClass="grid gap-1 text-sm"
						minlength={3}
						maxlength={3}
					/><Field
						name="targets"
						label="Targets"
						value={targetText(vm.policy)}
						placeholder="AAPL:60,MSFT:30,cash:10"
						description="Use SYMBOL:PERCENT pairs totaling 100%."
						required
						wrapperClass="grid gap-1 text-sm md:col-span-2"
					/><CheckboxField
						name="enabled"
						label="Enabled"
						checked={policyEnabled(vm.policy)}
						wrapperClass="flex items-center gap-2 text-sm"
					/>
					<div><SubmitButton class="btn-primary">Save and preview</SubmitButton></div>
				</form>
			</section>
		{/key}
	{/if}
	{#if vm.preview}
		<section class="glass-card p-5 md:p-6">
			<h2 class="font-semibold">Review draft</h2>
			<p class="text-sm text-muted-foreground">
				{money(vm.preview.portfolioValue, vm.preview.currency)} · maximum drift {fixed(vm.preview.maximumDrift * 100, 1)}%
			</p>
			{#each vm.preview.warnings ?? [] as warning, i (i)}
				<p class="mt-2 rounded-lg border border-warning p-2 text-sm" role="status">{warning}</p>
			{/each}
			<div class="mt-4 overflow-x-auto">
				<table class="w-full text-sm">
					<thead><tr class="text-left"><th>Asset</th><th>Action</th><th>Current</th><th>Target</th><th>Amount</th></tr></thead>
					<tbody>
						{#each vm.preview.trades ?? [] as trade, i (i)}
							<tr class="border-t"
								><td class="py-2">
									{#if trade.symbol !== null && trade.symbol !== undefined}
										{trade.symbol}
									{:else}
										Cash
									{/if}
								</td><td>{trade.action}</td><td>{fixed(trade.currentWeight * 100, 1)}%</td><td>{fixed(trade.targetWeight * 100, 1)}%</td><td
									>{money(trade.amount, vm.preview.currency)}</td
								></tr
							>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
	{#if vm.events.length > 0}
		<section class="glass-card p-5 md:p-6">
			<h2 class="font-semibold">Rebalance events</h2>
			<div class="mt-3 space-y-3">
				{#each vm.events as event, i (i)}
					<article class="rounded-xl border border-black/5 p-4 dark:border-white/10 glass-card">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="font-medium">{event.status}</p>
								<p class="text-sm text-muted-foreground">
									{event.createdAt} · {money(event.preview.portfolioValue, event.preview.currency)} · max drift {fixed(
										event.preview.maximumDrift * 100,
										1
									)}%
								</p>
							</div>
							{#if event.status === 'pending'}
								<div class="flex gap-2">
									<form method="POST" action={eventAct(event.id, 'confirm')} use:enhance={withSpinner()}>
										<SubmitButton class="btn-primary">Confirm reviewed</SubmitButton>
									</form><form method="POST" action={eventAct(event.id, 'dismiss')} use:enhance={withSpinner()}>
										<SubmitButton>Dismiss</SubmitButton>
									</form>
								</div>
							{/if}
						</div>
					</article>
				{/each}
			</div>
		</section>
	{/if}
</div>
