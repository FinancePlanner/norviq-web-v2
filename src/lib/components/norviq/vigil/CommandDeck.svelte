<script lang="ts">
	// vigil.CommandDeck(class) — responsive grid of glass panels.
	import type { Snippet } from 'svelte';

	let { class: className = '', children }: { class?: string; children?: Snippet } = $props();
</script>

<div class={'vigil-command-deck ' + className}>
	{@render children?.()}
</div>
