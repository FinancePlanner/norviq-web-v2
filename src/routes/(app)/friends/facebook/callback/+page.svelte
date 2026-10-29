<script lang="ts">
	// Port of friends.templ FacebookImportPage + facebookDisconnectForm.
	// Facebook only shares friends who also connected, so an empty list is the
	// common case and says why.
	import { EmptyStateInline, FormErrorBanner, SecondarySubmitButton } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import FriendButton from '#lib/features/social/friends/FriendButton.svelte';
	import UserRow from '#lib/features/social/friends/UserRow.svelte';
	import { boostedForm } from '#lib/features/social/friends/client.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Find friends from Facebook - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<vigil.DocumentPage
	pageClass="friends-facebook-page"
	backHref="/friends"
	backLabel={t('← Friends')}
	title={t('Find friends from Facebook')}
	subtitle={t('Only friends who also connected Facebook to Norviq appear. Nothing is posted to Facebook.')}
>
	<FormErrorBanner message={data.errorMessage ? t(data.errorMessage) : ''} />
	{#if data.matches}
		<vigil.Panel titleID="facebook-matches-title">
			<vigil.PanelHeader id="facebook-matches-title" title={t('On Norviq')} />
			{#if data.matches.matches.length === 0 && data.matches.friendsGranted === 0}
				<EmptyStateInline
					title={t("Facebook didn't share your friends list")}
					description={t('Connect Facebook again and allow access to your friends list, or invite friends with a link.')}
					actionLabel={t('Invite friends')}
					actionHref="/friends/invite"
				/>
			{:else if data.matches.matches.length === 0}
				<EmptyStateInline
					title={t('No Facebook friends here yet')}
					description={t('Only friends who also connected Facebook to Norviq appear. Nothing is posted to Facebook.')}
					actionLabel={t('Invite friends')}
					actionHref="/friends/invite"
				/>
			{:else}
				<vigil.InsetList class="facebook-matches-list">
					{#each data.matches.matches as match (match.user.id)}
						<UserRow user={match.user}>
							{#snippet trailing()}<FriendButton user={match.user} />{/snippet}
						</UserRow>
					{/each}
				</vigil.InsetList>
			{/if}
		</vigil.Panel>
		<form method="post" action="/friends/facebook/disconnect" class="mt-6" {@attach boostedForm()}>
			<SecondarySubmitButton class="w-auto px-4">{t('Disconnect Facebook')}</SecondarySubmitButton>
		</form>
	{/if}
</vigil.DocumentPage>
