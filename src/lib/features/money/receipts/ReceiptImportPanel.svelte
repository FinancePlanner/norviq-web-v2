<script lang="ts">
	// Port of pages/expenses/receipt_import.templ: ReceiptImportPanel (upload
	// step) + ReceiptImportReviewPanel (confirm step) + receiptBlock.
	//
	// `data` is exactly what /expenses/receipt/import's load returns, so the
	// planner can preloadData('/expenses/receipt/import') and drop this into
	// its dialog. The forms post cross-route to that page's actions; results
	// update local state (the htmx #receipt-import-review swap) rather than
	// invalidating the host page.
	//
	// Deviation: Go nested the review <form> inside the upload form's
	// #receipt-import-review (valid only because htmx swapped it in via the
	// DOM). Svelte refuses nested forms, so #receipt-import-review is the
	// upload form's next sibling, with mt-6 standing in for the form's
	// space-y-6 gap.
	import type { SubmitFunction } from '$app/forms';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import {
		AIConsentCard,
		AIConsentPage,
		Field,
		FormErrorBanner,
		ProGateOverlay,
		SubmitButton,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import { commitSummary, lineCountLabel } from './vm.js';
	import type { ReceiptImportState } from './types.js';

	const ACTION = '/expenses/receipt/import';

	let {
		data,
		page = false
	}: {
		data: { state: ReceiptImportState };
		/** Full-page navigation (not the planner dialog): consent renders as the page. */
		page?: boolean;
	} = $props();

	let override = $state<ReceiptImportState | null>(null);
	let gate = $state('');
	let scanning = $state(false);

	const current = $derived(override ?? data.state);
	const vm = $derived(current.vm);

	function handle(onStart?: () => void, onDone?: () => void): SubmitFunction {
		return withSpinner(() => {
			onStart?.();
			return async ({ result }) => {
				onDone?.();
				if (result.type === 'success' || result.type === 'failure') {
					const d = result.data as { state?: ReceiptImportState; expensesChanged?: boolean } | undefined;
					if (d?.state) {
						gate = '';
						override = d.state;
					}
					if (d?.expensesChanged) window.dispatchEvent(new CustomEvent('expenses-changed'));
				} else if (result.type === 'redirect') {
					window.dispatchEvent(new CustomEvent('expense-action-close'));
					await goto(result.location);
				} else if (result.type === 'error') {
					// Go answered 402 with the Pro gate partial; anything else
					// htmx left unswapped.
					const proGate = (result.error as App.Error | undefined)?.proGate;
					if (proGate) gate = proGate;
				}
			};
		});
	}
</script>

{#if data.state.kind === 'consent' && !override}
	{#if page}
		<AIConsentPage next={data.state.next} />
	{:else}
		<AIConsentCard next={data.state.next} dismissible={true} notNowHref="" />
	{/if}
{:else}
	<div id="receipt-import-panel">
		<h2 class="text-xl font-semibold">Scan receipts</h2>
		<p class="mt-2 text-sm text-muted-foreground">
			Up to {vm.maxImages} receipts. Itemized receipts become one expense per article. Photos are read and discarded —
			they are never stored.
		</p>
		<form
			id="receipt-import-form"
			class="mt-6 space-y-6"
			method="POST"
			action="{ACTION}?/scan"
			enctype="multipart/form-data"
			use:enhance={handle(
				() => (scanning = true),
				() => (scanning = false)
			)}
		>
			<Field
				id="receipt-import-file"
				name="file"
				label="Receipt photos"
				type="file"
				required
				wrapperClass="space-y-2"
				description="JPEG or PNG, up to 8 MB each."
				accept="image/*"
				multiple
				capture="environment"
			/>
			<div class="flex items-center gap-3">
				<SubmitButton>Read receipts</SubmitButton>
				{#if scanning}
					<span id="receipt-import-spinner" class="htmx-indicator text-sm text-muted-foreground"> Reading… </span>
				{/if}
			</div>
		</form>
		<div id="receipt-import-review" class="mt-6">
			{#if gate}
				<ProGateOverlay featureName={gate} />
			{:else if current.kind === 'consent'}
				<AIConsentCard next={current.next} dismissible={true} notNowHref="" />
			{:else}
				<FormErrorBanner message={vm.error} />
				{#if vm.errors.length > 0}
					<ul class="space-y-1 text-sm text-[var(--color-warning)]">
						{#each vm.errors as msg, i (i)}
							<li>{msg}</li>
						{/each}
					</ul>
				{/if}
				{#if vm.committed}
					<div class="rounded-lg border border-[var(--color-success)]/30 p-4">
						<p class="font-semibold text-[var(--color-success)]">Expenses added</p>
						<p class="mt-1 text-sm text-muted-foreground">{commitSummary(vm)}</p>
					</div>
				{:else if vm.receipts.length > 0}
					<form method="POST" action="{ACTION}?/commit" class="space-y-6" use:enhance={handle()}>
						<input type="hidden" name="receipt_count" value={vm.receipts.length} />
						{#each vm.receipts as entry (entry.index)}
							{@const prefix = 'r' + entry.index}
							<div class="rounded-lg border p-4 space-y-3">
								<div class="flex flex-wrap items-baseline justify-between gap-2">
									<span class="font-semibold">{entry.merchant}</span>
									<span class="text-sm text-muted-foreground">
										{entry.date} · {lineCountLabel(entry)}
									</span>
								</div>
								{#if entry.warning}
									<p class="rounded border border-[var(--color-warning)]/30 p-2 text-sm">{entry.warning}</p>
								{/if}
								<input type="hidden" name="{prefix}_line_count" value={entry.lines.length} />
								<input type="hidden" name="{prefix}_date" value={entry.date} />
								<input type="hidden" name="{prefix}_source" value={entry.source} />
								<input type="hidden" name="{prefix}_merchant" value={entry.merchant} />
								<input type="hidden" name="{prefix}_tax_id" value={entry.taxIdentifier} />
								<input type="hidden" name="{prefix}_currency" value={entry.currency} />
								<input type="hidden" name="{prefix}_total" value={entry.total} />
								<input type="hidden" name="{prefix}_vat_total" value={entry.vatTotal} />
								<div class="space-y-2">
									{#each entry.lines as line (line.index)}
										{@const lp = `${prefix}_l${line.index}`}
										<div class="flex flex-wrap items-center gap-2">
											<input type="checkbox" name="{lp}_keep" value="1" checked aria-label={'Include ' + line.title} />
											<input
												class="min-w-0 flex-1 rounded border bg-transparent px-2 py-1"
												type="text"
												name="{lp}_title"
												value={line.title}
												aria-label="Description"
											/>
											<input
												class="w-24 rounded border bg-transparent px-2 py-1 text-right"
												type="text"
												inputmode="decimal"
												name="{lp}_amount"
												value={line.amount}
												aria-label="Amount"
											/>
											<select class="rounded border bg-transparent px-2 py-1" name="{lp}_pillar" aria-label="Pillar">
												{#each vm.pillarOptions as option (option.key)}
													<option value={option.key} selected={option.key === line.pillar}>{option.label}</option>
												{/each}
											</select>
											<input type="hidden" name="{lp}_external_id" value={line.externalID} />
										</div>
									{/each}
								</div>
							</div>
						{/each}
						<SubmitButton>Add checked expenses</SubmitButton>
					</form>
				{/if}
			{/if}
		</div>
	</div>
{/if}
