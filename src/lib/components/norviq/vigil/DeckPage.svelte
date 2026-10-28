<script lang="ts">
	// vigil.DeckPage(pageClass, title, subtitle, actions) { children } — metric strip plus modules on a shared gap.
	import type { Snippet } from 'svelte';
	import ModernPage from './ModernPage.svelte';

	let {
		pageClass = '',
		title,
		subtitle = '',
		actions,
		children
	}: { pageClass?: string; title: string; subtitle?: string; actions?: Snippet; children?: Snippet } = $props();
</script>

<ModernPage pageClass={'vigil-deck-page ' + pageClass} {title} {subtitle} {actions}>
	{@render children?.()}
</ModernPage>
