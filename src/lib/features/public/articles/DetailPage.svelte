<script lang="ts">
	// articles.templ DetailMeta + DetailPage, inside templates.PublicLayout
	// (title "{Title} — Norviq"). Signed-in readers get the same layout (no app
	// shell), with vote, edit/delete, hide and report controls.
	import { onMount } from 'svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import NativeSelect from '#lib/components/norviq/NativeSelect.svelte';
	import ShareBar from '#lib/components/norviq/ShareBar.svelte';
	import TextareaField from '#lib/components/norviq/TextareaField.svelte';
	import ArticleCard from './ArticleCard.svelte';
	import Footer from './Footer.svelte';
	import Header from './Header.svelte';
	import VoteButton from './VoteButton.svelte';
	import { DISCLAIMER, REPORT_REASONS } from './articles.js';
	import type { DetailVM } from './types.js';

	let { vm }: { vm: DetailVM } = $props();

	const jsonLDTag = $derived('<script type="application/ld+json">' + vm.jsonLD + '</' + 'script>');

	// share.js recordView: the view beacon. Anonymous pages are CDN-cached, so
	// the count is a POST from the browser. The session flag is set only once
	// the backend has the view, so a failed beacon is retried on the next visit.
	async function recordView(url: string) {
		if (!url) return;
		const key = 'nv-viewed:' + url;
		try {
			if (sessionStorage.getItem(key)) return;
		} catch {
			/* storage blocked */
		}
		try {
			const response = await fetch(url, { method: 'POST', keepalive: true, credentials: 'same-origin' });
			if (!response.ok) return;
		} catch {
			return;
		}
		try {
			sessionStorage.setItem(key, '1');
		} catch {
			/* storage blocked */
		}
	}

	let main: HTMLElement | undefined = $state();
	onMount(() => {
		// Marked so a second pass over the same DOM never repeats the beacon.
		if (!main || main.dataset.articleViewBound === '1') return;
		main.dataset.articleViewBound = '1';
		void recordView(vm.viewURL);
	});

	function confirmDelete(e: SubmitEvent) {
		if (!window.confirm('Delete this article?')) e.preventDefault();
	}
</script>

