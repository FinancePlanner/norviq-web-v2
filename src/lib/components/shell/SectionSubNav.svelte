<script lang="ts">
	import { page } from '$app/state';
	import { isActivePath } from '#lib/nav.js';
	import type { NavItemVM } from '#lib/nav/visible.js';

	// The chips come from subNavLinks. No NavBadge here: the sidebar pick is the
	// one place that polls a badge URL (Groups unread).
	let { links, activePath }: { links: NavItemVM[]; activePath?: string } = $props();
</script>

<nav class="section-subnav" aria-label="Section navigation">
	{#each links as item (item.path)}
		<a
			href={item.path}
			class={isActivePath(activePath ?? page.url.pathname, item.path)
				? 'section-subnav-link section-subnav-link-active'
				: 'section-subnav-link'}
		>
			{item.label}
			{#if item.showProBadge}<span class="pro-badge pro-badge-sm">Pro</span>{/if}
		</a>
	{/each}
</nav>
