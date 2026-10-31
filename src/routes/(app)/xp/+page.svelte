<script lang="ts">
	// Port of xp.templ XPHistoryPage.
	import { onMount } from 'svelte';
	import {
		EmptyStateInline,
		FormErrorBanner,
		SecondaryButton,
		ToastBanner
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { rememberTimezone } from '#lib/features/social/friends/client.js';
	import { formatDate, xpEventLabel, xpHistoryPath } from '#lib/features/social/friends/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	onMount(rememberTimezone);
</script>

<svelte:head>
	<title>XP history - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<vigil.DocumentPage
	pageClass="xp-history-page"
	backHref="/friends"
	backLabel={t('← Friends')}
	title={t('XP history')}
	subtitle={t('Check in daily and stay on budget to earn XP.')}
>
	<ToastBanner message={data.notice} />
	<FormErrorBanner message={data.errorMessage} />
	{#if data.xp}
		<vigil.MetricStrip>
			<vigil.Metric label={t('Level')} value={String(data.xp.level)} />
			<vigil.Metric label={t('Total')} value={data.xp.total + ' XP'} />
			<vigil.Metric label={t('This week')} value={'+' + data.xp.weekXP + ' XP'} />
		</vigil.MetricStrip>
	{/if}
	{#if !data.errorMessage}
		<vigil.Panel class="mt-6">
			{#if data.events.length === 0}
				<EmptyStateInline
					title={t('No XP yet')}
					description={t('Check in daily and stay on budget to earn XP.')}
					actionLabel={t('Go to dashboard')}
					actionHref="/dashboard"
				/>
			{:else}
				<vigil.InsetList class="xp-history-list">
					{#each data.events as event (event.id)}
						<vigil.ListRow
							title={t(xpEventLabel(event.type))}
							subtitle={formatDate(event.createdAt)}
						>
							{#snippet trailing()}
								<vigil.RowTrailing value={'+' + event.points + ' XP'} sentiment="positive" />
							{/snippet}
						</vigil.ListRow>
					{/each}
				</vigil.InsetList>
			{/if}
		</vigil.Panel>
		{#if data.nextCursor}
			<div class="mt-4">
				<SecondaryButton href={xpHistoryPath(data.nextCursor)} class="w-auto px-4"
					>{t('Older')}</SecondaryButton
				>
			</div>
		{/if}
	{/if}
</vigil.DocumentPage>
