<script lang="ts">
	// public.MarketBriefNotFoundMeta + MarketBriefNotFoundPage: a permalink with
	// no brief behind it. latestURL is the /brief redirect in the same language.
	import { translator, type Locale } from '#lib/i18n/index.js';
	import BriefNav from './BriefNav.svelte';

	let { lang }: { lang: Locale } = $props();
	const t = $derived(translator(lang));
	const latestURL = $derived('/brief' + (lang === 'pt-PT' ? '?lang=pt-PT' : ''));
</script>

<svelte:head>
	<title>{t('Market brief') + ' | Norviq'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main id="main-content" class="mx-auto w-full max-w-3xl px-6 py-10">
	<BriefNav {lang} signedIn={false} />
	<h1 class="text-2xl font-semibold">{t("This market brief isn't available")}</h1>
	<p class="mt-2 text-muted-foreground">{t('It may not have been written yet, or the link may be wrong.')}</p>
	<a href={latestURL} class="mt-6 inline-block underline underline-offset-4">{t('Read the latest brief')}</a>
</main>
