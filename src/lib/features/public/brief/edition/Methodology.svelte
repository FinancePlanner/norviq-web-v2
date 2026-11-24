<script lang="ts">
	// I. Sources and methodology: what the edition is made of, and what it lacks.
	import type { EditionStrings } from './strings.js';
	import type { SourceVM } from './types.js';

	let {
		labels: L,
		editionId,
		revision,
		publishedTime,
		dataAsOfTime,
		hasEdition,
		degraded,
		sources,
		missing
	}: {
		labels: EditionStrings;
		editionId: string;
		revision: number;
		publishedTime: string;
		dataAsOfTime: string;
		hasEdition: boolean;
		degraded: boolean;
		sources: SourceVM[];
		missing: string[];
	} = $props();
</script>

<section class="mi-method" aria-labelledby="mi-method-title">
	<h2 id="mi-method-title" class="mi-section-title">{L.sourcesAndMethodology}</h2>
	{#if sources.length}
		<h3 class="mi-label">{L.citedSources}</h3>
		<ul class="mi-sources" role="list">
			{#each sources as s (s.host)}
				<li>
					<a class="mi-source" href={s.url} rel="nofollow noopener noreferrer" target="_blank"
						>{s.host}</a
					>
				</li>
			{/each}
		</ul>
	{/if}
	<h3 class="mi-label">{L.marketData}</h3>
	<p>
		{L.marketDataMethod}
		{#if dataAsOfTime}
			{L.marketDataAsOf} {dataAsOfTime} {L.lisbonTime}.
		{/if}
	</p>
	<h3 class="mi-label">{L.howWritten}</h3>
	<p>
		{L.howWrittenBody}
	</p>
	{#if degraded}
		<p>
			{L.degradedBody}
		</p>
	{/if}
	{#if missing.length}
		<h3 class="mi-label">{L.notAvailable}</h3>
		<ul>
			{#each missing as m (m)}
				<li>{m}</li>
			{/each}
		</ul>
	{/if}
	<h3 class="mi-label">{L.edition}</h3>
	<p>
		{editionId}{#if revision}&nbsp;· {L.revision} {revision}{/if}{#if publishedTime}&nbsp;· {L.published}
			{publishedTime}
			{L.lisbonTime}{/if}
	</p>
	{#if !hasEdition}
		<p>{L.legacyNote}</p>
	{/if}
	<p>{L.disclaimer}</p>
</section>
