<script lang="ts">
	// pages/portfolio/screenshot_import.templ ScreenshotImportPanel — the upload
	// step. Preview (?/preview) and commit (?/commit) both post this form; the
	// result replaces #portfolio-screenshot-preview like the htmx swap did.
	import { enhance } from '$app/forms';
	import { AIConsentCard, Field, NativeButton, SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import { closeDialog } from '#lib/components/norviq/tui/dialog/index.js';
	import ScreenshotImportPreviewPanel from './ScreenshotImportPreviewPanel.svelte';
	import type { ScreenshotImportVM } from './screenshot.js';

	let { vm, preview, consentNext = '' }: { vm: ScreenshotImportVM; preview: ScreenshotImportVM; consentNext?: string } = $props();

	// hx-indicator="#portfolio-screenshot-spinner" (htmx's injected opacity rule).
	let reading = $state(false);
</script>

<div id="list-action-panel">
	<div class="portfolio-form-header">
		<h2 id="list-action-title" class="text-xl font-semibold">Import from screenshots</h2>
		<NativeButton
			class="portfolio-form-close"
			data-tui-dialog-close=""
			data-tui-dialog-target="list-action-dialog"
			aria-label="Close"
			onclick={() => closeDialog('list-action-dialog')}
		>
			<span aria-hidden="true">×</span>
		</NativeButton>
	</div>
	<p class="mt-2 text-sm text-muted-foreground">
		Upload up to {vm.maxImages} screenshots of your broker's holdings or trade history. Everything read from them is shown for
		you to check before anything is saved.
	</p>
	<form
		id="portfolio-screenshot-form"
		class="portfolio-form mt-6 space-y-6"
		method="post"
		action="?/preview"
		enctype="multipart/form-data"
		use:enhance={withSpinner(({ action, formData }) => {
			const committing = action.search.includes('/commit');
			// The commit sends the reviewed rows as JSON, never the images again.
			if (committing) formData.delete('file');
			else reading = true;
			return async ({ result, update }) => {
				reading = false;
				await update({ reset: false, invalidateAll: false });
				if (committing && result.type === 'success' && result.data?.screenshot?.committed) {
					// HX-Trigger: portfolio-import-completed
					window.dispatchEvent(new CustomEvent('portfolio-import-completed'));
				}
			};
		})}
	>
		<input type="hidden" name="provider" value={vm.provider} />
		<input type="hidden" name="portfolio_list_id" value={vm.portfolioListID} />
		<Field
			id="portfolio-screenshot-file"
			name="file"
			label="Screenshots"
			type="file"
			required
			wrapperClass="space-y-2"
			description="PNG or JPEG, up to 8 MB each. Images are read and discarded — they are never stored."
			accept="image/*"
			multiple
		/>
		<div class="flex items-center gap-3">
			<SubmitButton class="portfolio-form-save">Read screenshots</SubmitButton>
			<span
				id="portfolio-screenshot-spinner"
				class={['htmx-indicator text-sm text-muted-foreground', reading && 'htmx-request']}
				style:opacity={reading ? 1 : 0}
				style:transition="opacity 200ms ease-in"
			>
				Reading…
			</span>
		</div>
		<div id="portfolio-screenshot-preview">
			{#if consentNext}
				<AIConsentCard next={consentNext} dismissible notNowHref="" />
			{:else}
				<ScreenshotImportPreviewPanel vm={preview} />
			{/if}
		</div>
	</form>
</div>
