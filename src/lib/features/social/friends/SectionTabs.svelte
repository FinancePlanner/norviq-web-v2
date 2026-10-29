<script lang="ts">
	// friends.templ sectionTabs: Friends / Leaderboard / Feed, drawn only while
	// leaderboards or the feed are on (with one tab there is nothing to switch).
	import { page } from '$app/state';
	import { SegmentedControl, type SegmentItem } from '#lib/components/norviq/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { activityFeedOn, leaderboardsOn, type SocialFlags } from './flags.js';

	let { activePath }: { activePath: string } = $props();

	const cfg = $derived(page.data.social as SocialFlags);
	const items = $derived.by(() => {
		const out: SegmentItem[] = [{ label: t('Friends'), path: '/friends' }];
		if (leaderboardsOn(cfg)) out.push({ label: t('Leaderboard'), path: '/friends/leaderboard' });
		if (activityFeedOn(cfg)) out.push({ label: t('Feed'), path: '/friends/feed' });
		return out;
	});
</script>

{#if leaderboardsOn(cfg) || activityFeedOn(cfg)}
	<div class="mb-6">
		<SegmentedControl {items} {activePath} />
	</div>
{/if}
