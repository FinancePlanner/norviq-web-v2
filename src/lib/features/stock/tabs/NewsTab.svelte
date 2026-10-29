<script lang="ts">
	// stock.NewsTab + StockNewsCard
	import { EmptyState } from '#lib/components/norviq/index.js';
	import { staggerOnMount } from '#lib/motion.js';
	import type { NewsArticleVM, NewsTabVM } from '../detail.js';

	let { vm }: { vm: NewsTabVM } = $props();

	/** stockNewsArticleViewURL: url.Values.Encode() sorts keys. */
	function viewURL(a: NewsArticleVM): string {
		const values: [string, string][] = [
			['headline', a.headline],
			...(a.symbol !== '' ? ([['symbol', a.symbol]] as [string, string][]) : []),
			['url', a.url]
		];
		return '/news/view?' + new URLSearchParams(values).toString();
	}
</script>

{#snippet inner(article: NewsArticleVM)}
	<div class="flex items-center gap-2 text-xs text-muted-foreground">
		<span>{article.source}</span>
		{#if article.date !== ''}
			<span aria-hidden="true">·</span>
			<time>{article.date}</time>
		{/if}
	</div>
	<h3 class="news-card-headline mt-2 text-base leading-snug font-semibold">{article.headline}</h3>
{/snippet}

<div class="mt-6 space-y-3" {@attach staggerOnMount(':scope > a, :scope > article', 30)}>
	{#if vm.hasData}
		{#each vm.articles as article, i (i)}
			{#if article.url !== ''}
				<a
					href={viewURL(article)}
					class="news-card glass-card block p-5 transition hover:brightness-[1.02]"
					target="_blank"
					rel="noopener noreferrer"
				>
					{@render inner(article)}
				</a>
			{:else}
				<article class="news-card glass-card p-5">
					{@render inner(article)}
				</article>
			{/if}
		{/each}
	{:else}
		<EmptyState
			title="No news yet"
			description="Recent headlines for this symbol will appear here."
		/>
	{/if}
</div>
