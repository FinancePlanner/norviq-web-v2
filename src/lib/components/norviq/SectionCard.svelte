<script lang="ts">
	// components.SectionCard(title) { children }
	import type { Snippet } from 'svelte';

	let { title, children }: { title: string; children?: Snippet } = $props();
</script>

<section class="section-card glass-card p-4 md:p-5">
	<h2 class="section-card-title">{title}</h2>
	<div class="section-card-body mt-3">
		{@render children?.()}
	</div>
</section>
