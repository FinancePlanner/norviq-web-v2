<script lang="ts">
	import { enhance } from '$app/forms';
	import { EmptyState, FormErrorBanner, SelectField, SubmitButton, ToastBanner, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// ExportFeedback: an action error replaces the block; otherwise the load's messages show.
	const successMessage = $derived(form ? '' : data.successMessage);
	const errorMessage = $derived(form?.errorMessage ?? data.errorMessage);

	const typeOptions = [
		{ value: 'portfolio', label: 'Portfolio holdings' },
		{ value: 'transactions', label: 'Transactions' },
		{ value: 'watchlist', label: 'Watchlist' },
		{ value: 'insights', label: 'Insights' },
		{ value: 'all', label: 'Everything' }
	];
	const formatOptions = [
		{ value: 'csv', label: 'CSV' },
		{ value: 'json', label: 'JSON' }
	];
</script>

<svelte:head>
	<title>Data export - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-export settings-modern-page">
	<vigil.SettingsShell backHref="/settings" backLabel="← Settings" title="Data export" subtitle="Download a copy of your portfolio, transactions, or watchlist.">
		<div id="export-feedback">
			<ToastBanner message={successMessage} />
			<FormErrorBanner message={errorMessage} />
		</div>
		<form class="glass-card mt-6 space-y-4 p-6" method="POST" use:enhance={withSpinner()}>
			<h2 class="font-semibold">New export</h2>
			<div class="space-y-2">
				<label class="field-label" for="export-type">Data type</label>
				<SelectField id="export-type" name="type" options={typeOptions} />
			</div>
			<div class="space-y-2">
				<label class="field-label" for="export-format">Format</label>
				<SelectField id="export-format" name="format" options={formatOptions} />
			</div>
			<SubmitButton class="w-auto px-6">Request export</SubmitButton>
		</form>
		<div class="mt-6 space-y-3">
			<h2 class="font-semibold">Recent exports</h2>
			{#if data.exports.length === 0}
				<EmptyState title="No exports yet" description="Request an export above. Files stay available for a limited time." />
			{/if}
			{#each data.exports as row (row.id)}
				<article class="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
					<div>
						<p class="font-medium capitalize">{row.type} · {row.format}</p>
						<p class="text-xs text-muted-foreground">Created {row.createdAt}</p>
						{#if row.expiresAt !== ''}
							<p class="text-xs text-muted-foreground">Expires {row.expiresAt}</p>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<span class="settings-status-pill capitalize">{row.status}</span>
						{#if row.canDownload}
							<a href="/settings/export/{row.id}/download" class="btn-secondary px-4 py-2 text-sm" data-sveltekit-reload>Download</a>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	</vigil.SettingsShell>
</div>
