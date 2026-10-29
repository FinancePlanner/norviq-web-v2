<script lang="ts">
	// pages/portfolio/news_modals.templ NewsArticlePanel: save or edit an
	// article. Go hx-post/hx-put'd and answered HX-Redirect (success) or this
	// panel again with the error and the submitted values; here the news page's
	// ?/createArticle / ?/updateArticle actions do the same.
	import { enhance } from '$app/forms';
	import Field from '#lib/components/norviq/Field.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import TextareaField from '#lib/components/norviq/TextareaField.svelte';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import { closeDialog } from '#lib/components/norviq/tui/dialog/index.js';
	import type { NewsArticleFormVM } from './types.js';

	const DIALOG = 'news-action-dialog';

	let { vm }: { vm: NewsArticleFormVM } = $props();

	// svelte-ignore state_referenced_locally
	let error = $state(vm.error);
	// svelte-ignore state_referenced_locally
	let values = $state({ symbol: vm.symbol, headline: vm.headline, source: vm.source, url: vm.url, summary: vm.summary, published_at: vm.publishedAt });

	const action = $derived(vm.isEdit ? `?/updateArticle&id=${encodeURIComponent(vm.articleID)}` : '?/createArticle');
	const close = () => closeDialog(DIALOG);
</script>

<div id="news-action-panel">
	<div class="portfolio-form-header">
		{#if vm.isEdit}
			<h2 id="news-action-title" class="text-xl font-semibold">Edit saved article</h2>
		{:else}
			<h2 id="news-action-title" class="text-xl font-semibold">Save article</h2>
		{/if}
		<NativeButton class="portfolio-form-close" data-tui-dialog-close="" data-tui-dialog-target={DIALOG} aria-label="Close" onclick={close}>
			<span aria-hidden="true">×</span>
		</NativeButton>
	</div>
	{#if error !== ''}
		<p class="mt-4 text-sm text-danger" role="alert">{error}</p>
	{/if}
	<form
		class="portfolio-form mt-6 space-y-6"
		method="POST"
		{action}
		use:enhance={withSpinner(() => async ({ result, update }) => {
			if (result.type === 'failure') {
				const data = (result.data ?? {}) as { articleError?: string; values?: Record<string, string> };
				error = data.articleError ?? '';
				// renderNewsArticleError: non-empty submitted values win.
				for (const [key, value] of Object.entries(data.values ?? {})) {
					if (value !== '' && key in values) values[key as keyof typeof values] = key === 'symbol' ? value.toUpperCase() : value;
				}
				return;
			}
			if (result.type === 'redirect') close();
			await update();
		})}
	>
		<Field id="news-symbol" name="symbol" label="Symbol" bind:value={values.symbol} placeholder="AAPL" required wrapperClass="space-y-2" />
		<Field id="news-headline" name="headline" label="Headline" bind:value={values.headline} required wrapperClass="space-y-2" />
		<Field id="news-source" name="source" label="Source" bind:value={values.source} placeholder="Optional" wrapperClass="space-y-2" />
		<Field id="news-url" name="url" label="URL" type="url" bind:value={values.url} placeholder="https://" wrapperClass="space-y-2" />
		<TextareaField id="news-summary" name="summary" label="Summary" bind:value={values.summary} placeholder="Optional" class="min-h-24" wrapperClass="space-y-2" />
		<Field id="news-published-at" name="published_at" label="Published at" bind:value={values.published_at} placeholder="2026-06-16T12:00:00Z" wrapperClass="space-y-2" />
		<div class="portfolio-form-actions">
			<NativeButton class="portfolio-form-cancel" data-tui-dialog-close="" data-tui-dialog-target={DIALOG} onclick={close}>Cancel</NativeButton>
			<SubmitButton class="portfolio-form-save">
				{#if vm.isEdit}
					Save changes
				{:else}
					Save article
				{/if}
			</SubmitButton>
		</div>
	</form>
</div>
