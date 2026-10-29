<script lang="ts">
	// public.marketBriefNav: the public nav in the page's language — sign in and
	// sign up for a visitor, the dashboard for a member.
	import BrandLogo from '#lib/components/norviq/BrandLogo.svelte';
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
	import { translator, type Locale } from '#lib/i18n/index.js';

	let { lang, signedIn }: { lang: Locale; signedIn: boolean } = $props();
	const t = $derived(translator(lang));
</script>

<header class="public-stock-nav mb-10 flex items-center justify-between gap-4">
	<a href="/" class="landing-brand-link" aria-label={t('Norviq home')}>
		<BrandLogo variant="full" />
	</a>
	<div class="flex items-center gap-2">
		{#if signedIn}
			<PrimaryButton href="/dashboard" class="px-4 py-2 text-sm sm:px-5">{t('Dashboard')}</PrimaryButton>
		{:else}
			<a href="/login" class="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:px-4">{t('Sign in')}</a>
			<PrimaryButton href="/signup" class="px-4 py-2 text-sm sm:px-5">{t('Sign up')}</PrimaryButton>
		{/if}
	</div>
</header>
