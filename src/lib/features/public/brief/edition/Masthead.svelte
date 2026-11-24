<script lang="ts">
	// A. Publication masthead and edition navigation.
	import BrandLogo from '#lib/components/norviq/BrandLogo.svelte';
	import type { EditionStrings } from './strings.js';

	let {
		labels: L,
		editionName,
		dateLong,
		dateISO,
		previousURL,
		latestURL,
		otherLanguageURL,
		otherLanguageCode,
		otherLanguageLabel,
		signedIn
	}: {
		labels: EditionStrings;
		editionName: string;
		dateLong: string;
		dateISO: string;
		previousURL: string;
		latestURL: string;
		otherLanguageURL: string;
		otherLanguageCode: string;
		otherLanguageLabel: string;
		signedIn: boolean;
	} = $props();
</script>

<header class="mi-masthead">
	<div class="mi-brand">
		<a href="/" aria-label={L.home}><BrandLogo variant="full" /></a>
		<span class="mi-brand__divider" aria-hidden="true"></span>
		<span class="mi-label mi-label--gold">{L.marketIntelligence}</span>
	</div>
	<p class="mi-masthead__edition mi-label">
		<strong>{editionName}</strong>
		<time datetime={dateISO}>{dateLong}</time>
	</p>
</header>
<nav class="mi-edition-nav" aria-label={L.moreBriefs}>
	<div class="mi-edition-nav__links">
		{#if previousURL}
			<a href={previousURL} rel="prev">← {L.previousEdition}</a>
		{/if}
		{#if latestURL}
			<a href={latestURL}>{L.latestEdition} →</a>
		{/if}
		{#if otherLanguageURL}
			<a
				href={otherLanguageURL}
				hreflang={otherLanguageCode}
				lang={otherLanguageCode}
				data-sveltekit-reload>{otherLanguageLabel}</a
			>
		{/if}
	</div>
	<div class="mi-edition-nav__links">
		{#if signedIn}
			<a href="/dashboard">{L.dashboard}</a>
		{:else}
			<a href="/login">{L.signIn}</a>
			<a href="/signup">{L.signUp}</a>
		{/if}
	</div>
</nav>
