<script lang="ts">
	// Port of friends.templ LeaderboardPage.
	import { EmptyState, FormErrorBanner, SegmentedControl, type SegmentItem } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import InviteButton from '#lib/features/social/friends/InviteButton.svelte';
	import SectionTabs from '#lib/features/social/friends/SectionTabs.svelte';
	import {
		hasFriends,
		Leaderboard,
		LeaderboardMetrics,
		LeaderboardPeriods,
		leaderboardPath,
		leaderboardValue,
		metricLabel,
		periodLabel,
		userTitle,
		valueSentiment
	} from '#lib/features/social/friends/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const active = $derived(leaderboardPath(data.metric, data.period));
	const metricSegments = $derived<SegmentItem[]>(
		LeaderboardMetrics.map((m) => ({ label: t(metricLabel(m)), path: leaderboardPath(m, data.period) }))
	);
	const periodSegments = $derived<SegmentItem[]>(
		LeaderboardPeriods.map((p) => ({ label: t(periodLabel(p)), path: leaderboardPath(data.metric, p) }))
	);
</script>

<svelte:head>
	<title>Leaderboard - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page friends-leaderboard-page">
	<vigil.ModernPageHeader title={t('Friends')} subtitle={t('Leaderboards only show you and your friends.')}>
		{#snippet actions()}<InviteButton />{/snippet}
	</vigil.ModernPageHeader>
	<SectionTabs activePath="/friends/leaderboard" />
	<div class="flex flex-col gap-3">
		<SegmentedControl items={metricSegments} activePath={active} />
		<SegmentedControl items={periodSegments} activePath={active} />
	</div>
	{#if data.metric === Leaderboard.ReturnPercent}
		<p class="mt-4 text-subhead text-muted-foreground">
			{t('Only friends who chose to share their return appear here, and only percentages are shown, never amounts.')}
		</p>
	{/if}
	<FormErrorBanner message={data.errorMessage} />
	{#if !data.errorMessage}
		{#if !data.board || !hasFriends(data.board)}
			<div class="mt-6">
				<EmptyState
					title={t('No friends to compare with yet')}
					description={t('Leaderboards only show you and your friends. Invite someone to see how you rank.')}
					actionLabel={t('Invite friends')}
					actionHref="/friends/invite"
				/>
			</div>
		{:else}
			<vigil.Panel class="mt-6">
				<ol class="nq-list leaderboard-list" role="list" aria-label={t(metricLabel(data.metric)) + ' · ' + t(periodLabel(data.period))}>
					{#each data.board.entries ?? [] as entry (entry.rank + ':' + entry.user.id)}
						<li
							class={['nq-row', entry.isMe && 'leaderboard-row-me rounded-[var(--radius-control)] bg-[var(--color-tint-soft)]']}
							aria-current={entry.isMe ? 'true' : undefined}
						>
							<span class="nq-row-icon text-subhead font-semibold tabular-nums" aria-label={t('Rank')}>{entry.rank}</span>
							<div class="nq-row-body">
								{#if entry.isMe}
									<p class="nq-row-title">{t('You')}</p>
								{:else}
									<a class="nq-row-title block truncate" href={'/friends/u/' + entry.user.id}>{userTitle(entry.user)}</a>
								{/if}
								<p class="nq-row-subtitle">{'@' + entry.user.username}</p>
							</div>
							<div class="nq-row-trailing">
								<vigil.RowTrailing value={leaderboardValue(data.metric, entry.value)} sentiment={valueSentiment(data.metric, entry.value)} />
							</div>
						</li>
					{/each}
				</ol>
			</vigil.Panel>
		{/if}
	{/if}
</div>
