<script lang="ts">
	// dashboard.MarketBriefShell(src): lazy-loads the card and refreshes it every
	// 15 minutes (Go: hx-trigger="load, every 900s"). Previous / Latest swap the
	// card in place. `src` returns { vm } JSON; vm null = render nothing.
	import { createQuery } from '@tanstack/svelte-query';
	import MarketBriefCard from './MarketBriefCard.svelte';
	import { MarketBriefShellID, type MarketBriefVM } from './types.js';

	let { src }: { src: string } = $props();
	let current = $state<string | null>(null);
	const url = $derived(current ?? src);

	const query = createQuery(() => ({
		queryKey: ['market-brief', url],
		queryFn: async (): Promise<MarketBriefVM | null> => {
			const res = await fetch(url, { headers: { accept: 'application/json' } });
			if (!res.ok) throw new Error(`market brief ${res.status}`);
			return ((await res.json()) as { vm: MarketBriefVM | null }).vm;
		},
		refetchInterval: 900_000,
		// Ambient card: a failed load leaves whatever is showing.
		placeholderData: (prev: MarketBriefVM | null | undefined) => prev,
		retry: false
	}));
</script>

<div id={MarketBriefShellID} data-market-brief-shell>
	{#if query.data}
		<MarketBriefCard vm={query.data} onnavigate={(next) => (current = next)} />
	{/if}
</div>
