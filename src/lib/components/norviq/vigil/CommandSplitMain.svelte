<script lang="ts">
	// vigil.CommandSplitMain
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="vigil-command-split-main">
	{@render children?.()}
</div>
