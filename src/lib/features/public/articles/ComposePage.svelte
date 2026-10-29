<script lang="ts">
	// articles.templ ComposePage, inside the app shell (Go renderShell with the
	// title "{Heading} - Norviq"). The live preview was an hx-post to
	// /articles/preview on "input changed delay:600ms"; it is the same POST
	// here, urlencoded so the cover file never rides along.
	import { enhance } from '$app/forms';
	import Field from '#lib/components/norviq/Field.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import TextareaField from '#lib/components/norviq/TextareaField.svelte';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import { DISCLAIMER } from './articles.js';
	import type { ComposeVM } from './types.js';

	let { vm }: { vm: ComposeVM } = $props();

	let previewHTML = $derived(vm.preview);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lastSent: string | null = null;

	function schedulePreview(e: Event) {
		const body = (e.currentTarget as HTMLTextAreaElement).value;
		clearTimeout(timer);
		timer = setTimeout(() => void sendPreview(body), 600);
	}

	async function sendPreview(body: string) {
		if (body === lastSent) return;
		lastSent = body;
		try {
			const res = await fetch('/articles/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ body })
			});
			if (res.ok) previewHTML = await res.text();
		} catch {
			/* keep the last preview */
		}
	}

	// A failed submit re-renders the form like Go's full-page response: the
	// chosen file is cleared (an uploaded cover is kept as cover_image_id).
	const submit = withSpinner(({ formElement }) => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'failure') {
				const file = formElement.querySelector<HTMLInputElement>('input[type="file"]');
				if (file) file.value = '';
			}
		};
	});
</script>

<svelte:head>
	<title>{vm.heading + ' - Norviq'}</title>
</svelte:head>

<div class="mx-auto w-full max-w-3xl px-6 py-8">
	<h1 class="text-2xl font-semibold">{vm.heading}</h1>
	<p class="mt-1 text-sm text-muted-foreground">Your article is public and shows on each ticker's page. {DISCLAIMER}</p>
	{#if vm.error !== ''}
		<p role="alert" class="mt-4 rounded-lg border border-[var(--color-danger)] p-3 text-sm">{vm.error}</p>
	{/if}
	{#if !vm.blocked}
		<form method="post" action={vm.action} enctype="multipart/form-data" class="mt-6 space-y-5" use:enhance={submit}>
			{#if vm.form.idempotencyKey !== ''}
				<input type="hidden" name="idempotency_key" value={vm.form.idempotencyKey} />
			{/if}
			<Field name="title" label="Title" value={vm.form.title} required placeholder="Why 2027 could reprice NextDecade" />
			<Field
				name="tickers"
				label="Tickers"
				value={vm.form.tickers}
				required
				placeholder="NEXT, NVDA"
				description="One to five, separated by commas."
			/>
			<fieldset class="space-y-2">
				<legend class="text-sm font-medium">Key points</legend>
				<p class="text-xs text-muted-foreground">One to three one-line takeaways. They lead the article and the share card.</p>
				{#each vm.form.bullets as b, i (i)}
					<Field
						name={'bullet' + (i + 1)}
						value={b}
						placeholder="A one-line takeaway"
						maxlength={240}
						aria-label={'Key point ' + (i + 1)}
					/>
				{/each}
			</fieldset>
			<TextareaField
				name="body"
				label="Article (Markdown)"
				value={vm.form.body}
				rows={18}
				required
				class="text-sm"
				maxlength={20000}
				oninput={schedulePreview}
			/>
			<section>
				<h2 class="text-sm font-medium">Preview</h2>
				<div id="article-preview" class="prose mt-2 max-w-none rounded-lg border border-border p-4">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised by #lib/markdown.js -->
					{@html previewHTML}
				</div>
			</section>
			<Field
				name="disclosure"
				label="Disclosure"
				value={vm.form.disclosure}
				required
				placeholder="I hold a position in $NEXT."
				description={'Required. For example: "No position", "I hold shares", "I may trade within 72 hours".'}
			/>
			<Field name="cover" label="Cover image (optional)" type="file" accept="image/jpeg,image/png,image/webp" />
			{#if vm.form.coverImageID !== ''}
				<input type="hidden" name="cover_image_id" value={vm.form.coverImageID} />
				<p class="text-xs text-muted-foreground">The current cover stays unless you choose a new one.</p>
			{/if}
			<SubmitButton>{vm.submit}</SubmitButton>
		</form>
	{/if}
</div>
