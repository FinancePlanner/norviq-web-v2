<script lang="ts">
	// dashboard.ActivityFeedBody(activities): at most five compact rows.
	import { t } from '#lib/i18n/context.svelte.js';
	import InsetList from '#lib/components/norviq/vigil/InsetList.svelte';
	import type { ActivityItemVM } from '../types.js';
	import ActivityRow from './ActivityRow.svelte';

	let { activities }: { activities: ActivityItemVM[] | null | undefined } = $props();
</script>

{#if !activities || activities.length === 0}
	<p class="text-subhead text-muted-foreground">{t('No recent activity yet.')}</p>
{:else}
	<!-- overview-activity-list stays as the hook NorviqMotion staggers on. -->
	<InsetList class="overview-activity-list">
		{#each activities.slice(0, 5) as item, i (i)}
			<ActivityRow {item} compact />
		{/each}
	</InsetList>
{/if}
