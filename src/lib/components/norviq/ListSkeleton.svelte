<script lang="ts">
	// components.ListSkeleton(rows)
	import SkeletonBlock from './SkeletonBlock.svelte';

	let { rows = 3 }: { rows?: number } = $props();
</script>

<div class="list-skeleton space-y-3" aria-hidden="true">
	{#each { length: rows }, i (i)}
		<SkeletonBlock heightClass="h-16 rounded-lg" />
	{/each}
</div>
