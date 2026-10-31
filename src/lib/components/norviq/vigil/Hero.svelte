<script lang="ts" module>
	/** vigil.heroFormat — tells animateValue how to re-render the figure while counting. */
	export function heroFormat(value: string): string {
		const v = value.trim();
		if (v.startsWith('$') || v.startsWith('-$') || v.startsWith('+$')) return '$';
		if (v.endsWith('%')) return '%';
		return '';
	}
</script>

<script lang="ts">
	// vigil.Hero(label, value, delta) { children } — the page's one bold figure,
	// on the page surface (not a card). `delta` is usually <HeroDelta>.
	import type { Snippet } from 'svelte';

	let {
		label,
		value,
		delta,
		children
	}: { label: string; value: string; delta?: Snippet; children?: Snippet } = $props();
</script>

<section class="nq-hero">
	<p class="nq-hero-label">{label}</p>
	<div class="nq-hero-row">
		<p class="nq-hero-value" data-format={heroFormat(value) || undefined}>{value}</p>
		{@render delta?.()}
	</div>
	{@render children?.()}
</section>
