<script lang="ts">
	// vigil.PanelHeader(id, title, desc, trailing) — pass the Panel's titleID as `id`.
	import type { Snippet } from 'svelte';

	let {
		id = '',
		title,
		desc = '',
		trailing
	}: { id?: string; title: string; desc?: string; trailing?: Snippet } = $props();
</script>

<div class="nq-panel-header">
	<div class="min-w-0">
		<h2 class="nq-panel-title" id={id || undefined}>{title}</h2>
		{#if desc}
			<p class="nq-panel-desc">{desc}</p>
		{/if}
	</div>
	{#if trailing}
		<div class="nq-panel-trailing">
			{@render trailing()}
		</div>
	{/if}
</div>
