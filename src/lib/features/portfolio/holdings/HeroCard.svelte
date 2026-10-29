<script lang="ts">
	// pages/portfolio/hero.templ HeroCard: the portfolio figure on the page
	// surface, the period trend as a delta chip, the chart and the range picker.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { wealthLine } from '#lib/charts/index.js';
	import SentimentRollup from '../SentimentRollup.svelte';
	import type { HoldingsViewModel } from './types.js';

	let { vm }: { vm: HoldingsViewModel } = $props();

	// charts.WealthLine("portfolio-chart", labels, values), as the Go loader built it.
	const chart = $derived(vm.chartLabels.length > 0 ? wealthLine('portfolio-chart', vm.chartLabels, vm.chartValues) : null);

	/** trendSentiment: the sign the server already formatted into the label. */
	function trendSentiment(label: string): '' | 'positive' | 'negative' {
		const t = label.trim();
		if (t.startsWith('+')) return 'positive';
		if (t.startsWith('-')) return 'negative';
		return '';
	}
</script>

{#snippet delta()}
	{#if vm.trendLabel !== ''}
		<vigil.HeroDelta text={vm.trendLabel} sentiment={trendSentiment(vm.trendLabel)} />
	{/if}
{/snippet}

<vigil.Hero label={vm.heroLabel} value={vm.totalValue} {delta}>
	{#if vm.heroSubtitle !== ''}
		<p class="text-subhead text-muted-foreground">{vm.heroSubtitle}</p>
	{/if}
	<SentimentRollup vm={vm.sentiment} />
	<div class="portfolio-hero-chart mt-2 min-h-[160px] md:min-h-[180px]">
		{#if chart}<EChart {...chart} />{/if}
	</div>
	<nav class="segmented-control" aria-label="Chart range">
		{#each vm.timeRanges as r (r)}
			<a
				href={'/portfolio?range=' + r}
				class={vm.selectedTimeRange === r ? 'segmented-link segmented-link-active' : 'segmented-link'}
				aria-current={vm.selectedTimeRange === r ? 'page' : undefined}>{r}</a
			>
		{/each}
	</nav>
</vigil.Hero>
