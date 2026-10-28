<script lang="ts">
	// vigil.RowTrailing(value, caption, sentiment) — amount over date.
	import type { Sentiment } from '../types.js';

	let { value, caption = '', sentiment = '' }: { value: string; caption?: string; sentiment?: Sentiment } = $props();
</script>

<p class={['nq-row-value', sentiment === 'positive' && 'is-positive', sentiment === 'negative' && 'is-negative']}>
	{value}
</p>
{#if caption}
	<p class="nq-row-caption">{caption}</p>
{/if}
