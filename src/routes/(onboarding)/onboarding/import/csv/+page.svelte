<script lang="ts">
	// onboarding.CSVPage + CSVPreviewPanel. The form posts to ?/preview and the
	// panel's import button re-submits it to ?/commit (form + formaction), so the
	// file selected above is sent again. The form is never reset.
	import { enhance } from '$app/forms';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import CSVImportFormatHint from '#lib/components/norviq/CSVImportFormatHint.svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import * as table from '#lib/components/norviq/tui/table/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const options = $derived(
		data.providers.map((p) => ({ value: p, label: p, selected: p === data.provider }))
	);
	const vm = $derived(form?.preview ?? null);
	// Symbols the commit would replace although this import did not create them.
	const conflicts = $derived(
		vm ? vm.rows.filter((r) => r.foreignHolding).map((r) => r.symbol) : []
	);
	// After a 409 re-preview no row is flagged foreign (the backend also flags
	// rows this import account does not own), so fall back to the rows that
	// replace an existing holding and keep the toggle whenever a confirm is due.
	const replaceSymbols = $derived(
		conflicts.length > 0
			? conflicts
			: vm
				? vm.rows.filter((r) => r.replacesExisting).map((r) => r.symbol)
				: []
	);
	const replaceCopy = $derived(
		`Replace positions you already hold in ${replaceSymbols.join(', ')}. Without this, the import stops rather than leaving two rows for the same symbol.`
	);
	const showMergeToggle = $derived(conflicts.length > 0 || (vm?.needsMergeConfirm ?? false));
	const importSummary = (inserted: number, updated: number) =>
		inserted === 0 && updated === 0
			? 'No positions were changed.'
			: 'Added or updated your portfolio.';
	const submit = withSpinner(
		() =>
			async ({ update }) =>
				update({ reset: false })
	);
</script>

<svelte:head><title>CSV import - Norviq</title></svelte:head>

<div class="onboarding-page onboarding-modern-page">
	<a href="/onboarding/import" class="onboarding-back">← Back</a>
	<h1 class="onboarding-title">CSV import</h1>
	<p class="onboarding-lead mt-2">Upload a broker export. We'll preview rows before importing.</p>
	<div class="mt-6">
		<CSVImportFormatHint />
	</div>
	<form
		id="csv-form"
		method="POST"
		action="?/preview"
		class="onboarding-step-card glass-card mt-8 p-6 md:p-8"
		enctype="multipart/form-data"
		use:enhance={submit}
	>
		<input type="hidden" name="portfolio_list_id" value={data.portfolioListId} />
		<SelectField
			id="provider"
			name="provider"
			label="Broker format"
			required
			wrapperClass="space-y-2"
			{options}
		/>
		<Field
			id="file"
			name="file"
			label="CSV file"
			type="file"
			required
			class="mt-2"
			wrapperClass="mt-6"
			accept=".csv,text/csv"
		/>
		<SubmitButton class="mt-6 w-auto px-6">Preview import</SubmitButton>
	</form>
	<div id="csv-preview" class="mt-6">
		{#if vm}
			<div class="csv-preview onboarding-step-card glass-card p-6">
				{#if vm.error}
					<FormErrorBanner message={vm.error} />
				{/if}
				{#if vm.committed}
					<p class="font-semibold text-[var(--color-success)]">Import complete</p>
					<p class="mt-2 text-sm text-muted-foreground">{importSummary(vm.inserted, vm.updated)}</p>
					{#if vm.errors.length > 0}
						<p class="mt-4 text-sm font-semibold text-[var(--color-warning)]">
							Some rows were skipped:
						</p>
						<ul class="mt-1 space-y-1 text-sm text-[var(--color-warning)]">
							{#each vm.errors as msg, i (i)}
								<li>{msg}</li>
							{/each}
						</ul>
					{/if}
				{:else if !vm.error || vm.rows.length > 0}
					{#if vm.errors.length > 0}
						<ul class="mt-2 space-y-1 text-sm text-[var(--color-warning)]">
							{#each vm.errors as msg, i (i)}
								<li>{msg}</li>
							{/each}
						</ul>
					{/if}
					{#if vm.rows.length === 0}
						<p class="text-sm text-muted-foreground">No rows found in this file.</p>
					{:else}
						<div class="csv-preview-table-wrap mt-4 overflow-x-auto">
							<table.Table class="csv-preview-table w-full text-sm">
								<thead>
									<tr>
										<th class="text-left text-muted-foreground">Line</th>
										<th class="text-left">Symbol</th>
										<th class="text-right">Shares</th>
										<th class="text-right">Price</th>
									</tr>
								</thead>
								<tbody>
									{#each vm.rows as row, i (i)}
										<tr>
											<td class="opacity-50">{row.line}</td>
											<td class="font-semibold">
												{row.symbol}
												{#if row.replacesExisting}
													<span class="block text-xs font-normal text-muted-foreground"
														>Replaces your existing {row.symbol}</span
													>
												{/if}
											</td>
											<td class="text-right">{row.shares}</td>
											<td class="text-right">{row.buyPrice}</td>
										</tr>
									{/each}
								</tbody>
							</table.Table>
						</div>
						{#if showMergeToggle}
							<label
								class="mt-4 flex items-start gap-2 rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 p-3 text-sm"
							>
								<input
									type="checkbox"
									name="confirm_merge_existing"
									value="1"
									form="csv-form"
									class="mt-0.5"
									checked={vm.needsMergeConfirm}
								/>
								<span>{replaceCopy}</span>
							</label>
						{/if}
						<div class="mt-6 flex flex-wrap items-center gap-3">
							<!-- form + formaction retarget this button at the commit action. -->
							<SubmitButton class="w-auto px-6" form="csv-form" formaction="?/commit"
								>Import {vm.rows.length} positions</SubmitButton
							>
							<span class="text-xs text-muted-foreground">Uses the file selected above</span>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</div>
