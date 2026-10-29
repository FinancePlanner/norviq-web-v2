<script lang="ts">
	// markets.Page + markets.Overview (the /markets/overview fragment).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { ConnectAgentPill, EmptyState, SkeletonBlock } from '#lib/components/norviq/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { marketHeatmap } from '#lib/charts/index.js';
	import EconomyNewsSection from '#lib/features/insights/economy/EconomyNewsSection.svelte';
	import type { MoverVM, OverviewVM } from '#lib/features/insights/markets/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Markets - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet actions()}
	<a href="/markets/earnings" class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" data-markets-earnings-link>Earnings calendar</a>
	<a href="/markets/congress" class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" data-markets-congress-link>Congressional trades</a>
	<ConnectAgentPill />
{/snippet}

{#snippet moversTable(title: string, movers: MoverVM[], positive: boolean)}
	<vigil.Panel class="p-5 md:p-6">
		<h2 class="text-lg font-semibold">{title}</h2>
		{#if movers.length === 0}
			<p class="mt-4 text-sm text-muted-foreground">No data right now.</p>
		{:else}
			<vigil.DataTable class="mt-4">
				<thead>
					<tr><th>Symbol</th><th>Name</th><th class="text-right">Price</th><th class="text-right">Today</th></tr>
				</thead>
				<tbody>
					{#each movers as mover, i (i)}
						<tr>
							<td class="tabular-nums font-semibold vigil-mono">
								<a class="hover:text-[var(--color-tint)]" href={'/portfolio/' + mover.symbol}>{mover.symbol}</a>
							</td>
							<td class="max-w-[12rem] truncate text-muted-foreground">{mover.name}</td>
							<td class="text-right tabular-nums vigil-mono">{mover.price}</td>
							<td
								class={[
									'text-right font-semibold tabular-nums vigil-mono',
									positive && 'text-[var(--color-success,#089981)]',
									!positive && 'text-[var(--color-danger)]'
								]}>{mover.change}</td
							>
						</tr>
					{/each}
				</tbody>
			</vigil.DataTable>
		{/if}
	</vigil.Panel>
{/snippet}

{#snippet overview(vm: OverviewVM)}
	{@const heatmap = marketHeatmap('markets_heatmap', vm.heatmapTiles)}
	{#if vm.indices.length > 0}
		<vigil.CommandDeck class="is-2col mt-6">
			{#each vm.indices as index, i (i)}
				<vigil.Panel class="p-4">
					<p class="text-footnote font-semibold text-muted-foreground">
						{index.label}
						{#if index.isProxy}
							<span class="ml-1 font-normal">({index.proxy})</span>
						{/if}
					</p>
					<p class="command-metric-value mt-1">{index.price}</p>
					<p
						class={[
							'mt-1 text-sm font-semibold tabular-nums vigil-mono',
							index.changePct >= 0 && 'text-[var(--color-success,#089981)]',
							index.changePct < 0 && 'text-[var(--color-danger)]'
						]}
					>
						{index.change}
					</p>
				</vigil.Panel>
			{/each}
		</vigil.CommandDeck>
	{/if}
	{#if heatmap}
		<vigil.Panel class="mt-6 p-4 md:p-5" titleID="markets-heatmap-title">
			<div class="flex items-end justify-between gap-3 px-1">
				<h2 id="markets-heatmap-title" class="text-lg font-semibold">Heat-map</h2>
				<span class="text-footnote text-muted-foreground">Top 150 by market cap · tile size = cap · color = today</span>
			</div>
			<div class="markets-heatmap mt-3">
				<EChart {...heatmap} />
			</div>
		</vigil.Panel>
	{/if}
	<vigil.CommandDeck class="is-2col mt-6">
		{@render moversTable('Top gainers', vm.gainers, true)}
		{@render moversTable('Top losers', vm.losers, false)}
	</vigil.CommandDeck>
	{#if vm.asOf}
		<p class="mt-4 text-xs text-muted-foreground">As of {vm.asOf}</p>
	{/if}
	{#if vm.indices.length === 0 && !heatmap && vm.gainers.length === 0 && vm.losers.length === 0}
		<div class="mt-6">
			<EmptyState title="Markets are warming up" description="Market data is temporarily unavailable. Try again in a minute." />
		</div>
	{/if}
{/snippet}

<div class="app-page-content vigil-deck-page markets-page markets-modern-page">
	<vigil.ModernPageHeader title="Markets" {actions} />
	<div id="markets-overview">
		{#await data.overview}
			<div aria-hidden="true">
				<div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
					<SkeletonBlock heightClass="h-24 rounded-lg" />
					<SkeletonBlock heightClass="h-24 rounded-lg" />
					<SkeletonBlock heightClass="h-24 rounded-lg" />
					<SkeletonBlock heightClass="h-24 rounded-lg" />
				</div>
				<SkeletonBlock heightClass="mt-6 h-96 rounded-lg" />
				<div class="mt-6 grid gap-5 lg:grid-cols-2">
					<SkeletonBlock heightClass="h-64 rounded-lg" />
					<SkeletonBlock heightClass="h-64 rounded-lg" />
				</div>
			</div>
		{:then vm}
			{@render overview(vm)}
		{/await}
	</div>
	<div id="markets-headlines" class="mt-6">
		{#await data.headlines}
			<section class="glass-card p-5 md:p-6" aria-hidden="true">
				<h2 class="text-lg font-semibold">Headlines</h2>
				<div class="mt-4 space-y-3">
					<SkeletonBlock heightClass="h-10 rounded-xl" />
					<SkeletonBlock heightClass="h-10 rounded-xl" />
				</div>
			</section>
		{:then items}
			<EconomyNewsSection {items} />
		{/await}
	</div>
</div>
