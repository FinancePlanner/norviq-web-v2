<script lang="ts">
	// pages/portfolio/hero.templ HeroCard: the portfolio figure on the page
	// surface, the range change as a delta chip, the chart and the range picker.
	// DS 2.0 P1: the figure is in the data's currency, the change carries the
	// range it was measured over, and stale, short or mixed-currency history
	// says so instead of drawing a trend.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { wealthLine } from '#lib/charts/index.js';
	import { locale, t } from '#lib/i18n/context.svelte.js';
	import SentimentRollup from '../SentimentRollup.svelte';
	import type { HoldingsViewModel } from './types.js';

	let { vm }: { vm: HoldingsViewModel } = $props();

	const hero = $derived(vm.hero);
	// charts.WealthLine("portfolio-chart", labels, values), as the Go loader built it.
	const chart = $derived(
		vm.chartLabels.length > 0
			? wealthLine('portfolio-chart', vm.chartLabels, vm.chartValues, {
					currency: vm.hero?.currency,
					locale: locale()
				})
			: null
	);
	const sentiment = (d: 'up' | 'down' | 'flat') =>
		d === 'up' ? 'positive' : d === 'down' ? 'negative' : '';
</script>

{#snippet delta()}
	{#if hero?.delta}
		<vigil.HeroDelta
			text={`${hero.delta.text} ${hero.delta.basis}`}
			sentiment={sentiment(hero.delta.direction)}
		/>
	{/if}
{/snippet}

<vigil.Hero label={vm.heroLabel} value={vm.totalValue} {delta}>
	{#if vm.heroSubtitle !== ''}
		<p class="text-subhead text-muted-foreground">{vm.heroSubtitle}</p>
	{/if}
	{#if hero?.mixedCaption}
		<p class="text-caption text-muted-foreground">{hero.mixedCaption}</p>
	{/if}
	{#if hero?.asOfCaption}
		<p class="text-caption text-muted-foreground">{hero.asOfCaption}</p>
	{/if}
	<SentimentRollup vm={vm.sentiment} />
	<div class="portfolio-hero-chart mt-2 min-h-[160px] md:min-h-[180px]">
		{#if chart}
			<EChart {...chart} />
		{:else if hero?.historyNote}
			<p class="text-subhead text-muted-foreground">{hero.historyNote}</p>
		{/if}
	</div>
	<nav class="segmented-control" aria-label={t('Chart range')}>
		{#each hero?.rangeLinks ?? [] as link (link.range)}
			<a
				href={link.href}
				class={link.current ? 'segmented-link segmented-link-active' : 'segmented-link'}
				aria-current={link.current ? 'page' : undefined}>{link.range}</a
			>
		{/each}
	</nav>
</vigil.Hero>
