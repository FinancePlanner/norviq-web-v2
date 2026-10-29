<script lang="ts">
	// Port of norviq-web internal/pages/boards/boards.templ SubmitPage.
	import { enhance } from '$app/forms';
	import { Field, SelectField, SubmitButton, TextareaField, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import Banners from '#lib/features/social/boards/Banners.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Post - {data.board.name} - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page boards-page">
	<vigil.ModernPageHeader title={'Post to ' + data.board.name} subtitle="Link something worth reading, ask a question, or show what you built." />
	<Banners viewer={data.viewer} errorText={form?.error ?? ''} />
	{#key form}
		<form
			method="post"
			action={'/boards/' + data.board.slug + '/submit'}
			class="glass-card dash-panel max-w-2xl space-y-4 p-6"
			use:enhance={withSpinner(() => async ({ update }) => update({ reset: false }))}
		>
			<SelectField name="kind" label="Kind" options={form?.kindOptions ?? data.kindOptions} />
			<Field name="title" label="Title" value={form?.title ?? ''} required />
			<Field name="url" label="Link" type="url" value={form?.url ?? ''} placeholder="https://" description="Only for link posts." />
			<TextareaField name="body" label="Text" value={form?.body ?? ''} rows={6} description="Optional for links." />
			<Field name="tags" label="Tags" value={form?.tags ?? ''} placeholder="dividends, etf" description="Up to 5, comma separated." />
			<div class="flex gap-3">
				<SubmitButton>Post</SubmitButton>
				<a href={'/boards/' + data.board.slug} class="btn-secondary px-4">Cancel</a>
			</div>
		</form>
	{/key}
</div>
