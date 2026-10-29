<script lang="ts">
	// Go settings.AboutPage(AboutViewModel{Version: "1.0"}).
	import { BrandLogo } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';

	const version = '1.0';
</script>

<svelte:head>
	<title>About - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-modern-page settings-section-page settings-about">
	<vigil.SettingsShell backHref="/settings" backLabel={t('← Settings')} title="About Norviq">
		<div class="text-center">
			<BrandLogo variant="full-large" />
		</div>
		<div class="mt-8 space-y-3">
			<div class="glass-card px-5 py-4">
				<p class="font-semibold">Portfolio clarity</p>
				<p class="mt-1 text-sm text-muted-foreground">Track holdings, cost basis, and valuation changes from one place.</p>
			</div>
			<div class="glass-card px-5 py-4">
				<p class="font-semibold">Research workflow</p>
				<p class="mt-1 text-sm text-muted-foreground">Keep watchlists, stock insights, targets, and notes close to your decisions.</p>
			</div>
		</div>
		<nav class="mt-8 space-y-2">
			<a href="https://www.norviq.org/privacy" class="settings-about-link glass-card block px-5 py-4" target="_blank" rel="noopener">Privacy policy</a>
			<a href="https://www.norviq.org/terms" class="settings-about-link glass-card block px-5 py-4" target="_blank" rel="noopener">Terms of service</a>
			<a href="https://www.norviq.org/legal" class="settings-about-link glass-card block px-5 py-4" target="_blank" rel="noopener">Legal notice</a>
			<a href="https://www.norviq.org/security" class="settings-about-link glass-card block px-5 py-4" target="_blank" rel="noopener">Security</a>
			<a href="https://instagram.com/norviqplan" class="settings-about-link glass-card block px-5 py-4" target="_blank" rel="noopener">Follow on Instagram</a>
			<a href="https://x.com/NorviqPlanner" class="settings-about-link glass-card block px-5 py-4" target="_blank" rel="noopener">Follow on X</a>
			<a href="https://discord.gg/3QVkas3rH" class="settings-about-link glass-card block px-5 py-4" target="_blank" rel="noopener">Join Discord</a>
		</nav>
		<p class="mt-8 text-center text-xs opacity-40">Version {version} · Web PWA</p>
	</vigil.SettingsShell>
</div>
