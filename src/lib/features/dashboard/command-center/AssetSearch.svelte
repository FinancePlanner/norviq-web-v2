<script lang="ts">
	// components.PinesSearchField("/dashboard/search", "asset-search-results")
	// + dashboard.AssetSearchResults. Results come from GET /dashboard/search
	// (JSON; Go aggregated search + period returns server-side).
	import { createQuery } from '@tanstack/svelte-query';
	import PinesSearchField from '#lib/components/norviq/PinesSearchField.svelte';
	import type { SearchResultVM } from '../panels/types.js';

	let query = $state('');
	let searched = $state('');

	const results = createQuery(() => ({
		queryKey: ['dashboard-search', searched],
		queryFn: async (): Promise<SearchResultVM[]> => {
			const res = await fetch('/dashboard/search?q=' + encodeURIComponent(searched), { headers: { accept: 'application/json' } });
			if (!res.ok) return [];
			return ((await res.json()) as { results: SearchResultVM[] }).results;
		},
		enabled: searched.trim() !== '',
		staleTime: 60_000
	}));

	const spoken: Record<string, string> = { '3M': '3 month', '6M': '6 month', YTD: 'year to date' };
	const orDash = (v: string) => (v.trim() === '' ? '—' : v);
	const returnClass = (c: string) => (c === 'negative' ? 'is-negative' : c === 'positive' ? 'is-positive' : '');
</script>

{#snippet chip(label: string, value: string, changeClass: string)}
	<span class={['pines-search-return', returnClass(changeClass)]} aria-label={(spoken[label] ?? label) + ' ' + orDash(value)}>
		<span class="pines-search-return-label">{label}</span>
		<span class="pines-search-return-value">{orDash(value)}</span>
	</span>
{/snippet}

{#snippet list(_typed: string)}
	{@const q = searched.trim()}
	{#if q === ''}
		<p class="pines-search-empty">Type a symbol or company name</p>
	{:else if results.data && results.data.length === 0}
		<p class="pines-search-empty">No matches for “{q}”</p>
	{:else if results.data}
		<ul class="pines-search-list" role="listbox">
			{#each results.data as row, i (i)}
				<li role="option" aria-selected="false">
					<a href={row.href} class="pines-search-row">
						<span class="pines-search-identity">
							<span class="pines-search-symbol">{row.symbol}</span>
							<span class="pines-search-name">{row.name}</span>
							{#if row.exchange}
								<span class="pines-search-exchange">{row.exchange}</span>
							{/if}
						</span>
						{#if row.return3M || row.return6M || row.returnYTD}
							<span class="pines-search-returns" aria-label="Period returns">
								{@render chip('3M', row.return3M, row.return3MClass)}
								{@render chip('6M', row.return6M, row.return6MClass)}
								{@render chip('YTD', row.returnYTD, row.returnYTDClass)}
							</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<PinesSearchField resultsId="asset-search-results" bind:query onsearch={(q) => (searched = q)} results={list} />
