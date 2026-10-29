<script lang="ts">
	// pages/portfolio/sentiment_rollup.templ
	import SentimentBadge from '#lib/components/norviq/SentimentBadge.svelte';
	import type { SentimentRollupVM } from './sentiment.js';

	let { vm }: { vm: SentimentRollupVM } = $props();
</script>

{#if vm.show}
	<div class="portfolio-sentiment-rollup mt-4 rounded-lg border border-border p-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<span class="text-footnote text-muted-foreground">Retail sentiment</span>
				<SentimentBadge vm={vm.badge} />
			</div>
			<a href="/markets/sentiment" class="text-xs underline text-muted-foreground hover:opacity-100">See what's trending</a>
		</div>
		<p class={['mt-1 text-xs', !vm.coverageThin && 'opacity-60', vm.coverageThin && 'text-amber-500']}>
			{#if vm.coverageThin}
				Based on {vm.coverageLabel} — too thin to speak for the whole portfolio.
			{:else}
				Based on {vm.coverageLabel}.
			{/if}
		</p>
		{#if vm.mostBullish || vm.mostBearish}
			<p class="mt-1 text-xs text-muted-foreground">
				{#if vm.mostBullish}<span>{vm.mostBullish}</span>{/if}
				{#if vm.mostBullish && vm.mostBearish}<span> · </span>{/if}
				{#if vm.mostBearish}<span>{vm.mostBearish}</span>{/if}
			</p>
		{/if}
	</div>
{/if}
