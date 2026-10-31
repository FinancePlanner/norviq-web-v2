<script lang="ts">
	// crypto.CryptoHoldingPanel(vm) — internal/pages/crypto/modals.templ. Go loaded
	// it into #crypto-action-panel with hx-get and posted it with hx-post /
	// hx-put (target the panel, outerHTML); success sent HX-Redirect to
	// /crypto/portfolio. Here it is the /crypto/portfolio/holding[/{id}] route's
	// component: the forms post to that route's actions, a failure re-renders
	// the panel from the returned vm, a redirect closes the dialog and reloads.
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import {
		Field,
		NativeButton,
		SelectField,
		SubmitButton,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import type { Option } from '#lib/components/norviq/types.js';
	import type { HoldingFormVM } from './types.js';

	let { vm, onclose }: { vm: HoldingFormVM; onclose?: () => void } = $props();

	let current = $state<HoldingFormVM | null>(null);
	const panel = $derived(current ?? vm);

	/** cryptoAssetOptions: a blank choice only when adding. */
	const assetOptions = $derived.by((): Option[] => {
		const opts: Option[] = panel.isEdit ? [] : [{ value: '', label: 'Select asset' }];
		for (const asset of panel.assets) {
			opts.push({
				value: asset.symbol,
				label: asset.symbol + ' - ' + asset.name,
				selected: panel.symbol === asset.symbol
			});
		}
		return opts;
	});

	const base = $derived(
		panel.isEdit ? `/crypto/portfolio/holding/${panel.itemID}` : '/crypto/portfolio/holding'
	);
	const action = $derived(panel.isEdit ? `${base}?/update` : base);

	const close = () => onclose?.();

	async function afterRedirect(location: string) {
		close();
		await goto(location, { invalidateAll: true });
	}
</script>

<div id="crypto-action-panel">
	<div class="portfolio-form-header">
		{#if panel.isEdit}
			<h2 id="crypto-action-title" class="text-xl font-semibold">Edit holding</h2>
		{:else}
			<h2 id="crypto-action-title" class="text-xl font-semibold">Add holding</h2>
		{/if}
		<NativeButton class="portfolio-form-close" aria-label="Close" onclick={close}>
			<span aria-hidden="true">×</span>
		</NativeButton>
	</div>
	{#if panel.error}
		<p class="mt-4 text-sm text-danger" role="alert">{panel.error}</p>
	{/if}
	<form
		class="portfolio-form mt-6 space-y-6"
		method="post"
		{action}
		use:enhance={withSpinner(() => async ({ result }) => {
			if (result.type === 'redirect') await afterRedirect(result.location);
			else if (result.type === 'failure') {
				const next = (result.data as { vm?: HoldingFormVM } | undefined)?.vm;
				if (next) current = next;
			}
		})}
	>
		{#if panel.assets.length > 0}
			<div class="space-y-2">
				<label class="field-label" for="crypto-symbol">Asset</label>
				<SelectField id="crypto-symbol" name="symbol" required options={assetOptions} />
			</div>
		{:else}
			<Field
				id="crypto-symbol"
				name="symbol"
				label="Symbol"
				value={panel.symbol}
				required
				wrapperClass="space-y-2"
			/>
		{/if}
		<Field
			id="crypto-name"
			name="name"
			label="Name"
			value={panel.name}
			placeholder="Optional if asset is selected"
			wrapperClass="space-y-2"
		/>
		<Field
			id="crypto-quantity"
			name="quantity"
			label="Quantity"
			type="number"
			value={panel.quantity}
			required
			wrapperClass="space-y-2"
			min="0.00000001"
			step="any"
		/>
		<Field
			id="crypto-avg-cost"
			name="average_buy_price"
			label="Average buy price"
			type="number"
			value={panel.avgCost}
			required
			wrapperClass="space-y-2"
			min="0.01"
			step="any"
		/>
		<div class="portfolio-form-actions">
			{#if panel.isEdit}
				<NativeButton
					type="submit"
					form="crypto-holding-delete"
					class="portfolio-form-cancel text-[var(--color-danger)]"
					onclick={(e) => {
						// hx-confirm="Remove this holding?"
						if (!confirm('Remove this holding?')) e.preventDefault();
					}}>Remove</NativeButton
				>
			{/if}
			<NativeButton class="portfolio-form-cancel" onclick={close}>Cancel</NativeButton>
			<SubmitButton class="portfolio-form-save">Save holding</SubmitButton>
		</div>
	</form>
	{#if panel.isEdit}
		<!-- Go: hx-delete on the Remove button, which also closed the dialog. -->
		<form
			id="crypto-holding-delete"
			method="post"
			action="{base}?/delete"
			hidden
			use:enhance={() => {
				close();
				return async ({ result }) => {
					if (result.type === 'redirect') await afterRedirect(result.location);
				};
			}}
		></form>
	{/if}
</div>
