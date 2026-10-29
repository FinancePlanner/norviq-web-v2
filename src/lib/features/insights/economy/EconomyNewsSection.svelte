<script lang="ts">
	// economy.EconomyNewsSection(items) — the Go /economy/news fragment, now a
	// component. No fetching here: the caller loads loadEconomyPulse(event, 8)
	// (Go LoadMarketHeadlines) and passes `items`; null/[] renders the empty state.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import EmptyState from '#lib/components/norviq/EmptyState.svelte';
	import NewsHeadlineList, { type NewsHeadlineVM } from '#lib/components/norviq/NewsHeadlineList.svelte';

	let { items }: { items: NewsHeadlineVM[] | null } = $props();
</script>

<vigil.Panel class="mt-6 rounded-lg p-5 md:p-6" titleID="economy-news-title">
	<div class="flex items-end justify-between gap-3">
		<h2 id="economy-news-title" class="text-lg font-semibold">Economy headlines</h2>
		<span class="text-xs text-muted-foreground">Market wire</span>
	</div>
	{#if !items || items.length === 0}
		<div class="mt-4">
			<EmptyState title="No headlines right now" description="Market news refreshes every few minutes. Check back soon." />
		</div>
	{:else}
		<div class="mt-2">
			<NewsHeadlineList {items} />
		</div>
	{/if}
</vigil.Panel>
