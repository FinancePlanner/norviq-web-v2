<script lang="ts">
	// crypto.MarketsShell + crypto.MarketsFragment — internal/pages/crypto/markets.templ.
	// Go lazy-loaded GET /crypto/markets/fragment?view&tf&size (hx-trigger="load")
	// into #crypto-markets; that handler made one backend call
	// (GET /v1/crypto/markets?timeframe&limit=100) and formatted it. Here a
	// TanStack query fetches the same endpoint through the /api proxy and the
	// view model is built in the browser. The toggles navigate to their
	// hx-push-url, which changes the props and so the query.
	import { goto } from '$app/navigation';
	import { createQuery } from '@tanstack/svelte-query';
	import EChart from '#lib/charts/EChart.svelte';
	import GrowthSparkline from '#lib/charts/GrowthSparkline.svelte';
	import { cryptoBubbles, marketHeatmapWithOptions } from '#lib/charts/index.js';
	import { EmptyState, SkeletonBlock } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { buildCryptoMarketsVM, cryptoMarketsPath, unavailableMarketsVM } from './markets.js';
	import type { AthRowVM, CoinRowVM, CryptoMarketsResponse, MarketsVM, ToggleOption } from './types.js';

	let { view, tf, size }: { view: string; tf: string; size: string } = $props();

	const query = createQuery(() => ({
		queryKey: ['crypto-markets', tf],
		queryFn: async (): Promise<{ tf: string; resp: CryptoMarketsResponse }> => {
			const res = await fetch(cryptoMarketsPath(tf), { headers: { accept: 'application/json' } });
			if (!res.ok) throw new Error(`crypto markets ${res.status}`);
			return { tf, resp: (await res.json()) as CryptoMarketsResponse };
		},
		// htmx left the old body in place until the new fragment arrived.
		placeholderData: (prev: { tf: string; resp: CryptoMarketsResponse } | undefined) => prev,
		retry: false
	}));

	const vm: MarketsVM | null = $derived.by(() => {
		if (query.isError) return unavailableMarketsVM(view, tf, size);
		const data = query.data;
		if (!data) return null;
		try {
			return buildCryptoMarketsVM(data.resp, view, data.tf, size);
		} catch {
			return unavailableMarketsVM(view, tf, size);
		}
	});

	const heatmap = $derived(
		vm?.heatmap
			? marketHeatmapWithOptions(vm.heatmap.id, vm.heatmap.tiles, {
					scaleMaxPct: vm.heatmap.scaleMaxPct,
					periodLabel: vm.heatmap.periodLabel,
					colorMode: vm.heatmap.colorMode
				})
			: null
	);
	const bubbles = $derived(
		vm?.bubbles
			? cryptoBubbles(vm.bubbles.id, vm.bubbles.nodes, {
					scaleMaxPct: vm.bubbles.scaleMaxPct,
					periodLabel: vm.bubbles.periodLabel,
					colorMode: vm.bubbles.colorMode,
					sizeBy: vm.bubbles.sizeBy
				})
			: null
	);

	function push(option: ToggleOption) {
		// hx-push-url without a scroll or focus reset.
		goto(option.pushURL, { reset: false });
	}
</script>

