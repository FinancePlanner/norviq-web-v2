<script lang="ts" module>
	/** vigil.backLinkText — drops a typed "←" (the link draws its own chevron). */
	export function backLinkText(label: string): string {
		const t = label.trim();
		return (t.startsWith('←') ? t.slice(1) : t).trim();
	}
</script>

<script lang="ts">
	// vigil.SettingsShell(backHref, backLabel, title, subtitle) { children }
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import type { Snippet } from 'svelte';
	import ModernPageHeader from './ModernPageHeader.svelte';

	let {
		backHref = '',
		backLabel = '',
		title,
		subtitle = '',
		children
	}: {
		backHref?: string;
		backLabel?: string;
		title: string;
		subtitle?: string;
		children?: Snippet;
	} = $props();
</script>

<div class="vigil-settings-shell">
	{#if backHref}
		<a href={backHref} class="vigil-settings-back">
			<ChevronLeft class="h-4 w-4 shrink-0" data-lucide="icon" />
			<span>{backLinkText(backLabel)}</span>
		</a>
	{/if}
	<ModernPageHeader {title} {subtitle} />
	{@render children?.()}
</div>
