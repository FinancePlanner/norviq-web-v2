<script lang="ts">
	// dashboard.FocusPointsTeaser(points, goalsError): the dashboard's read-only
	// preview. Pass focusPointsTeaser(points) for the three-row cap.
	import { t } from '#lib/i18n/context.svelte.js';
	import type { FocusPointVM } from '../types.js';
	import FocusPointRow from './FocusPointRow.svelte';

	let { points, goalsError = false }: { points: FocusPointVM[] | null | undefined; goalsError?: boolean } = $props();
</script>

<div class="dash-panel focus-teaser">
	<div class="focus-teaser-header">
		<div>
			<p class="dash-panel-label">{t('Focus this week')}</p>
			<p class="activity-panel-lead">{t('Goals and habits')}</p>
		</div>
		<a href="/dashboard/insights" class="dash-panel-link">{t('Manage')}</a>
	</div>
	{#if goalsError}
		<p class="overview-empty mt-4">{t('Focus points unavailable right now.')}</p>
	{:else if !points || points.length === 0}
		<p class="overview-empty mt-4">{t('No focus points yet - add one on Insights.')}</p>
	{:else}
		<ul class="focus-points-list mt-4">
			{#each points as point (point.id)}
				<FocusPointRow {point} />
			{/each}
		</ul>
	{/if}
</div>
