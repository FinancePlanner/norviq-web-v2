<script lang="ts">
	// crypto.CoinPage(vm) — internal/pages/crypto/coin.templ.
	import EChart from '#lib/charts/EChart.svelte';
	import { priceLine } from '#lib/charts/index.js';
	import { EmptyState } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import type { CoinPageVM } from './types.js';

	let { vm }: { vm: CoinPageVM } = $props();
	const chart = $derived(vm.chart ? priceLine(vm.chart.id, vm.chart.labels, vm.chart.closes) : null);
</script>

<div class="app-page-content vigil-deck-page crypto-page crypto-modern-page">
	<a href="/crypto/market" class="text-sm font-semibold text-muted-foreground">← Crypto markets</a>
	<div class="mt-3 flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold">{vm.name}</h1>
			<p class="text-sm text-muted-foreground vigil-mono">{vm.symbol}</p>
		</div>
		{#if vm.price !== ''}
			<div class="text-right vigil-mono tabular-nums">
				<p class="text-3xl font-bold">{vm.price}</p>
				<p class={['text-sm font-semibold', vm.changeClass]}>{vm.change} today</p>
			</div>
		{/if}
	</div>
	{#if vm.errorMessage !== ''}
		<div class="mt-6">
			<EmptyState title={vm.errorMessage} description="Try again in a minute." />
		</div>
	{:else}
		<vigil.Panel class="mt-6 p-4 md:p-5">
			<nav class="segmented-control" aria-label="Chart range">
				{#each vm.ranges as r (r.href)}
					<a href={r.href} class={['segmented-link', r.active && 'segmented-link-active']}>{r.label}</a>
				{/each}
			</nav>
			{#if !chart}
				<p class="mt-4 text-sm text-muted-foreground">No price history for {vm.rangeLabel}.</p>
			{:else}
				<div class="mt-4">
					<EChart {...chart} />
				</div>
			{/if}
		</vigil.Panel>
		{#if vm.stats.length > 0}
			<vigil.Panel class="mt-6 p-5 md:p-6">
				<dl class="grid grid-cols-2 gap-4 md:grid-cols-3">
					{#each vm.stats as stat (stat.label)}
						<div>
							<dt class="text-xs text-muted-foreground">{stat.label}</dt>
							<dd class="mt-1 font-semibold tabular-nums vigil-mono">{stat.value}</dd>
						</div>
					{/each}
				</dl>
			</vigil.Panel>
		{/if}
	{/if}
</div>
