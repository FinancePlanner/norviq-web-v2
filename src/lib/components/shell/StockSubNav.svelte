<script lang="ts">
	import { page } from '$app/state';
	import { isActivePath, type NavItem } from '#lib/nav.js';

	let { symbol, tabs }: { symbol: string; tabs: NavItem[] } = $props();
</script>

<div class="stock-subnav-wrap mt-4">
	<nav class="stock-sub-nav" aria-label="{symbol} sections">
		{#each tabs as item (item.path)}
			<a href={item.path} aria-current={isActivePath(page.url.pathname, item.path) ? 'page' : undefined}>
				{item.label}
				{#if item.showProBadge}<span class="stock-pro-badge">Pro</span>{/if}
			</a>
		{/each}
	</nav>
</div>
