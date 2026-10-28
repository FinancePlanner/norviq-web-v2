<script lang="ts">
	// vigil.CommandSplit(class) — main content + side rail.
	import type { Snippet } from 'svelte';

	let { class: className = '', children }: { class?: string; children?: Snippet } = $props();
</script>

<div class={'vigil-command-split ' + className}>
	{@render children?.()}
</div>
