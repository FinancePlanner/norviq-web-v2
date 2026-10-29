<script lang="ts">
	// Port of norviq-web internal/pages/settings/social.templ BlockedUsersPage.
	import { enhance } from '$app/forms';
	import { t } from '#lib/i18n/context.svelte.js';
	import { EmptyState, FormErrorBanner, SecondarySubmitButton, ToastBanner, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { userTitle } from '#lib/features/settings-admin/social/privacy.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Blocked people - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-modern-page settings-section-page">
	<vigil.SettingsShell
		backHref="/settings"
		backLabel={t('← Settings')}
		title={t('Blocked people')}
		subtitle={t("Blocked people can't find you, add you or see your progress.")}
	>
		<ToastBanner message={data.successMessage ? t(data.successMessage) : ''} />
		<FormErrorBanner message={data.errorMessage} />
		{#if !data.hasLoadError}
			{#if data.users.length === 0}
				<EmptyState
					title={t('No one is blocked')}
					description={t('People you block from their profile appear here.')}
					actionLabel={t('Back to friends')}
					actionHref="/friends"
				/>
			{:else}
				<vigil.Panel>
					<vigil.InsetList class="blocked-list">
						{#each data.users as user (user.id)}
							<vigil.ListRow title={userTitle(user)} subtitle={'@' + user.username}>
								{#snippet trailing()}
									<form method="post" action="?/unblock" use:enhance={withSpinner()}>
										<input type="hidden" name="userId" value={user.id} />
										<SecondarySubmitButton class="w-auto px-3">{t('Unblock')}</SecondarySubmitButton>
									</form>
								{/snippet}
							</vigil.ListRow>
						{/each}
					</vigil.InsetList>
				</vigil.Panel>
			{/if}
		{/if}
	</vigil.SettingsShell>
</div>
