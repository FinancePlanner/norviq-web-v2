<script lang="ts">
	import { page } from '$app/state';
	import { isActivePath, type NavItem } from '#lib/nav.js';

	// activePath: Go's StockDetail passed "/portfolio/<lower symbol>[/tab]", so
	// /portfolio/AAPL still marks its tab; defaults to the current path.
	let { symbol, tabs, activePath }: { symbol: string; tabs: NavItem[]; activePath?: string } = $props();
	const current = $derived(activePath ?? page.url.pathname);
</script>

<div class="stock-subnav-wrap mt-4">
	<nav class="stock-sub-nav" aria-label="{symbol} sections">
		{#each tabs as item (item.path)}
			<a href={item.path} aria-current={isActivePath(current, item.path) ? 'page' : undefined}>
				{item.label}
				{#if item.showProBadge}<span class="stock-pro-badge">Pro</span>{/if}
			</a>
		{/each}
	</nav>
</div>
