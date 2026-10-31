<script lang="ts">
	// vigil.CanvasPage(pageClass, title, subtitle, actions) { children } — primary work surface plus a 20rem rail.
	import type { Snippet } from 'svelte';
	import ModernPage from './ModernPage.svelte';

	let {
		pageClass = '',
		title,
		subtitle = '',
		actions,
		children
	}: {
		pageClass?: string;
		title: string;
		subtitle?: string;
		actions?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<ModernPage pageClass={'vigil-canvas-page ' + pageClass} {title} {subtitle} {actions}>
	{@render children?.()}
</ModernPage>
