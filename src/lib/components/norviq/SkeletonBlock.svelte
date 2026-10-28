<script lang="ts">
	// components.SkeletonBlock(heightClass)
	let { heightClass = '' }: { heightClass?: string } = $props();
</script>

<div class={'skeleton-block ' + heightClass} aria-hidden="true"></div>
