<script lang="ts">
	// dashboard.NewsTickerShell / NewsTickerCard: polled every 5 minutes (Go:
	// hx-trigger="load, every 300s"). A disabled ticker, an empty one or a failed
	// fetch renders nothing, so the shell collapses.
	import { createQuery } from '@tanstack/svelte-query';
	import type { components } from '#lib/api/schema.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import NewsHeadlineList from '#lib/components/norviq/NewsHeadlineList.svelte';
	import { mapNewsTicker, type NewsTickerVM } from './headlines.js';

	const query = createQuery(() => ({
		queryKey: ['dashboard-news-ticker'],
		queryFn: async (): Promise<NewsTickerVM | null> => {
			const res = await fetch('/api/v1/news/ticker?limit=12', { headers: { accept: 'application/json' } });
			if (!res.ok) return null;
			return mapNewsTicker((await res.json()) as components['schemas']['NewsTickerResponse']);
		},
		refetchInterval: 300_000,
		retry: false
	}));
	const vm = $derived(query.data);
</script>

<div id="news-ticker-panel">
	{#if vm && vm.enabled && vm.items.length > 0}
		<vigil.Panel class="news-ticker-panel rounded-lg p-5" titleID="news-ticker-title">
			<div class="financial-health-panel-header">
				<p class="dash-panel-label" id="news-ticker-title">Breaking news</p>
				<a href="/settings/news-ticker" class="dash-panel-link">Manage</a>
			</div>
			<div class="mt-2">
				<NewsHeadlineList items={vm.items} />
			</div>
			<p class="mt-3 text-xs text-muted-foreground">
				{#if vm.stale}
					Some sources are temporarily unavailable; showing recent headlines.
				{:else}
					Headlines via publishers' own feeds. Links open the publisher.
				{/if}
			</p>
		</vigil.Panel>
	{/if}
</div>
