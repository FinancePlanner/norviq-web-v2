<script lang="ts">
	// pages/pilots/follow_detail.templ FollowDetailPage.
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { SecondarySubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { wealthLine } from '#lib/charts/index.js';
	import SymbolLink from '#lib/features/settings-admin/pilots/SymbolLink.svelte';
	import { DISCLAIMER } from '#lib/features/settings-admin/pilots/vm.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
	// Go built charts.WealthLine("pilot_follow_value", …) server-side; a failed
	// build fell back to "The value chart is unavailable right now."
	const chart = $derived(vm.chartLabels.length >= 2 ? wealthLine('pilot_follow_value', vm.chartLabels, vm.chartValues) : null);
	const chartNote = $derived(
		vm.chartLabels.length >= 2 && !chart ? 'The value chart is unavailable right now.' : vm.chartNote
	);

	const stopConfirm =
		'Stop following? The portfolio or watchlist and everything copied into it stay where they are.';
</script>

<svelte:head>
	<title>{data.title} - Norviq</title>
</svelte:head>

{#snippet followDetailActions()}
	{#if vm.targetHref}
		<a href={vm.targetHref} class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">{vm.targetLinkLabel}</a>
	{/if}
	<a href={vm.pilot.href} class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">{'About ' + vm.pilot.name}</a>
{/snippet}

<vigil.CanvasPage
	pageClass="pilot-follow-detail-page"
	title={'Following ' + vm.pilot.name}
	subtitle={vm.targetLabel + ' · ' + vm.statusLabel}
	actions={followDetailActions}
>
	{#if vm.notice}
		<div class="mt-2 rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm" role="status">{vm.notice}</div>
	{/if}
	{#if vm.error}
		<div class="mt-2 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm" role="alert">{vm.error}</div>
	{/if}
	<div class="mt-4 rounded-lg bg-current/5 px-4 py-3 text-sm" role="note">
		<p class="font-medium">Simulated trades</p>
		<p class="mt-1 text-muted-foreground">{DISCLAIMER}</p>
	</div>
	{#if vm.paused}
		<p class="mt-4 text-sm" role="status">Paused. Norviq is not copying new trades until you resume.</p>
	{/if}
	{#if vm.waiting}
		<p class="mt-4 text-sm text-muted-foreground">
			Waiting for the first copied trades. Norviq applies the latest disclosures within a few hours.
		</p>
	{/if}
	{#if vm.isPortfolio}
		<div class="mt-6">
			<vigil.MetricStrip>
				<vigil.Metric label="Started with" value={vm.startingCapital} />
				<vigil.Metric label="Value now" value={vm.latestValue} sentiment={vm.changeTone} />
				<vigil.Metric label="Change" value={vm.change} sentiment={vm.changeTone} />
			</vigil.MetricStrip>
		</div>
		<vigil.Panel class="mt-6 p-5 md:p-6" titleID="pilot-follow-value-title">
			<vigil.PanelHeader id="pilot-follow-value-title" title="Simulated value" desc="Daily, from the copied trades" />
			{#if chart}
				<EChart {...chart} />
			{:else}
				<p class="mt-4 text-sm text-muted-foreground">{chartNote}</p>
			{/if}
		</vigil.Panel>
	{/if}
	<vigil.Panel class="mt-6 p-5 md:p-6" titleID="pilot-follow-events-title">
		<vigil.PanelHeader
			id="pilot-follow-events-title"
			title="Copied trades"
			desc="Newest first. Priced when Norviq saw the disclosure."
		/>
		{#if vm.eventsError}
			<p class="mt-4 text-sm text-muted-foreground">The trade log is unavailable right now. Try again shortly.</p>
		{:else if vm.events.length === 0}
			<p class="mt-4 text-sm text-muted-foreground">No trades copied yet.</p>
		{:else}
			<vigil.DataTable>
				<thead>
					<tr>
						<th>Date</th>
						<th>Change</th>
						<th>Symbol</th>
						<th>Shares</th>
						<th>Price</th>
						<th>Note</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.events as row, i (i)}
						<tr>
							<td class="whitespace-nowrap tabular-nums">{row.when}</td>
							<td>
								<span class={{ 'text-success': row.tone === 'positive', 'text-danger': row.tone === 'negative' }}
									>{row.label}</span
								>
							</td>
							<td class="font-semibold vigil-mono"><SymbolLink symbol={row.symbol} href={row.symbolHref} /></td>
							<td class="tabular-nums vigil-mono">{row.quantity}</td>
							<td class="tabular-nums vigil-mono">{row.price}</td>
							<td class="text-muted-foreground">{row.note}</td>
						</tr>
					{/each}
				</tbody>
			</vigil.DataTable>
		{/if}
	</vigil.Panel>
	<vigil.Panel class="mt-6 p-5 md:p-6" titleID="pilot-follow-manage-title">
		<vigil.PanelHeader id="pilot-follow-manage-title" title="Manage" />
		<div class="mt-4 flex flex-wrap gap-3">
			<form method="post" action="?/status" use:enhance={withSpinner()}>
				{#if vm.paused}
					<input type="hidden" name="status" value="active" />
					<SecondarySubmitButton>Resume</SecondarySubmitButton>
				{:else}
					<input type="hidden" name="status" value="paused" />
					<SecondarySubmitButton>Pause</SecondarySubmitButton>
				{/if}
			</form>
			<form
				method="post"
				action="?/stop"
				use:enhance={withSpinner(({ cancel }) => {
					// hx-confirm
					if (!window.confirm(stopConfirm)) cancel();
				})}
			>
				<SecondarySubmitButton>Stop following</SecondarySubmitButton>
			</form>
		</div>
		<p class="mt-3 text-xs text-muted-foreground">
			Stopping keeps the portfolio or watchlist and everything already copied into it. While you follow, hand edits to
			the portfolio are blocked so the simulation stays consistent.
		</p>
	</vigil.Panel>
</vigil.CanvasPage>
