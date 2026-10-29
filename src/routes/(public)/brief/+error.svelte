<script lang="ts">
	// MarketBriefHandler.notFound (the 404 page, in the URL's language) and
	// failed (503 "Temporarily unavailable", 500 otherwise).
	import { page } from '$app/state';
	import { normalizeLanguage } from '#lib/i18n/index.js';
	import BriefNotFound from '#lib/features/public/brief/BriefNotFound.svelte';

	const lang = $derived(normalizeLanguage(page.url.searchParams.get('lang')) ?? 'en');
</script>

<svelte:head>
	{#if page.status !== 404}<title>Norviq</title>{/if}
</svelte:head>

{#if page.status === 404}
	<BriefNotFound {lang} />
{:else}
	<main id="main-content" class="mx-auto w-full max-w-3xl px-6 py-10">
		<p>{page.error?.message}</p>
	</main>
{/if}
