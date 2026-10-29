<script lang="ts">
	import { page } from '$app/state';
	import { isActivePath, type NavItem } from '#lib/nav.js';

	let { items, activePath }: { items: NavItem[]; activePath?: string } = $props();
</script>

<nav class="section-subnav" aria-label="Section navigation">
	{#each items as item (item.path)}
		<a
			href={item.path}
			class={isActivePath(activePath ?? page.url.pathname, item.path) ? 'section-subnav-link section-subnav-link-active' : 'section-subnav-link'}
		>
			{item.label}
			{#if item.showProBadge}<span class="pro-badge pro-badge-sm">Pro</span>{/if}
		</a>
	{/each}
</nav>
