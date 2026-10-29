<script lang="ts">
	// Port of feed.templ FeedPage / FeedRows / FeedLoadMore.
	import { EmptyState, FormErrorBanner, SecondaryButton, ToastBanner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import AchievementIcon from '#lib/features/social/friends/AchievementIcon.svelte';
	import CongratsButton from '#lib/features/social/friends/CongratsButton.svelte';
	import InviteButton from '#lib/features/social/friends/InviteButton.svelte';
	import SectionTabs from '#lib/features/social/friends/SectionTabs.svelte';
	import { feedPath, formatDate, initials, isoDate, tierLabelID, userTitle, type SocialFeedItem } from '#lib/features/social/friends/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Rows appended by "Load more" (hx-swap beforeend) and the oob-swapped control.
	let more = $state<SocialFeedItem[]>([]);
	let cursor = $state('');
	let failed = $state(false);
	let loading = $state(false);

	$effect.pre(() => {
		more = [];
		cursor = data.nextCursor;
		failed = false;
	});

	const items = $derived([...data.items, ...more]);

	async function loadMore(e: MouseEvent) {
		e.preventDefault();
		if (loading || !cursor) return;
		loading = true;
		try {
			const res = await fetch(feedPath(cursor), { headers: { accept: 'application/json' } });
			if (!res.ok) throw new Error(String(res.status));
			const page = (await res.json()) as { items: SocialFeedItem[]; nextCursor: string; loadMoreFailed: boolean };
			more = [...more, ...page.items];
			cursor = page.nextCursor;
			failed = page.loadMoreFailed;
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Friends feed - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page friends-page">
	<vigil.ModernPageHeader title={t('Friends')} subtitle={t('See what your friends have unlocked and cheer them on.')}>
		{#snippet actions()}<InviteButton />{/snippet}
	</vigil.ModernPageHeader>
	<SectionTabs activePath="/friends/feed" />
	<ToastBanner message={data.notice ? t(data.notice) : ''} />
	<FormErrorBanner message={data.errorMessage} />
	{#if data.items.length === 0}
		{#if !data.errorMessage}
			<EmptyState
				title={t('Nothing here yet')}
				description={t('When friends unlock achievements, they show up here.')}
				actionLabel={t('Invite friends')}
				actionHref="/friends/invite"
			/>
		{/if}
	{:else}
		<vigil.Panel class="mt-4">
			<ul id="feed-list" class="divide-y divide-border">
				{#each items as item (item.id)}
					<li class="flex items-start gap-3 py-3">
						<span class="nq-row-icon text-subhead font-semibold" aria-hidden="true">{initials(item.actor)}</span>
						<span class="achievement-icon" aria-hidden="true"><AchievementIcon iconKey={item.achievement.iconKey} class="h-5 w-5" /></span>
						<div class="min-w-0 flex-1">
							<p class="text-body">
								<a class="font-semibold" href={'/friends/u/' + item.actor.id}>{userTitle(item.actor)}</a>
								{' ' + t('unlocked') + ' '}
								<span class="font-semibold">{item.achievement.title}</span>
								{#if item.achievement.tier}
									<span class="text-muted-foreground">{' (' + t(tierLabelID(item.achievement.tier)) + ')'}</span>
								{/if}
							</p>
							<time class="text-subhead text-muted-foreground" datetime={isoDate(item.createdAt)}>{formatDate(item.createdAt)}</time>
						</div>
						<CongratsButton vm={{ id: item.id, count: item.congratsCount, done: item.viewerCongratulated }} />
					</li>
				{/each}
			</ul>
		</vigil.Panel>
		<div id="feed-more" class={['mt-4', loading && 'htmx-request']}>
			{#if failed}
				<p class="mb-2 text-subhead text-danger" role="alert">{t("Couldn't load more. Try again.")}</p>
			{/if}
			{#if cursor}
				<SecondaryButton href={feedPath(cursor)} class="w-auto px-4" onclick={loadMore}>{t('Load more')}</SecondaryButton>
			{/if}
		</div>
	{/if}
</div>
