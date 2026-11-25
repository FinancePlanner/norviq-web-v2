<script lang="ts">
	// vigil.Section: a titled region. A rule, not a card: hairline on top, no surface.
	import type { Snippet } from 'svelte';

	let {
		title,
		id,
		action,
		children
	}: { title: string; id?: string; action?: Snippet; children: Snippet } = $props();

	const uid = $props.id();
	const slug = $derived(
		title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
	);
	const headingId = $derived(id ?? `${slug || 'section'}-${uid}`);
</script>

<section class="vigil-section" aria-labelledby={headingId}>
	<header class="vigil-section-header">
		<h2 class="vigil-section-title" id={headingId}>{title}</h2>
		{#if action}{@render action()}{/if}
	</header>
	{@render children()}
</section>

<style>
	.vigil-section {
		border-top: 1px solid var(--hairline);
		padding-top: var(--space-6);
	}
	.vigil-section-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
	}
	.vigil-section-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}
</style>
