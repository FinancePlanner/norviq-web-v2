<script lang="ts">
	// Port of friends.templ FriendAchievementsPage.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import AchievementIcon from '#lib/features/social/friends/AchievementIcon.svelte';
	import { formatDate, isoDate, tierLabelID } from '#lib/features/social/friends/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Achievements - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<vigil.DocumentPage
	pageClass="friends-achievements-page"
	backHref={'/friends/u/' + data.userID}
	backLabel={t('← Profile')}
	title={t('Achievements')}
>
	<vigil.Panel titleID="friend-achievements-title">
		<vigil.PanelHeader id="friend-achievements-title" title={t('Unlocked')} />
		{#if data.unlocks.length === 0}
			<p class="mt-3 text-subhead text-muted-foreground">{t('No achievements unlocked yet.')}</p>
		{:else}
			<ul class="mt-3 divide-y divide-border">
				{#each data.unlocks as unlock (unlock.id)}
					<li class="flex items-start gap-3 py-3">
						<span class="achievement-icon" aria-hidden="true"
							><AchievementIcon iconKey={unlock.iconKey} class="h-5 w-5" /></span
						>
						<div class="min-w-0 flex-1">
							<p class="text-body font-semibold">
								{unlock.title}
								{#if unlock.tier}
									<span class="font-normal text-muted-foreground"
										>{' · ' + t(tierLabelID(unlock.tier))}</span
									>
								{/if}
							</p>
							<p class="text-subhead text-muted-foreground">{unlock.description}</p>
						</div>
						<time class="text-subhead text-muted-foreground" datetime={isoDate(unlock.unlockedAt)}
							>{formatDate(unlock.unlockedAt)}</time
						>
					</li>
				{/each}
			</ul>
		{/if}
	</vigil.Panel>
</vigil.DocumentPage>
