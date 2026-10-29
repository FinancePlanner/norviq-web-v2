<script lang="ts">
	// economy.economyNewsShell — the skeleton Go showed while hx-get="/economy/news"
	// was in flight. Wrapped in #economy-news-section like Go's hx target.
	import SkeletonBlock from '#lib/components/norviq/SkeletonBlock.svelte';
</script>

<section class="mt-6 glass-card p-5 md:p-6" aria-hidden="true">
	<h2 class="text-lg font-semibold">Economy headlines</h2>
	<div class="mt-4 space-y-3">
		<SkeletonBlock heightClass="h-10 rounded-xl" />
		<SkeletonBlock heightClass="h-10 rounded-xl" />
		<SkeletonBlock heightClass="h-10 rounded-xl" />
	</div>
</section>
