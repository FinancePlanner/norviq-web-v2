<script lang="ts">
	// vigil.CommandSplitAside
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<aside class="vigil-command-split-aside">
	{@render children?.()}
</aside>
