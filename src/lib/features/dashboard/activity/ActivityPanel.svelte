<script lang="ts">
	// dashboard.ActivityPanel + ActivityFeedCard: the dashboard's activity card.
	// Go polled /dashboard/activity-feed (hx-trigger "every 60s, refresh from:body");
	// here a TanStack query refetches /api/v1/activities every 60s, seeded with
	// the server-rendered rows. `error` is Go's vm.LoadErrors["activities"].
	import { onMount } from 'svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { t } from '#lib/i18n/context.svelte.js';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import type { ActivityItemVM } from '../types.js';
	import ActivityFeedBody from './ActivityFeedBody.svelte';
	import { activityFeedQueryKey, fetchActivityFeed } from './feed.js';

	let {
		activities,
		error = false
	}: { activities: ActivityItemVM[] | null | undefined; error?: boolean } = $props();

	const feed = createQuery(() => ({
		queryKey: activityFeedQueryKey,
		queryFn: fetchActivityFeed,
		initialData: activities ?? [],
		initialDataUpdatedAt: Date.now(),
		refetchInterval: 60_000,
		enabled: !error
	}));

	// "refresh from:body": anything dispatching `refresh` on <body> reloads the feed.
	onMount(() => {
		const onRefresh = () => void feed.refetch();
		document.body.addEventListener('refresh', onRefresh);
		return () => document.body.removeEventListener('refresh', onRefresh);
	});
</script>

<section class="dash-panel activity-panel">
	<div class="activity-panel-header">
		<div>
			<p class="dash-panel-label">{t('Activity')}</p>
			<p class="activity-panel-lead">{t('Portfolio moves and spending · refreshes every 60s')}</p>
		</div>
		<div class="flex items-center gap-3">
			<NativeButton class="dash-panel-link" onclick={() => void feed.refetch()}
				>{t('Refresh')}</NativeButton
			>
			<a href="/dashboard/activity" class="dash-panel-link">{t('View all')}</a>
		</div>
	</div>
	<div class="activity-panel-body">
		{#if error}
			<p class="overview-empty">{t('Activity is unavailable right now.')}</p>
		{:else}
			<div id="activity-feed">
				<ActivityFeedBody activities={feed.data} />
			</div>
		{/if}
	</div>
</section>
