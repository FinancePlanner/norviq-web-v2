<script lang="ts">
	// Tickers and the cited source under a story.
	import type { StoryVM } from './types.js';

	let { story, sourceLabel }: { story: StoryVM; sourceLabel: string } = $props();
</script>

{#if story.tickers.length || story.sourceHost}
	<div class="mi-story-foot">
		{#if story.tickers.length}
			<ul class="mi-tickers" role="list">
				{#each story.tickers as ticker (ticker)}
					<li class="mi-ticker">${ticker}</li>
				{/each}
			</ul>
		{/if}
		{#if story.sourceHost}
			<span>
				{sourceLabel}:
				{#if story.sourceURL}
					<a
						class="mi-source"
						href={story.sourceURL}
						rel="nofollow noopener noreferrer"
						target="_blank">{story.sourceHost}</a
					>
				{:else}
					{story.sourceHost}
				{/if}
			</span>
		{/if}
	</div>
{/if}
