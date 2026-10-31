<script lang="ts">
	// vigil.Metric(label, value, sentiment) — sentiment "positive" | "negative" | "".
	import type { Sentiment } from '../types.js';

	let {
		label,
		value,
		sentiment = ''
	}: { label: string; value: string; sentiment?: Sentiment } = $props();
</script>

<div class="command-metric">
	<span class="command-metric-label">{label}</span>
	<span
		class={[
			'command-metric-value',
			sentiment === 'positive' && 'is-positive',
			sentiment === 'negative' && 'is-negative'
		]}>{value}</span
	>
</div>
