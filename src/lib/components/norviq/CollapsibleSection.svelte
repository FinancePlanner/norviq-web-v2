<script lang="ts">
	// components.CollapsibleSection(title, desc, open) { children } — a native
	// <details>; `open` is a first-render default, the browser owns it after.
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { untrack, type Snippet } from 'svelte';

	let {
		title,
		desc = '',
		open = false,
		children
	}: { title: string; desc?: string; open?: boolean; children?: Snippet } = $props();

	const initiallyOpen = untrack(() => open);
</script>

<details class="collapsible-section glass-card" open={initiallyOpen || undefined}>
	<summary class="collapsible-section-summary flex cursor-pointer items-center gap-3 p-4 md:p-5">
		<span class="min-w-0 flex-1">
			<span class="block text-body font-semibold">{title}</span>
			{#if desc}
				<span class="mt-0.5 block text-footnote text-muted-foreground">{desc}</span>
			{/if}
		</span>
		<ChevronDown
			class="collapsible-section-chevron h-4 w-4 shrink-0 text-muted-foreground"
			data-lucide="icon"
		/>
	</summary>
	<div class="collapsible-section-body px-4 pb-4 md:px-5 md:pb-5">
		{@render children?.()}
	</div>
</details>
