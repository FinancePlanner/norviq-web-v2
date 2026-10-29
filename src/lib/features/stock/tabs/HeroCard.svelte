<script lang="ts">
	// stock.HeroCard + StockHeroQuote + StockPeriodReturns, and the quote poll
	// (hx-get /portfolio/{SYMBOL}/quote, "load, every 20s [visible],
	// visibilitychange [visible]", out-of-band swaps of the quote row and the
	// "Updated" line).
	import { createQuery } from '@tanstack/svelte-query';
	import HeroMetric from './HeroMetric.svelte';
	import type { DetailViewModel, QuoteVM } from '../detail.js';

	let { vm }: { vm: DetailViewModel } = $props();

	const quoteQuery = createQuery(() => ({
		queryKey: ['stock-quote', vm.symbol],
		queryFn: async (): Promise<QuoteVM | null> => {
			const res = await fetch(`/portfolio/${vm.symbol}/quote`, {
				headers: { accept: 'application/json' }
			});
			if (!res.ok) return null;
			return (await res.json()) as QuoteVM;
		},
		refetchInterval: 20_000,
		refetchOnWindowFocus: true,
		staleTime: 0,
		retry: false
	}));
	// A failed poll leaves the last swap in place (htmx does not swap errors).
	let last = $state<QuoteVM | null>(null);
	$effect(() => {
		if (quoteQuery.data) last = quoteQuery.data;
	});

	const quote = $derived(
		last ?? {
			symbol: vm.symbol,
			hasPosition: vm.hasPosition,
			currentPrice: vm.currentPrice,
			changePercent: vm.changePercent,
			changeClass: vm.changeClass,
			positionValue: vm.positionValue,
			costBasis: vm.costBasis,
			updatedAt: ''
		}
	);

	// A down day used to come back unstyled; only "negative" is red.
	const changeSentiment = (c: string) => (c === 'negative' ? 'is-negative' : 'is-positive');
	const periodSentiment = (c: string) =>
		c === 'negative' ? 'is-negative' : c === 'positive' ? 'is-positive' : '';
	const orDash = (v: string) => (v.trim() === '' ? '—' : v);
</script>

<div class="stock-hero-card glass-card card-hero card-hover p-6 md:p-8">
	<div class="flex items-start gap-4">
		<div class="portfolio-row-avatar stock-hero-avatar" aria-hidden="true">
			<span>{vm.symbolInitial}</span>
		</div>
		<div class="min-w-0 flex-1">
			<p class="stock-hero-symbol">{vm.symbol}</p>
			<p class="stock-hero-company">{vm.companyName}</p>
			{#if vm.companyMeta !== ''}<p class="stock-hero-meta">{vm.companyMeta}</p>{/if}
			{#if vm.positionLine !== ''}<p class="stock-hero-position">{vm.positionLine}</p>{/if}
		</div>
	</div>
	<div id={'stock-hero-quote-' + vm.symbol} class="portfolio-metric-row mt-6">
		<HeroMetric label="Current price" value={quote.currentPrice} />
		<HeroMetric
			label="Day change"
			value={quote.changePercent}
			sentiment={changeSentiment(quote.changeClass)}
		/>
		{#if quote.hasPosition}
			<HeroMetric label="Position" value={quote.positionValue} />
			<HeroMetric label="Cost basis" value={quote.costBasis} />
		{/if}
	</div>
	<div
		id={'stock-period-returns-' + vm.symbol}
		class="portfolio-metric-row mt-4"
		aria-label="Period returns"
	>
		<HeroMetric
			label="3M"
			value={orDash(vm.return3M)}
			sentiment={periodSentiment(vm.return3MClass)}
		/>
		<HeroMetric
			label="6M"
			value={orDash(vm.return6M)}
			sentiment={periodSentiment(vm.return6MClass)}
		/>
		<HeroMetric
			label="YTD"
			value={orDash(vm.returnYTD)}
			sentiment={periodSentiment(vm.returnYTDClass)}
		/>
	</div>
	{#if quote.updatedAt === ''}
		<p
			id={'stock-hero-quote-updated-' + vm.symbol}
			class="mt-3 text-xs text-muted-foreground"
			hidden
		></p>
	{:else}
		<!-- The OOB swap replaced the <p> with one that has no mt-3 (quote_refresh.templ). -->
		<p id={'stock-hero-quote-updated-' + vm.symbol} class="text-xs text-muted-foreground">
			Updated {quote.updatedAt}
		</p>
	{/if}
</div>
