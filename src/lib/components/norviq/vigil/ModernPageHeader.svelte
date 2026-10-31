<script lang="ts">
	// vigil.ModernPageHeader(title, subtitle, actions) — the page h1 (no eyebrow slot, on purpose).
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle = '',
		actions
	}: { title: string; subtitle?: string; actions?: Snippet } = $props();
</script>

<header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
	<div class="min-w-0">
		<h1 class="text-title1 font-bold tracking-tight text-balance">{title}</h1>
		{#if subtitle}
			<p class="mt-1 max-w-2xl text-subhead text-muted-foreground">{subtitle}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex shrink-0 flex-wrap gap-2">
			{@render actions()}
		</div>
	{/if}
</header>
