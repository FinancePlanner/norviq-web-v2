<script lang="ts">
	// pages/portfolio/subpages.templ NewsPage (newsBody and helpers) plus
	// news_modals.templ NewsArticleModalShell.
	import { enhance } from '$app/forms';
	import {
		EmptyState,
		NativeButton,
		PrimaryButton,
		VigMark
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import NewsArticlePanel from '#lib/features/portfolio/analytics/NewsArticlePanel.svelte';
	import {
		emptyNewsArticleForm,
		type NewsArticleFormVM,
		type NewsArticleVM
	} from '#lib/features/portfolio/analytics/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
	const isPro = $derived(data.isPro || vm.isPro);

	// GET /portfolio/news/article[/{id}] filled #news-action-panel; the saved
	// list already carries each article's form values.
	let articleForm = $state<NewsArticleFormVM>(emptyNewsArticleForm());
	let articleFormKey = $state(0);
	function openArticleForm(form?: NewsArticleFormVM) {
		articleForm = form ? { ...form } : emptyNewsArticleForm();
		articleFormKey++;
		dialog.openDialog('news-action-dialog');
	}

	// "Not relevant" swapped the card out with the empty 200 response.
	let dismissed = $state<string[]>([]);
	const articles = $derived(vm.articles.filter((a) => !dismissed.includes(a.id)));

	const filterClass = (value: string) =>
		vm.filter === value ? 'filter-chip filter-chip-active' : 'filter-chip';
	const severityClass = (severity: string) =>
		severity === 'HIGH' ? 'font-bold text-[var(--color-danger)]' : 'font-semibold';

	/** newsArticleViewURL */
	function viewURL(article: NewsArticleVM): string {
		if (article.isThesisWatch)
			return (
				`/portfolio/news/thesis-watch/${article.id}/open?` +
				new URLSearchParams({ url: article.url })
			);
		const values = new URLSearchParams({ headline: article.headline, url: article.url });
		if (article.id !== '') values.set('id', article.id);
		if (article.symbol !== '') values.set('symbol', article.symbol);
		values.sort(); // url.Values.Encode sorts by key
		return '/news/view?' + values;
	}

	/** newsArticleRemoveURL, as an action. */
	function removeAction(articleID: string): string {
		let action = '?/deleteArticle&id=' + encodeURIComponent(articleID);
		if (vm.filter !== '' && vm.filter !== 'all')
			action += '&filter=' + encodeURIComponent(vm.filter);
		return action;
	}
</script>

<svelte:head>
	<title>Thesis Watch - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

{#snippet headerActions()}
	<NativeButton
		class="btn-primary w-auto shrink-0 px-5 py-2 text-sm"
		data-tui-dialog-trigger=""
		data-tui-dialog-target="news-action-dialog"
		onclick={() => openArticleForm()}
	>
		Save article
	</NativeButton>
{/snippet}

{#snippet articleInner(article: NewsArticleVM)}
	<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
		{#if article.relationship !== ''}
			<span class="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">{article.relationship}</span>
		{/if}
		{#if article.eventType !== ''}
			<span>{article.eventType}</span>
		{/if}
		{#if article.severity !== ''}
			<span class={severityClass(article.severity)}>{article.severity}</span>
		{/if}
		{#if article.symbol !== ''}
			<span>{article.symbol}</span>
		{/if}
		{#if article.source !== ''}
			<span>{article.source}</span>
		{/if}
		{#if article.timeAgo !== ''}
			<span>{article.timeAgo}</span>
		{/if}
	</div>
	<h3 class="news-card-headline mt-2 text-base leading-snug font-semibold">{article.headline}</h3>
	{#if article.summary !== ''}
		<p class="news-card-summary mt-2 line-clamp-2 text-sm text-muted-foreground">
			{article.summary}
		</p>
	{/if}
	{#if article.whyItMatters !== ''}
		<div class="mt-3 rounded-lg bg-[var(--color-accent)]/10 p-3">
			<p class="text-footnote font-semibold text-muted-foreground">Why it matters</p>
			<p class="mt-1 text-sm font-medium">{article.whyItMatters}</p>
		</div>
	{/if}
	{#if article.exposure !== '' || (article.thesisImpact !== '' && article.thesisImpact !== 'Not assessed')}
		<div class="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
			{#if article.exposure !== ''}
				<span>{article.exposure}</span>
			{/if}
			{#if article.thesisImpact !== '' && article.thesisImpact !== 'Not assessed'}
				<span class="text-[var(--color-accent)]">{article.thesisImpact}</span>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet feedbackActions(article: NewsArticleVM)}
	<!-- Go's hx-vals='{"signal":…}' was mangled by the templ formatter, so its
	     buttons posted no signal; this sends the signal each button names. -->
	<form
		class="mt-4 flex flex-wrap gap-2"
		method="POST"
		action={'?/feedback&id=' + encodeURIComponent(article.id)}
		use:enhance={() =>
			async ({ result, formData }) => {
				if (result.type === 'success' && formData.get('signal') === 'not_relevant')
					dismissed = [...dismissed, article.id];
			}}
	>
		<NativeButton
			type="submit"
			name="signal"
			value="relevant"
			class="btn-secondary px-3 py-1 text-xs">Relevant</NativeButton
		>
		<NativeButton
			type="submit"
			name="signal"
			value="not_relevant"
			class="btn-secondary px-3 py-1 text-xs">Not relevant</NativeButton
		>
	</form>
{/snippet}

<div class="app-page-content vigil-deck-page portfolio-news-page portfolio-modern-page">
	<vigil.ModernPageHeader
		title="Thesis Watch"
		subtitle="Market news ranked by your holdings and thesis"
		actions={headerActions}
	/>
	<div class="filter-chips" role="group" aria-label="News filter">
		<a href="/portfolio/news" class={filterClass('for_you')}>For you</a>
		<a href="/portfolio/news?filter=holdings" class={filterClass('holdings')}>Holdings</a>
		<a href="/portfolio/news?filter=watchlist" class={filterClass('watchlist')}>Watchlist</a>
		<a href="/portfolio/news?filter=sectors" class={filterClass('sectors')}>Sectors</a>
		<a href="/portfolio/news?filter=market" class={filterClass('market')}>Market</a>
		<a href="/portfolio/news?filter=saved" class={filterClass('saved')}>Saved</a>
	</div>
	{#if !isPro && vm.filter !== 'saved'}
		<div class="glass-card mt-5 border border-[var(--color-accent)]/25 p-5">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div>
					<p class="font-semibold">Headlines are free. Portfolio impact is Pro.</p>
					<p class="mt-1 text-sm text-muted-foreground">
						Unlock exposure ranking, thesis checks, and alerts for major events.
					</p>
				</div>
				<PrimaryButton href="/settings/subscription" class="px-5 py-2 text-sm"
					>Unlock Thesis Watch</PrimaryButton
				>
			</div>
		</div>
	{/if}
	{#if vm.loadError}
		<div class="glass-card mt-6 p-6" role="alert">
			<p class="font-semibold">Could not load news</p>
			<p class="mt-2 text-sm text-muted-foreground">Try refreshing the page.</p>
		</div>
	{:else if articles.length > 0}
		<div class="vigil-dense-list mt-6">
			{#each articles as article (article.id)}
				<div id={'news-article-' + article.id} class="news-card-wrapper">
					<div class="news-card glass-card p-5">
						<div class="flex items-start gap-3">
							<div class="min-w-0 flex-1">
								{#if article.url !== ''}
									<a
										href={viewURL(article)}
										class="block transition hover:brightness-[1.02]"
										target="_blank"
										rel="noopener noreferrer"
									>
										{@render articleInner(article)}
									</a>
								{:else}
									{@render articleInner(article)}
								{/if}
								{#if article.isThesisWatch}
									{@render feedbackActions(article)}
								{/if}
							</div>
							<div class="flex shrink-0 flex-col gap-2">
								{#if vm.filter === 'saved'}
									<NativeButton
										class="btn-secondary px-2 py-1 text-xs"
										data-tui-dialog-trigger=""
										data-tui-dialog-target="news-action-dialog"
										onclick={() => openArticleForm(article.form)}
									>
										Edit
									</NativeButton>
								{/if}
								{#if article.id !== ''}
									<form
										method="POST"
										action={removeAction(article.id)}
										use:enhance
										class="contents"
									>
										<NativeButton
											type="submit"
											class="btn-secondary px-2 py-1 text-xs text-[var(--color-danger)]"
											onclick={(e: MouseEvent) => {
												if (!confirm('Remove this article from your library?')) e.preventDefault();
											}}
										>
											Remove
										</NativeButton>
									</form>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="mt-6">
			{#if vm.filter === 'saved'}
				<div class="glass-card p-8 text-center">
					<VigMark />
					<h2 class="empty-state-title mt-4">No saved articles</h2>
					<p class="empty-state-desc mt-2">Save headlines from your feed or add one manually.</p>
					<NativeButton
						class="btn-primary empty-state-action mt-6 inline-flex w-auto px-6"
						data-tui-dialog-trigger=""
						data-tui-dialog-target="news-action-dialog"
						onclick={() => openArticleForm()}
					>
						Save article
					</NativeButton>
				</div>
			{:else}
				<EmptyState
					title="No headlines yet"
					description="Connect holdings or add watchlist symbols to personalize your feed."
					actionLabel="View holdings"
					actionHref="/portfolio"
				/>
			{/if}
		</div>
	{/if}
	<dialog.Dialog id="news-action-dialog">
		<dialog.Content class="glass-card vigil-modal-panel border-0 p-6 sm:max-w-2xl md:p-8">
			<!-- The #news-action-loading skeleton only showed during the hx-get; the panel renders at once here. -->
			{#key articleFormKey}
				<NewsArticlePanel vm={articleForm} />
			{/key}
		</dialog.Content>
	</dialog.Dialog>
</div>
