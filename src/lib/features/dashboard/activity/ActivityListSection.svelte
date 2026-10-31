<script lang="ts">
	// dashboard.ActivityListSection(vm): the timeline rows + "Load more".
	// Go's button hx-get'd /dashboard/activity-list?limit=N and swapped this
	// section (outerHTML); here it fetches the larger page and replaces the rows.
	import { t } from '#lib/i18n/context.svelte.js';
	import InsetList from '#lib/components/norviq/vigil/InsetList.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import ActivityRow from './ActivityRow.svelte';
	import { fetchActivityList, nextActivityLimit, type ActivityListState } from './list.js';

	let { initial }: { initial: ActivityListState } = $props();

	// Seeded from the server render; "Load more" replaces it wholesale.
	// svelte-ignore state_referenced_locally
	let list = $state<ActivityListState>(initial);
	let loading = $state(false);

	async function loadMore(e: MouseEvent) {
		if (loading) return;
		loading = true;
		const button = e.currentTarget as HTMLElement;
		button.classList.add('htmx-request');
		try {
			list = await fetchActivityList(nextActivityLimit(list.activityLimit));
		} finally {
			button.classList.remove('htmx-request');
			loading = false;
		}
	}
</script>

<div id="activity-list-section">
	{#if list.activities.length === 0}
		<p class="text-subhead text-muted-foreground">{t('No recent activity yet.')}</p>
	{:else}
		<InsetList class="activity-list">
			{#each list.activities as item, i (i)}
				<ActivityRow {item} />
			{/each}
		</InsetList>
		{#if list.hasMoreActivities}
			<div class="mt-6 text-center">
				<NativeButton class="dash-btn dash-btn-secondary" disabled={loading} onclick={loadMore}
					>{t('Load more')}</NativeButton
				>
			</div>
		{/if}
	{/if}
</div>
