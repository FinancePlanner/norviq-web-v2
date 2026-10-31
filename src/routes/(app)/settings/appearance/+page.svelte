<script lang="ts">
	// Go settings.AppearancePage. ThemeToggle drives #lib/theme.svelte.js
	// (localStorage app_appearance), as theme.js did.
	import { ThemeToggle } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
</script>

<svelte:head>
	<title>Appearance - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-modern-page settings-appearance-card">
	<vigil.SettingsShell
		backHref="/settings"
		backLabel={t('← Settings')}
		title={t('Appearance')}
		subtitle={t('Choose how Norviq looks on this device.')}
	>
		<div class="glass-card p-6">
			<p class="text-sm font-medium">{t('Appearance')}</p>
			<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
				{t('System follows your device setting. Light and Dark stay fixed.')}
			</p>
			<div class="mt-4">
				<ThemeToggle />
			</div>
		</div>
	</vigil.SettingsShell>
</div>
