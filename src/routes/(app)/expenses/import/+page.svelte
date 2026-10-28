<script lang="ts">
	// Port of pages/expenses/import.templ ImportPage. Go rendered this GET as a
	// bare fragment (no shell, no <title>); v2 renders it inside the app shell
	// with a title, which is what a link from the planner needs.
	import type { SubmitFunction } from '$app/forms';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import {
		AIConsentCard,
		FormErrorBanner,
		ListSkeleton,
		ProGateOverlay,
		SubmitButton,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import ImportReviewPanel from '#lib/features/money/import/ImportReviewPanel.svelte';
	import ImportSummaryPanel from '#lib/features/money/import/ImportSummaryPanel.svelte';
	import type { ImportPanel } from '#lib/features/money/import/vm.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	let local = $state<ImportPanel | null>(null);
	let gate = $state('');
	let pending = $state(false);

	// Without JS the actions re-render the page with `form`.
	const panel = $derived<ImportPanel | null>(local ?? (form?.panel as ImportPanel | undefined) ?? null);

	// htmx swapped #import-review with whatever the handler rendered; the
	// result replaces the local panel the same way, and #import-loading shows
	// while a request is in flight (hx-indicator).
	const submit: SubmitFunction = withSpinner(() => {
		pending = true;
		return async ({ result }) => {
			pending = false;
			if (result.type === 'success' || result.type === 'failure') {
				const next = (result.data as { panel?: ImportPanel } | undefined)?.panel;
				if (next) {
					gate = '';
					local = next;
				}
			} else if (result.type === 'redirect') {
				await goto(result.location);
			} else if (result.type === 'error') {
				const proGate = (result.error as App.Error | undefined)?.proGate;
				if (proGate) gate = proGate;
			}
		};
	});
</script>

<svelte:head><title>Import spreadsheet - Norviq</title></svelte:head>

<div class="app-page-content">
	<vigil.ModernPageHeader title="Import spreadsheet" subtitle="Bring your expenses across from Excel." />
	<section class="glass-card">
		<FormErrorBanner message="" />
		<form id="import-form" method="POST" action="?/analyze" enctype="multipart/form-data" use:enhance={submit}>
			<label class="field-label" for="file">Spreadsheet</label>
			<input
				id="file"
				name="file"
				type="file"
				class="field-input"
				accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				required
			/>
			<p class="field-hint">.xlsx only, up to 8 MB. Nothing is imported until you have checked what we found.</p>
			<SubmitButton>Analyze spreadsheet</SubmitButton>
		</form>
	</section>
	<div id="import-loading" class="skeleton-indicator" class:htmx-request={pending}>
		<ListSkeleton rows={6} />
	</div>
	<div id="import-review">
		{#if gate}
			<ProGateOverlay featureName={gate} />
		{:else if panel?.kind === 'error'}
			<FormErrorBanner message={panel.message} />
		{:else if panel?.kind === 'consent'}
			<AIConsentCard next={panel.next} dismissible={true} notNowHref="" />
		{:else if panel?.kind === 'review'}
			<ImportReviewPanel vm={panel.vm} {submit} />
		{:else if panel?.kind === 'summary'}
			<ImportSummaryPanel vm={panel.vm} />
		{/if}
	</div>
</div>
