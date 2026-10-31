<script lang="ts">
	// pages/portfolio/subpages.templ WatchlistQuote: the price cells the quote
	// poll replaces (Go swapped this div out-of-band by id).
	import type { WatchlistQuoteVM } from './types.js';

	let { row }: { row: WatchlistQuoteVM } = $props();

	const changeClass = $derived(
		row.changePositive ? 'overview-watchlist-change-up' : 'overview-watchlist-change-down'
	);
</script>

<div id={'watchlist-quote-' + row.id} class="watchlist-quote-cells contents">
	<span class="overview-watchlist-price">{row.price}</span>
	<span class={changeClass}>{row.netChg}</span>
	<span class={changeClass}>{row.changePercent}</span>
	<span class="overview-watchlist-price">{row.open}</span>
	<span class="overview-watchlist-price">{row.prevClose}</span>
	<span class="overview-watchlist-price">{row.high}</span>
	<span class="overview-watchlist-price">{row.low}</span>
</div>
