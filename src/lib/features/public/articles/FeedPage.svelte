<script lang="ts">
	// articles.templ FeedMeta + FeedPage, inside templates.PublicLayout
	// (title "{Heading} — Norviq"). Shared by /articles, /articles/ticker/{symbol}
	// and /u/{username}/articles.
	import ArticleCard from './ArticleCard.svelte';
	import Footer from './Footer.svelte';
	import Header from './Header.svelte';
	import type { FeedVM } from './types.js';

	let { vm }: { vm: FeedVM } = $props();
</script>

<svelte:head>
	<title>{vm.heading + ' — Norviq'}</title>
	<meta name="description" content={vm.metaDescription} />
	<meta name="robots" content="index,follow,max-image-preview:large" />
	<link rel="canonical" href={vm.canonicalURL} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Norviq" />
	<meta property="og:url" content={vm.canonicalURL} />
	<meta property="og:title" content={vm.heading} />
	<meta property="og:description" content={vm.metaDescription} />
	<meta property="og:image" content={vm.ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@NorviqPlanner" />
</svelte:head>

<main id="main-content" class="mx-auto w-full max-w-3xl px-6 py-10">
	<Header />
	<h1 class="text-3xl font-semibold">{vm.heading}</h1>
	{#if vm.subheading !== ''}
		<p class="mt-2 text-muted-foreground">{vm.subheading}</p>
	{/if}
	{#if vm.notice !== ''}
		<p role="status" class="mt-4 rounded-lg border border-border p-3 text-sm">{vm.notice}</p>
	{/if}
	{#if vm.cards.length === 0}
		<p class="mt-8 text-muted-foreground">No articles yet. <a href="/articles/new" class="underline">Write the first one.</a></p>
	{:else}
		<ol class="mt-8 space-y-4">
			{#each vm.cards as c (c.url)}
				<ArticleCard card={c} />
			{/each}
		</ol>
	{/if}
	{#if vm.nextURL !== ''}
		<a href={vm.nextURL} rel="next" class="mt-6 inline-block underline">Older articles</a>
	{/if}
	<Footer />
</main>
