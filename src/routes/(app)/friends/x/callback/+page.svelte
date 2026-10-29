<script lang="ts">
	// Port of friends.templ XImportPage.
	import { EmptyStateInline, FormErrorBanner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import FriendButton from '#lib/features/social/friends/FriendButton.svelte';
	import UserRow from '#lib/features/social/friends/UserRow.svelte';
	import { count } from '#lib/features/social/friends/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Find people you follow on X - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<vigil.DocumentPage
	pageClass="friends-x-page"
	backHref="/friends"
	backLabel={t('← Friends')}
	title={t('Find people you follow on X')}
	subtitle={t('Only people who chose to be findable from X appear here.')}
>
	<FormErrorBanner message={data.errorMessage} />
	{#if data.matches}
		<vigil.Panel titleID="x-matches-title">
			<vigil.PanelHeader
				id="x-matches-title"
				title={t('On Norviq')}
				desc={count(data.matches.totalFollowingScanned, 'account checked', 'accounts checked')}
			/>
			{#if data.matches.matches.length === 0}
				<EmptyStateInline
					title={t('No one you follow is on Norviq yet')}
					description={t('Send them your invite link instead.')}
					actionLabel={t('Invite friends')}
					actionHref="/friends/invite"
				/>
			{:else}
				<vigil.InsetList class="x-matches-list">
					{#each data.matches.matches as match (match.user.id)}
						<UserRow user={match.user}>
							{#snippet trailing()}<FriendButton user={match.user} />{/snippet}
						</UserRow>
					{/each}
				</vigil.InsetList>
			{/if}
		</vigil.Panel>
	{/if}
</vigil.DocumentPage>
