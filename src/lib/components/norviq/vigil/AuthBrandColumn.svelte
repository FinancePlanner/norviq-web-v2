<script lang="ts">
	// vigil.AuthBrandColumn
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="vigil-auth-brand-panel">
	{@render children?.()}
</div>