<svelte:head>
	<title>{vm.title + ' — Norviq'}</title>
	<meta name="description" content={vm.metaDescription} />
	{#if vm.indexable}
		<meta name="robots" content="index,follow,max-image-preview:large" />
	{:else}
		<meta name="robots" content="noindex" />
	{/if}
	<link rel="canonical" href={vm.canonicalURL} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="Norviq" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:url" content={vm.canonicalURL} />
	<meta property="og:title" content={vm.title} />
	<meta property="og:description" content={vm.metaDescription} />
	<meta property="og:image" content={vm.ogImageURL} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="article:published_time" content={vm.publishedISO} />
	<meta property="article:modified_time" content={vm.modifiedISO} />
	{#each vm.tickers as t (t.symbol)}
		<meta property="article:tag" content={t.symbol} />
	{/each}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@NorviqPlanner" />
	<meta name="twitter:title" content={vm.title} />
	<meta name="twitter:description" content={vm.metaDescription} />
	<meta name="twitter:image" content={vm.ogImageURL} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- Go-escaped JSON (goJSON) -->
	{@html jsonLDTag}
</svelte:head>

<main bind:this={main} id="main-content" class="mx-auto w-full max-w-3xl px-6 py-10" data-article-view={vm.viewURL}>
	<Header />
	{#if vm.notice !== ''}
		<p role="status" class="mb-6 rounded-lg border border-border p-3 text-sm">{vm.notice}</p>
	{/if}
	{#if vm.hidden}
		<p role="status" class="mb-6 rounded-lg border border-[var(--color-danger)] p-3 text-sm">
			Hidden by a moderator. Only you and moderators can see it.
		</p>
	{/if}
	<nav aria-label="Breadcrumb" class="text-sm text-muted-foreground">
		<a href="/articles" class="hover:underline">Articles</a>
		{#if vm.tickers.length > 0}
			› <a href={vm.tickers[0].feedURL} class="hover:underline">{'$' + vm.tickers[0].symbol}</a>
		{/if}
	</nav>
	<h1 class="mt-3 text-3xl font-semibold leading-tight">{vm.title}</h1>
	<p class="mt-3 text-sm text-muted-foreground">
		<a href={vm.authorURL} class="font-medium hover:underline">{vm.author}</a>
		· <time datetime={vm.publishedISO}>{vm.publishedLabel}</time>
		{#if vm.edited}
			· edited
		{/if}
		· {vm.readingMinutes} min read · {vm.views} views
	</p>
	<div class="mt-4 flex flex-wrap items-center gap-2">
		{#each vm.tickers as t (t.symbol)}
			<a href={t.feedURL} class="rounded-full border border-border px-3 py-1 text-sm font-medium">{'$' + t.symbol}</a>
			{#if t.stockURL !== ''}
				<a href={t.stockURL} class="text-xs text-muted-foreground underline">{t.symbol} data</a>
			{/if}
		{/each}
	</div>
	<section class="mt-6 rounded-xl border border-border p-5" aria-labelledby="key-points">
		<h2 id="key-points" class="text-sm font-semibold text-muted-foreground">Key points</h2>
		<ul class="mt-3 list-disc space-y-2 pl-5">
			{#each vm.bullets as b, i (i)}
				<li>{b}</li>
			{/each}
		</ul>
	</section>
	{#if vm.coverURL !== ''}
		<img src={vm.coverURL} alt="" class="mt-6 w-full rounded-xl" loading="lazy" />
	{/if}
	<article class="prose mt-8 max-w-none">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by #lib/markdown.js -->
		{@html vm.bodyHTML}
	</article>
	<aside class="mt-8 rounded-xl border border-border p-4 text-sm"><strong>Disclosure:</strong> {vm.disclosure}</aside>
	<p class="mt-3 text-xs text-muted-foreground">{DISCLAIMER}</p>
	<div class="mt-6 flex flex-wrap items-center gap-3">
		{#key vm.code}
			<VoteButton code={vm.code} count={vm.upvotes} voted={vm.viewerUpvoted} canVote={vm.signedIn} loginURL={vm.loginURL} />
		{/key}
		<ShareBar
			links={vm.share}
			cardImageURL={vm.cardImageURL}
			cardFileName="norviq-article.png"
			text={{
				group: 'Share this article',
				x: 'Share on X',
				linkedIn: 'LinkedIn',
				reddit: 'Reddit',
				whatsApp: 'WhatsApp',
				discord: 'Copy for Discord',
				instagram: 'Instagram card',
				copy: 'Copy link',
				copied: 'Copied'
			}}
		/>
	</div>
	{#if vm.signedIn}
		<div class="mt-6 flex flex-wrap gap-3 text-sm">
			{#if vm.viewerIsAuthor}
				<a href={'/articles/' + vm.code + '/edit'} class="underline">Edit</a>
				<form method="post" action={'/articles/' + vm.code + '/delete'} onsubmit={confirmDelete}>
					<NativeButton type="submit" class="text-[var(--color-danger)] underline">Delete</NativeButton>
				</form>
			{/if}
			{#if vm.isAdmin}
				<form method="post" action={'/articles/' + vm.code + '/visibility'}>
					<input type="hidden" name="hidden" value={String(!vm.hidden)} />
					<NativeButton type="submit" class="underline">
						{#if vm.hidden}
							Unhide
						{:else}
							Hide
						{/if}
					</NativeButton>
				</form>
			{/if}
			<details>
				<summary class="cursor-pointer underline">Report</summary>
				<form method="post" action={'/articles/' + vm.code + '/report'} class="mt-2 space-y-2">
					<NativeSelect name="reason" class="rounded border border-border p-1" options={REPORT_REASONS} aria-label="Reason" />
					<TextareaField
						name="note"
						rows={2}
						placeholder="Anything we should know (optional)"
						class="block w-full rounded border border-border p-2"
						maxlength={1000}
						aria-label="Report details"
					/>
					<NativeButton type="submit" class="rounded-lg border border-border px-3 py-1">Send report</NativeButton>
				</form>
			</details>
		</div>
	{/if}
	{#if vm.more.length > 0 && vm.tickers.length > 0}
		<section class="mt-12">
			<h2 class="text-lg font-semibold">{'More on $' + vm.tickers[0].symbol}</h2>
			<ol class="mt-4 space-y-4">
				{#each vm.more as c (c.url)}
					<ArticleCard card={c} />
				{/each}
			</ol>
		</section>
	{/if}
	<Footer />
</main>
