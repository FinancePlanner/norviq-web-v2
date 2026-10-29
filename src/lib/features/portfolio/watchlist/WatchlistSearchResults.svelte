<script lang="ts">
	// pages/portfolio/subpages.templ WatchlistSearchResults. Each "Add" is a
	// submit button named `symbol`, so it must sit inside a form that posts to
	// the watchlist page's ?/add action with a `list_id` field (Go: hx-post
	// /portfolio/watchlist/items with hx-vals {symbol, list_id}).
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import type { WatchlistSearchResultVM } from './types.js';

	let { results, query }: { results: WatchlistSearchResultVM[]; query: string } = $props();
</script>

{#if query === ''}
	<p class="pines-search-hint text-sm text-muted-foreground">Type to search symbols</p>
{:else if results.length === 0}
	<p class="pines-search-hint text-sm text-muted-foreground">No matches for "{query}"</p>
{:else}
	<ul class="pines-search-results mt-2">
		{#each results as row (row.symbol + row.exchange)}
			<li class="pines-search-result">
				<div>
					<p class="font-semibold">{row.symbol}</p>
					{#if row.name !== ''}
						<p class="text-sm text-muted-foreground">{row.name}</p>
					{/if}
				</div>
				<NativeButton type="submit" name="symbol" value={row.symbol} class="btn-secondary px-3 py-1.5 text-sm">Add</NativeButton>
			</li>
		{/each}
	</ul>
{/if}
