<script lang="ts">
	// public.MarketBriefMeta + public.MarketBriefPage (internal/pages/public/market_brief.templ).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
	import ShareBar from '#lib/components/norviq/ShareBar.svelte';
	import MarketBriefContent from '#lib/features/dashboard/market-brief/MarketBriefContent.svelte';
	import { translator } from '#lib/i18n/index.js';
	import BriefNav from './BriefNav.svelte';
	import type { BriefPageVM } from './brief.server.js';

	let { vm }: { vm: BriefPageVM } = $props();
	const t = $derived(translator(vm.lang));
	const subtitle = $derived(
		vm.brief.tradingDate +
			(vm.brief.generatedAt
				? ' · ' + t('Updated at') + ' ' + vm.brief.generatedAt + ' ' + t('(Lisbon time)')
				: '')
	);
</script>

<svelte:head>
	<title>{vm.documentTitle}</title>
	<meta name="description" content={vm.description} />
	<meta name="robots" content="index,follow,max-image-preview:large" />
	<link rel="canonical" href={vm.canonicalURL} />
	<link rel="alternate" hreflang="en" href={vm.englishURL} />
	<link rel="alternate" hreflang="pt-PT" href={vm.portugueseURL} />
	<link rel="alternate" hreflang="x-default" href={vm.englishURL} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="Norviq" />
	<meta property="og:locale" content={vm.ogLocale} />
	<meta property="og:locale:alternate" content={vm.ogLocaleAlternate} />
	<meta property="og:url" content={vm.canonicalURL} />
	<meta property="og:title" content={vm.documentTitle} />
	<meta property="og:description" content={vm.description} />
	<meta property="og:image" content={vm.ogImageURL} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={vm.title} />
	{#if vm.publishedISO}
		<meta property="article:published_time" content={vm.publishedISO} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@NorviqPlanner" />
	<meta name="twitter:title" content={vm.documentTitle} />
	<meta name="twitter:description" content={vm.description} />
	<meta name="twitter:image" content={vm.ogImageURL} />
	{#if vm.jsonLD}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- Go-style escaped JSON (<, >, & as \u00XX) -->
		{@html '<script type="application/ld+json">' + vm.jsonLD + '</scr' + 'ipt>'}
	{/if}
</svelte:head>

<main id="main-content" class="mx-auto w-full max-w-3xl px-6 py-10" data-market-brief-page>
	<BriefNav lang={vm.lang} signedIn={vm.signedIn} />
	<article aria-labelledby="market-brief-heading">
		<header>
			<p class="text-sm font-semibold tracking-widest text-muted-foreground">{t('Market brief')}</p>
			<h1 id="market-brief-heading" class="mt-1 text-3xl font-semibold tracking-tight">
				{vm.heading}
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				<time datetime={vm.brief.tradingDateISO}>{subtitle}</time>
				{#if vm.otherLanguageURL}
					<span aria-hidden="true">·</span>
					<a
						href={vm.otherLanguageURL}
						hreflang={vm.otherLanguageCode}
						lang={vm.otherLanguageCode}
						class="underline underline-offset-4"
						data-sveltekit-reload>{vm.otherLanguageLabel}</a
					>
				{/if}
			</p>
		</header>
		<div class="mt-6">
			<vigil.Panel class="market-brief-card">
				<MarketBriefContent vm={vm.brief} />
			</vigil.Panel>
		</div>
		{#if vm.previousURL || vm.latestURL}
			<nav
				class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
				aria-label={t('More market briefs')}
			>
				{#if vm.previousURL}
					<a href={vm.previousURL} rel="prev" class="underline underline-offset-4"
						>← {t('Previous brief')}</a
					>
				{:else}
					<span></span>
				{/if}
				{#if vm.latestURL}
					<a href={vm.latestURL} class="underline underline-offset-4">{t('Latest brief')} →</a>
				{/if}
			</nav>
		{/if}
	</article>
	<section id="share" class="mt-10 scroll-mt-6" aria-labelledby="market-brief-share-heading">
		<h2 id="market-brief-share-heading" class="text-sm font-semibold text-muted-foreground">
			{t('Share this brief')}
		</h2>
		<ShareBar
			class="mt-3"
			links={vm.share}
			cardImageURL={vm.cardImageURL}
			cardFileName={vm.cardFileName}
			native
			nativeURL={vm.nativeShareURL}
			nativeTitle={vm.title}
			event="market_brief_shared"
			eventProps={vm.shareProps}
			text={{
				group: t('Share this brief'),
				x: t('Share on X'),
				linkedIn: 'LinkedIn',
				reddit: 'Reddit',
				whatsApp: 'WhatsApp',
				discord: t('Copy for Discord'),
				instagram: t('Share image'),
				copy: t('Copy link'),
				copied: t('Copied'),
				native: t('Share…')
			}}
		/>
	</section>
	{#if !vm.signedIn}
		<section class="mt-10 rounded-[var(--radius)] border bg-card-bg p-6" data-market-brief-cta>
			<h2 class="text-xl font-semibold">{t('Follow the markets with Norviq')}</h2>
			<p class="mt-2 text-muted-foreground">
				{t(
					'The brief is on your Norviq dashboard every weekday morning and evening, next to your portfolio.'
				)}
			</p>
			<PrimaryButton href="/signup" class="mt-4 w-auto px-6"
				>{t('Create free account')}</PrimaryButton
			>
		</section>
	{/if}
	<footer class="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
		<a href="/terms" class="underline">{t('Terms')}</a>
		<span aria-hidden="true">·</span>
		<a href="/privacy" class="underline">{t('Privacy')}</a>
	</footer>
</main>
