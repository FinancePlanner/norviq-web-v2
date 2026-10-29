<script lang="ts">
	import { SelectField, SubmitButton, ToastBanner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const options = $derived([
		{ value: 'en', label: t('English'), selected: data.currentLanguage === 'en' },
		{ value: 'pt-PT', label: t('Portuguese'), selected: data.currentLanguage === 'pt-PT' }
	]);
</script>

<svelte:head>
	<title>Language - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-modern-page settings-section-page">
	<vigil.SettingsShell backHref="/settings" backLabel={t('← Settings')} title={t('Language')}>
		<div class="glass-card p-6">
			{#if data.successMessage !== ''}
				<ToastBanner message={t(data.successMessage)} />
			{/if}
			<!-- Plain POST on purpose: the redirect must re-render SSR in the new locale. -->
			<form method="post" action="/settings/language" class="space-y-4">
				<div>
					<label class="field-label" for="language">{t('Preferred language')}</label>
					<p class="mt-1 text-sm text-muted-foreground">{t('Stored on this device.')}</p>
					<SelectField id="language" name="language" class="mt-3" {options} />
				</div>
				<SubmitButton class="w-auto px-6">{t('Save language')}</SubmitButton>
			</form>
		</div>
	</vigil.SettingsShell>
</div>
