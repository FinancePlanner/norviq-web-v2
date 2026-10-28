<script lang="ts">
	// vigil.MetricStrip — a row of Metric values (type, not a card).
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="vigil-metric-strip">
	{@render children?.()}
</div>
