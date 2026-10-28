<script lang="ts">
	// vigil.HeroDelta(text, sentiment)
	import type { Sentiment } from '../types.js';

	let { text, sentiment = '' }: { text: string; sentiment?: Sentiment } = $props();
</script>

<span class={['nq-hero-delta', sentiment === 'positive' && 'is-positive', sentiment === 'negative' && 'is-negative']}
	>{text}</span
>
