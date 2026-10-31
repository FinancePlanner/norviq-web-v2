<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';

	// Lazy count beside a sidebar label (Go: hx-get badgeURL, "load, every 60s").
	// The badge endpoint returns JSON { count: number }.
	let { url }: { url: string } = $props();

	const query = createQuery(() => ({
		queryKey: ['nav-badge', url],
		queryFn: async () => {
			const res = await fetch(url, { headers: { accept: 'application/json' } });
			if (!res.ok) return 0;
			return ((await res.json()) as { count?: number }).count ?? 0;
		},
		refetchInterval: 60_000
	}));
</script>

{#if (query.data ?? 0) > 0}
	<span class="nav-unread-badge" aria-label="{query.data} unread"
		>{(query.data ?? 0) > 99 ? '99+' : query.data}</span
	>
{/if}
