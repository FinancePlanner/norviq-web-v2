<script lang="ts">
	// pages/pilots/detail.templ DetailPage.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import SymbolLink from '#lib/features/settings-admin/pilots/SymbolLink.svelte';
	import { DISCLAIMER, NO_TRADES_YET } from '#lib/features/settings-admin/pilots/vm.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>{data.title} - Norviq</title>
</svelte:head>

{#snippet detailActions()}
	<a href="/pilots" class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
		>All pilots</a
	>
	{#if vm.following}
		<a
			href={vm.following.href}
			class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">View your follow</a
		>
	{/if}
	{#if vm.pilot.followHref}
		<a href={vm.pilot.followHref} class="btn-primary px-4 py-2 text-sm">Follow</a>
	{/if}
{/snippet}

<vigil.CanvasPage
	pageClass="pilot-detail-page"
	title={vm.pilot.name}
	subtitle={vm.pilot.kindLabel}
	actions={detailActions}
>
	{#if vm.pilot.updatedLabel}
		<p class="text-sm text-muted-foreground">{vm.pilot.updatedLabel}</p>
	{/if}
	{#if !vm.pilot.hasTrades}
		<p class="mt-4 text-sm" role="status">
			{NO_TRADES_YET +
				'. Norviq lists this pilot but has not seen a disclosed trade, so there is nothing to follow yet.'}
		</p>
	{/if}
	<vigil.Panel class="mt-6 p-5 md:p-6" titleID="pilot-notes-title">
		<vigil.PanelHeader id="pilot-notes-title" title="Before you follow" />
		<ul class="mt-3 space-y-2 text-sm text-muted-foreground" role="list">
			{#if vm.lagNote}
				<li>{vm.lagNote}</li>
			{/if}
			{#if vm.skippedPutsNote}
				<li>{vm.skippedPutsNote}</li>
			{/if}
			<li>{DISCLAIMER}</li>
		</ul>
	</vigil.Panel>
	{#if vm.weights.length > 0}
		<vigil.Panel class="mt-6 p-5 md:p-6" titleID="pilot-weights-title">
			<vigil.PanelHeader
				id="pilot-weights-title"
				title="Current book"
				desc="What a what-if portfolio follow would hold, by weight"
			/>
			<vigil.DataTable>
				<thead>
					<tr>
						<th>Symbol</th>
						<th>Weight</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.weights as row, i (i)}
						<tr>
							<td class="vigil-mono font-semibold"
								><SymbolLink symbol={row.symbol} href={row.symbolHref} /></td
							>
							<td class="vigil-mono tabular-nums">{row.weight}</td>
						</tr>
					{/each}
				</tbody>
			</vigil.DataTable>
		</vigil.Panel>
	{/if}
	{#if vm.disclosures.length > 0}
		<vigil.Panel class="mt-6 p-5 md:p-6" titleID="pilot-disclosures-title">
			<vigil.PanelHeader
				id="pilot-disclosures-title"
				title="Recent disclosures"
				desc="Newest first, as filed"
			/>
			<vigil.DataTable>
				<thead>
					<tr>
						<th>Symbol</th>
						<th>Trade</th>
						<th>Instrument</th>
						<th>Amount</th>
						<th>Traded</th>
						<th>Disclosed</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.disclosures as row, i (i)}
						<tr>
							<td class="vigil-mono font-semibold"
								><SymbolLink symbol={row.symbol} href={row.symbolHref} /></td
							>
							<td>{row.side}</td>
							<td class="text-muted-foreground">{row.instrument}</td>
							<td class="vigil-mono tabular-nums">{row.amount}</td>
							<td class="whitespace-nowrap tabular-nums">{row.traded}</td>
							<td class="whitespace-nowrap text-muted-foreground tabular-nums">{row.disclosed}</td>
						</tr>
					{/each}
				</tbody>
			</vigil.DataTable>
		</vigil.Panel>
	{/if}
</vigil.CanvasPage>
