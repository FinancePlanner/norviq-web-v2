<script lang="ts">
	// D. Lead story and F. market-moving developments.
	import StoryMeta from './StoryMeta.svelte';
	import type { StoryVM } from './types.js';

	let {
		lead,
		developments,
		leadTitle,
		developmentsTitle,
		sourceLabel
	}: {
		lead: StoryVM | null;
		developments: StoryVM[];
		leadTitle: string;
		developmentsTitle: string;
		sourceLabel: string;
	} = $props();
</script>

{#if lead}
	<section class="mi-lead" aria-labelledby="mi-lead-title">
		<h2 id="mi-lead-title" class="mi-section-title">{leadTitle}</h2>
		<p>{lead.text}</p>
		<StoryMeta story={lead} {sourceLabel} />
	</section>
{/if}
{#if developments.length}
	<section aria-labelledby="mi-dev-title">
		<h2 id="mi-dev-title" class="mi-section-title">{developmentsTitle}</h2>
		<ol class="mi-stories">
			{#each developments as story (story.rank)}
				<li>
					<span class="mi-rank" aria-hidden="true">{story.rank}</span>
					<div>
						<p>{story.text}</p>
						<StoryMeta {story} {sourceLabel} />
					</div>
				</li>
			{/each}
		</ol>
	</section>
{/if}
