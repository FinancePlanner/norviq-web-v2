<script lang="ts">
	// vigil.InsetList(class) { ListRow… } — flat rows with hairline dividers.
	import type { Snippet } from 'svelte';

	let { class: className = '', children }: { class?: string; children?: Snippet } = $props();
</script>

<ul class={'nq-list ' + className} role="list">
	{@render children?.()}
</ul>
