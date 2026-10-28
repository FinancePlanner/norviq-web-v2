<script lang="ts">
	// components.SegmentedControl(items, activePath). activePath defaults to the
	// current URL path; matching is nav.IsActivePath (exact, trailing slash ignored).
	import { page } from '$app/state';
	import { isActivePath } from '#lib/nav.js';
	import type { SegmentItem } from './types.js';

	let { items, activePath }: { items: SegmentItem[]; activePath?: string } = $props();
	const current = $derived(activePath ?? page.url.pathname);
</script>

<nav class="segmented-control" aria-label="Section tabs">
	{#each items as item (item.path)}
		<a
			href={item.path}
			class={isActivePath(current, item.path) ? 'segmented-link segmented-link-active' : 'segmented-link'}
		>
			{item.label}
		</a>
	{/each}
</nav>
