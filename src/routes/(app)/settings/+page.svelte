<script lang="ts">
	import { BrandLogo, Icon, SecondarySubmitButton } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);

	const links = $derived([
		{ title: t('Profile'), href: '/settings/profile', description: t('Name, email, and password'), icon: 'user-round-cog' },
		{ title: t('Subscription'), href: '/settings/subscription', description: t('Plan, billing, and coupons'), icon: 'badge-dollar-sign' },
		{ title: t('Appearance'), href: '/settings/appearance', description: t('Theme and display'), icon: 'palette' },
		{ title: t('Badges'), href: '/settings/badges', description: t('Achievements and milestones'), icon: 'badge-check' },
		...(data.social.enabled
			? [
					{ title: t('Friends privacy'), href: '/settings/friends-privacy', description: t('Who can find you and what friends see'), icon: 'users' },
					{ title: t('Blocked people'), href: '/settings/blocked', description: t('People you blocked'), icon: 'ban' }
				]
			: []),
		{ title: t('Notifications'), href: '/settings/notifications', description: t('Earnings reminder preferences'), icon: 'bell' },
		{ title: t('Language'), href: '/settings/language', description: t('App language preference'), icon: 'languages' },
		{ title: t('Feedback'), href: '/settings/feedback', description: t('Send suggestions or report issues'), icon: 'message-square-text' },
		{ title: t('Integrations'), href: '/settings/integrations', description: t('Brokers, CSV import, and IBKR'), icon: 'blocks' },
		{ title: t('Bank sync'), href: '/settings/banks', description: t('Connect a bank to review and import transactions'), icon: 'landmark' },
		{ title: t('API access'), href: '/settings/api-access', description: t('Connect AI clients with access tokens'), icon: 'key-round' },
		{ title: t('AI providers'), href: '/settings/ai-providers', description: t('Use your own Anthropic or OpenAI key'), icon: 'brain-circuit' },
		{ title: t('News ticker'), href: '/settings/news-ticker', description: t('Breaking market headlines on your dashboard'), icon: 'newspaper' },
		{ title: t('Data export'), href: '/settings/export', description: t('Download portfolio and activity data'), icon: 'download' },
		{ title: t('About'), href: '/settings/about', description: t('Version, legal, and connect'), icon: 'info' }
	]);
</script>

<svelte:head>
	<title>Settings - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-index settings-modern-page">
	<vigil.SettingsShell title={t('Settings')}>
		{#if vm.hasProfile}
			<div class="settings-profile-card settings-profile-hero">
				<div class="settings-profile-avatar" aria-hidden="true">
					<BrandLogo variant="icon" />
				</div>
				<div class="settings-profile-main">
					<div class="settings-profile-copy">
						{#if vm.username !== ''}
							<p class="settings-profile-name">{vm.username}</p>
						{:else}
							<p class="settings-profile-name">{t('Your account')}</p>
						{/if}
						<p class="settings-profile-email">{vm.email}</p>
						<p class="settings-profile-plan">
							<span class="settings-plan-label">{vm.planLabel}</span>
							{#if vm.isPro}
								<span class="pro-badge ml-2">Pro</span>
							{/if}
						</p>
					</div>
					<a href="/settings/profile" class="btn-primary w-auto px-5 py-2 text-sm">{t('Edit profile')}</a>
				</div>
			</div>
		{:else if vm.profileError !== ''}
			<div class="glass-card mt-6 p-6" role="alert">
				<p class="text-sm text-muted-foreground">{vm.profileError}</p>
			</div>
		{/if}
		<nav class="settings-card-grid" aria-label={t('Settings sections')}>
			{#each links as link (link.href)}
				<a href={link.href} class="settings-link-card glass-card p-5 transition hover:brightness-[1.02]">
					<span class="settings-link-icon" aria-hidden="true">
						<Icon name={link.icon} class="h-5 w-5" />
					</span>
					<span class="settings-link-copy">
						<strong>{link.title}</strong>
						<small>{link.description}</small>
					</span>
				</a>
			{/each}
		</nav>
		<!-- Plain posts, as in Go: both end in a full redirect. -->
		<form method="post" action="/settings/show-me-around" class="settings-logout-row">
			<SecondarySubmitButton class="px-5">{t('Show me around')}</SecondarySubmitButton>
		</form>
		<form method="post" action="/logout" class="settings-logout-row">
			<SecondarySubmitButton class="px-5">{t('Log out')}</SecondarySubmitButton>
		</form>
	</vigil.SettingsShell>
</div>
