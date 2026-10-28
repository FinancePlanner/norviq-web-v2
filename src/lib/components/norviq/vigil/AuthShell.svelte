<script lang="ts">
	// vigil.AuthShell(class) — split brand panel + form column.
	import type { Snippet } from 'svelte';

	let { class: className = '', children }: { class?: string; children?: Snippet } = $props();
</script>

<div class={'vigil-auth-shell auth-vigil ' + className}>
	{@render children?.()}
</div>
