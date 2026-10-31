<script lang="ts">
	// pages/portfolio/onepage.templ OnePage: every position that matters on one
	// screen (and one printed A4 page), plus the public-link controls.
	import { SecondaryButton } from '#lib/components/norviq/index.js';
	import SharePanel from '#lib/features/portfolio/holdings/SharePanel.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>One-page portfolio - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

<div class="app-page-content vigil-document-page portfolio-onepage">
	<header class="flex items-start justify-between gap-4">
		<div>
			<p class="text-sm text-muted-foreground">Portfolio</p>
			<h1 class="text-3xl font-semibold tabular-nums">{vm.totalValue}</h1>
			<p class="text-sm text-muted-foreground">{vm.heroSubtitle} · {vm.trendLabel}</p>
		</div>
		<div class="portfolio-onepage-actions flex gap-2">
			<SecondaryButton href={'/portfolio?portfolio=' + vm.portfolioID}>Full view</SecondaryButton>
			<SecondaryButton onclick={() => window.print()}>Print</SecondaryButton>
		</div>
	</header>
	{#if vm.hasLoadError}
		<p class="mt-4 text-sm text-danger" role="alert">Some data could not be loaded.</p>
	{/if}
	<table class="mt-4 w-full text-sm tabular-nums">
		<thead class="text-muted-foreground">
			<tr>
				<th scope="col" class="py-2 text-left font-medium">Symbol</th>
				<th scope="col" class="py-2 text-right font-medium">Weight</th>
				<th scope="col" class="py-2 text-right font-medium">Value</th>
				<th scope="col" class="py-2 text-right font-medium">Return</th>
				<th scope="col" class="py-2 text-right font-medium">Today</th>
			</tr>
		</thead>
		<tbody>
			{#each vm.rows as row, i (i)}
				<tr class="border-t">
					<td class="py-1 font-medium">{row.symbol}</td>
					<td class="py-1 text-right">{row.weight}</td>
					<td class="py-1 text-right">{row.marketValue}</td>
					<td class={['py-1 text-right', row.totalPositive ? 'text-success' : 'text-danger']}
						>{row.totalGLPct}</td
					>
					<td class={['py-1 text-right', row.changePositive ? 'text-success' : 'text-danger']}
						>{row.chgPct}</td
					>
				</tr>
			{/each}
			{#if vm.other !== ''}
				<tr class="border-t text-muted-foreground">
					<td class="py-1">Other</td>
					<td class="py-1 text-right">{vm.other}</td>
					<td></td>
					<td></td>
					<td></td>
				</tr>
			{/if}
		</tbody>
	</table>
	{#if vm.rows.length === 0}
		<p class="mt-6 text-center text-muted-foreground">No holdings yet</p>
	{/if}
	<div class="portfolio-onepage-share mt-6">
		<SharePanel vm={vm.share} />
	</div>
</div>
