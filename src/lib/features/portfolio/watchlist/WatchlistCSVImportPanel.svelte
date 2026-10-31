<script lang="ts">
	// pages/portfolio/list_modals.templ WatchlistCSVImportPanel +
	// WatchlistCSVImportPreviewPanel. The form posts the file to ?/csvPreview;
	// the "Import N symbols" button re-posts it to ?/csvCommit (formaction), and
	// the result replaces the #watchlist-csv-preview block, as the htmx swap did.
	import { enhance } from '$app/forms';
	import Field from '#lib/components/norviq/Field.svelte';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import WatchlistCSVImportFormatHint from '#lib/components/norviq/WatchlistCSVImportFormatHint.svelte';
	import { closeDialog } from '#lib/components/norviq/tui/dialog/index.js';
	import * as table from '#lib/components/norviq/tui/table/index.js';
	import { watchlistImportSummary, type WatchlistCSVImportVM } from './types.js';

	const DIALOG = 'list-action-dialog';

	let { vm: initial }: { vm: WatchlistCSVImportVM } = $props();

	// svelte-ignore state_referenced_locally
	let vm = $state(initial);
	const close = () => closeDialog(DIALOG);
</script>

<div id="list-action-panel">
	<div class="portfolio-form-header">
		<h2 id="list-action-title" class="text-xl font-semibold">Import watchlist CSV</h2>
		<NativeButton
			class="portfolio-form-close"
			data-tui-dialog-close=""
			data-tui-dialog-target={DIALOG}
			aria-label="Close"
			onclick={close}
		>
			<span aria-hidden="true">×</span>
		</NativeButton>
	</div>
	{#if initial.listName !== ''}
		<p class="mt-2 text-sm text-muted-foreground">Target theme: {initial.listName}</p>
	{/if}
	<form
		id="watchlist-csv-form"
		class="portfolio-form mt-6 space-y-6"
		method="POST"
		action="?/csvPreview"
		enctype="multipart/form-data"
		use:enhance={({ formElement }) => {
			formElement.classList.add('htmx-request');
			return async ({ result }) => {
				formElement.classList.remove('htmx-request');
				// Swap the preview block only; never reset the chosen file.
				if (result.type === 'success' && result.data?.csv)
					vm = result.data.csv as WatchlistCSVImportVM;
			};
		}}
	>
		<input type="hidden" name="list_id" value={initial.listID} />
		<WatchlistCSVImportFormatHint />
		<Field
			id="watchlist-csv-file"
			name="file"
			label="CSV file"
			type="file"
			required
			wrapperClass="space-y-2"
			accept=".csv,text/csv"
		/>
		<div id="watchlist-csv-preview">
			{#if vm.error !== ''}
				<FormErrorBanner message={vm.error} />
			{/if}
			{#if vm.errors.length > 0}
				<ul class="space-y-1 text-sm text-[var(--color-warning)]">
					{#each vm.errors as msg, i (i)}
						<li>{msg}</li>
					{/each}
				</ul>
			{/if}
			{#if vm.committed}
				<div class="rounded-lg border border-[var(--color-success)]/30 p-4">
					<p class="font-semibold text-[var(--color-success)]">Import complete</p>
					<p class="mt-1 text-sm text-muted-foreground">
						{watchlistImportSummary(vm.inserted, vm.updated, vm.listName)}
					</p>
				</div>
			{:else if vm.rows.length > 0}
				<div class="overflow-x-auto">
					<table.Table class="csv-preview-table w-full text-sm">
						<thead>
							<tr>
								<th class="text-left text-muted-foreground">Line</th>
								<th class="text-left">Symbol</th>
								<th class="text-left">Note</th>
								<th class="text-left">Action</th>
							</tr>
						</thead>
						<tbody>
							{#each vm.rows as row, i (i)}
								<tr>
									<td class="opacity-50">{row.line}</td>
									<td class="font-semibold">{row.symbol}</td>
									<td>{row.note}</td>
									<td>{row.action}</td>
								</tr>
							{/each}
						</tbody>
					</table.Table>
				</div>
			{/if}
			<div class="portfolio-form-actions">
				<NativeButton
					class="portfolio-form-cancel"
					data-tui-dialog-close=""
					data-tui-dialog-target={DIALOG}
					onclick={close}>Cancel</NativeButton
				>
				{#if vm.rows.length > 0 && !vm.committed}
					<NativeButton
						type="submit"
						class="btn-primary portfolio-form-save"
						form="watchlist-csv-form"
						formaction="?/csvCommit"
					>
						Import {vm.rows.length} symbols
					</NativeButton>
				{:else if !vm.committed}
					<NativeButton
						type="submit"
						class="btn-primary portfolio-form-save"
						form="watchlist-csv-form">Preview import</NativeButton
					>
				{/if}
			</div>
		</div>
	</form>
</div>
