<script lang="ts">
	// pages/portfolio/row.templ PositionQuote. The quote poll replaces `row`;
	// flashOnChange stands in for NorviqMotion's flash after the htmx OOB swap.
	import { flashOnChange } from '#lib/motion.js';
	import type { PositionQuoteVM } from './types.js';

	let { row }: { row: PositionQuoteVM } = $props();

	const direction = (positive: boolean) => (positive ? 'up' : 'down');
	const changeClass = (positive: boolean) =>
		positive
			? 'portfolio-row-trend overview-watchlist-change-up'
			: 'portfolio-row-trend overview-watchlist-change-down';
</script>

<div id={'position-quote-' + row.id} class="portfolio-row-quote text-right tabular-nums">
	<p
		class="portfolio-row-value"
		data-direction={direction(row.changePositive)}
		{@attach flashOnChange(() => row.marketValue, { direction: () => row.changePositive })}
	>
		{row.marketValue}
	</p>
	<p
		class={changeClass(row.changePositive)}
		data-direction={direction(row.changePositive)}
		{@attach flashOnChange(() => row.todayGL + row.chgPct, { direction: () => row.changePositive })}
	>
		Today: {row.todayGL} ({row.chgPct})
	</p>
	<p class={changeClass(row.totalPositive)}>
		Total: {row.totalGL} ({row.totalGLPct})
	</p>
</div>