{#snippet toggleGroup(label: string, options: ToggleOption[])}
	<nav class="segmented-control" aria-label={label}>
		{#each options as option (option.label)}
			<button
				type="button"
				class={['segmented-link', option.active && 'segmented-link-active']}
				aria-pressed={String(option.active) as 'true' | 'false'}
				disabled={option.disabled}
				onclick={() => push(option)}
			>
				{option.label}
			</button>
		{/each}
	</nav>
{/snippet}

{#snippet coinLabel(symbol: string, name: string, href: string)}
	<div class="min-w-0">
		{#if href !== ''}
			<a class="font-semibold vigil-mono hover:text-[var(--color-tint)]" {href}>{symbol}</a>
		{:else}
			<span class="font-semibold vigil-mono">{symbol}</span>
		{/if}
		<p class="truncate text-xs text-muted-foreground">{name}</p>
	</div>
{/snippet}

{#snippet performersTable(title: string, periodLabel: string, rows: CoinRowVM[])}
	<vigil.Panel class="p-5 md:p-6">
		<h2 class="text-lg font-semibold">{title}</h2>
		{#if rows.length === 0}
			<p class="mt-4 text-sm text-muted-foreground">No coins moved this way over {periodLabel}.</p>
		{:else}
			<vigil.DataTable class="mt-4">
				<thead>
					<tr><th>Coin</th><th class="hidden sm:table-cell">7d</th><th class="text-right">Price</th><th class="text-right">{periodLabel}</th></tr>
				</thead>
				<tbody>
					{#each rows as row, i (i)}
						<tr>
							<td class="max-w-[12rem]">
								{@render coinLabel(row.symbol, row.name, row.href)}
							</td>
							<td class="hidden w-24 sm:table-cell">
								{#if row.sparkline}<GrowthSparkline points={row.sparkline.points} tone={row.sparkline.tone} />{/if}
							</td>
							<td class="text-right tabular-nums vigil-mono">{row.price}</td>
							<td class={['text-right font-semibold tabular-nums vigil-mono', row.changeClass]}>{row.change}</td>
						</tr>
					{/each}
				</tbody>
			</vigil.DataTable>
		{/if}
	</vigil.Panel>
{/snippet}

{#snippet athList(title: string, rows: AthRowVM[])}
	<div>
		<h3 class="text-sm font-semibold">{title}</h3>
		{#if rows.length === 0}
			<p class="mt-2 text-sm text-muted-foreground">None right now.</p>
		{:else}
			<ul class="mt-2 space-y-2">
				{#each rows as row, i (i)}
					<li class="flex items-start justify-between gap-3">
						{@render coinLabel(row.symbol, row.name, row.href)}
						<div class="text-right tabular-nums vigil-mono">
							<p class="text-sm font-semibold">{row.fromATH}</p>
							<p class="text-xs text-muted-foreground">
								{row.athDate}
								{#if row.sinceATL !== ''}
									· {row.sinceATL} from low
								{/if}
							</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/snippet}

<div id="crypto-markets" class="mt-6">
	{#if !vm}
		<SkeletonBlock heightClass="h-10 w-72 rounded-lg" />
		<div class="mt-4">
			<SkeletonBlock heightClass="h-96 rounded-lg" />
		</div>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-3">
			{@render toggleGroup('Timeframe', vm.timeframes)}
			{#if vm.view === 'bubbles' && vm.sizeOptions.length > 0}
				{@render toggleGroup('Bubble size', vm.sizeOptions)}
			{/if}
		</div>
		{#if vm.unavailable}
			<div class="mt-6">
				<EmptyState title="Crypto markets are warming up" description="Market data is temporarily unavailable. Try again in a minute." />
			</div>
		{:else}
			{#if vm.isStale}
				<p class="mt-4 text-sm text-muted-foreground" role="status">Showing the last available data; live prices are catching up.</p>
			{/if}
			<p class="mt-4 text-sm text-muted-foreground tabular-nums">
				Market cap {vm.totalMarketCap}
				{#if vm.btcDominance !== ''}
					· BTC dominance {vm.btcDominance}
				{/if}
				· {`${vm.advancers} up, ${vm.decliners} down`} ({vm.timeframeLabel})
			</p>
			{#if vm.view === 'bubbles'}
				<vigil.Panel class="mt-4 p-3 md:p-4">
					{#if !bubbles}
						<p class="p-4 text-sm text-muted-foreground">No coins have data for this timeframe.</p>
					{:else}
						<EChart {...bubbles} />
					{/if}
				</vigil.Panel>
			{:else}
				{#if heatmap}
					<vigil.Panel class="mt-4 p-4 md:p-5" titleID="crypto-heatmap-title">
						<div class="flex items-end justify-between gap-3 px-1">
							<h2 id="crypto-heatmap-title" class="text-lg font-semibold">Heat-map</h2>
							<span class="text-footnote text-muted-foreground">tile size = market cap · color = {vm.timeframeLabel}</span>
						</div>
						<div class="markets-heatmap mt-3">
							<EChart {...heatmap} />
						</div>
					</vigil.Panel>
				{/if}
				<vigil.CommandDeck class="is-2col mt-6">
					{@render performersTable(vm.gainersTitle, vm.timeframeLabel, vm.gainers)}
					{@render performersTable(vm.losersTitle, vm.timeframeLabel, vm.losers)}
				</vigil.CommandDeck>
				<vigil.Panel class="mt-6 p-5 md:p-6">
					<h2 class="text-lg font-semibold">All-time highs</h2>
					<p class="mt-1 text-sm text-muted-foreground">Coins with real liquidity only.</p>
					<div class="mt-4 grid gap-6 md:grid-cols-3">
						{@render athList('New highs (30 days)', vm.recentAths)}
						{@render athList('Closest to their high', vm.nearAth)}
						{@render athList('Furthest from their high', vm.drawdowns)}
					</div>
				</vigil.Panel>
			{/if}
			<p class="mt-4 text-xs text-muted-foreground">
				{#if vm.asOf !== ''}
					As of {vm.asOf}
				{/if}
				{#if vm.attribution !== ''}
					· {vm.attribution}
				{/if}
			</p>
		{/if}
	{/if}
</div>
