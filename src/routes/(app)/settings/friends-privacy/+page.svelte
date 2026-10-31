<script lang="ts">
	// Port of norviq-web internal/pages/settings/social.templ FriendsPrivacyPage.
	import { enhance } from '$app/forms';
	import { t } from '#lib/i18n/context.svelte.js';
	import {
		FormErrorBanner,
		SecondarySubmitButton,
		SelectField,
		SubmitButton,
		SwitchField,
		ToastBanner,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { searchVisibilityOptions } from '#lib/features/settings-admin/social/privacy.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const visibilityOptions = $derived(
		searchVisibilityOptions(data.settings.searchVisibility).map((o) => ({
			...o,
			label: t(o.label)
		}))
	);
</script>

<svelte:head>
	<title>Friends privacy - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-modern-page settings-section-page">
	<vigil.SettingsShell
		backHref="/settings"
		backLabel={t('← Settings')}
		title={t('Friends privacy')}
		subtitle={t('Only friends see these. Amounts of money are never shared, only percentages.')}
	>
		<ToastBanner message={data.successMessage ? t(data.successMessage) : ''} />
		<FormErrorBanner message={data.errorMessage} />
		{#if !data.hasLoadError}
			<form
				method="post"
				action="/settings/friends-privacy"
				class="space-y-6"
				use:enhance={withSpinner()}
			>
				<section class="glass-card p-6">
					<h2 class="text-lg leading-none font-semibold tracking-tight">{t('Discovery')}</h2>
					<div class="mt-4">
						<SelectField
							id="search-visibility"
							name="searchVisibility"
							label={t('Who can find me')}
							options={visibilityOptions}
						/>
					</div>
				</section>
				<section class="glass-card p-6">
					<h2 class="text-lg leading-none font-semibold tracking-tight">{t('What friends see')}</h2>
					<div class="mt-4 space-y-4">
						{#each data.toggles as toggle (toggle.key)}
							<input type="hidden" name="shown" value={toggle.key} />
							<SwitchField
								id={'privacy-' + toggle.key}
								name={toggle.key}
								value="true"
								label={t(toggle.label)}
								description={toggle.description ? t(toggle.description) : ''}
								checked={data.settings[toggle.key]}
							/>
						{/each}
					</div>
				</section>
				<SubmitButton class="w-auto px-6">{t('Save')}</SubmitButton>
			</form>
			{#if data.facebookImport}
				<!-- Its own form, after the privacy one: disconnecting is immediate and must not ride along with a Save. -->
				<section class="glass-card mt-6 p-6" aria-labelledby="facebook-connection-title">
					<h2
						id="facebook-connection-title"
						class="text-lg leading-none font-semibold tracking-tight"
					>
						{t('Facebook')}
					</h2>
					<p class="mt-3 text-sm text-muted-foreground">
						{t('Disconnecting removes your Facebook account id and the friend ids stored with it.')}
						<a href="/facebook-data-deletion" class="link-tint font-semibold"
							>{t('How Facebook data is deleted')}</a
						>
					</p>
					<form method="post" action="/friends/facebook/disconnect" class="mt-4">
						<input type="hidden" name="return" value="settings" />
						<SecondarySubmitButton class="w-auto px-4"
							>{t('Disconnect Facebook')}</SecondarySubmitButton
						>
					</form>
				</section>
			{/if}
		{/if}
	</vigil.SettingsShell>
</div>
