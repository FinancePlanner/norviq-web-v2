<script lang="ts">
	// vigil.DocumentPage(pageClass, backHref, backLabel, title, subtitle) { children } —
	// the settings/billing/legal measure.
	import type { Snippet } from 'svelte';
	import SettingsShell from './SettingsShell.svelte';

	let {
		pageClass = '',
		backHref = '',
		backLabel = '',
		title,
		subtitle = '',
		children
	}: {
		pageClass?: string;
		backHref?: string;
		backLabel?: string;
		title: string;
		subtitle?: string;
		children?: Snippet;
	} = $props();
</script>

<div class={'app-page-content vigil-document-page ' + pageClass}>
	<SettingsShell {backHref} {backLabel} {title} {subtitle}>
		{@render children?.()}
	</SettingsShell>
</div>
