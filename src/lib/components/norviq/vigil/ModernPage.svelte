<script lang="ts">
	// vigil.ModernPage(pageClass, title, subtitle, actions) { children }
	import type { Snippet } from 'svelte';
	import ModernPageHeader from './ModernPageHeader.svelte';

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

<div class={'app-page-content ' + pageClass}>
	<ModernPageHeader {title} {subtitle} {actions} />
	{@render children?.()}
</div>
