<script lang="ts">
	// stock.ValuationEditForm / ValuationFormError — whatever the last
	// valuation request answered (hx-target #valuation-edit-panel).
	import {
		Field,
		NativeButton,
		SecondaryButton,
		SubmitButton,
		TextareaField
	} from '#lib/components/norviq/index.js';
	import { closeDialog } from '#lib/components/norviq/tui/dialog/index.js';
	import { goto } from '$app/navigation';
	import { submitValuation } from '../panels.svelte.js';
	import type { ValuationResult } from '../detail.js';

	let { result }: { result: ValuationResult | null } = $props();
	const close = () => closeDialog('valuation-action-dialog');

	async function onsubmit(e: SubmitEvent, symbol: string) {
		e.preventDefault();
		const res = await submitValuation(e.currentTarget as HTMLFormElement, symbol);
		// HX-Redirect was a full navigation.
		if (res && 'redirect' in res) await goto(res.redirect, { invalidateAll: true });
	}
</script>

{#snippet rangeFields(
	label: string,
	lowName: string,
	highName: string,
	lowVal: string,
	highVal: string
)}
	<fieldset class="space-y-2">
		<legend class="field-label">{label}</legend>
		<div class="grid grid-cols-2 gap-3">
			<Field
				name={lowName}
				type="number"
				value={lowVal}
				placeholder="Low"
				required
				step="0.01"
				min="0"
				aria-label={label + ' low'}
			/>
			<Field
				name={highName}
				type="number"
				value={highVal}
				placeholder="High"
				required
				step="0.01"
				min="0"
				aria-label={label + ' high'}
			/>
		</div>
	</fieldset>
{/snippet}

{#if result && 'panel' in result && result.panel === 'form'}
	{@const vm = result.vm}
	<div id="valuation-edit-panel" class="portfolio-modal-panel glass-card p-6 md:p-8">
		<h2 class="text-lg font-semibold">Edit valuation - {vm.symbol}</h2>
		<p class="mt-2 text-sm text-muted-foreground">
			Set bear, base, and bull price ranges for your thesis.
		</p>
		<form
			class="mt-6 space-y-4"
			method="POST"
			action={'/portfolio/' + vm.symbol + '/valuation'}
			onsubmit={(e) => onsubmit(e, vm.symbol)}
		>
			<div class="grid gap-4 sm:grid-cols-2">
				{@render rangeFields('Bear case', 'bear_low', 'bear_high', vm.bearLow, vm.bearHigh)}
				{@render rangeFields('Base case', 'base_low', 'base_high', vm.baseLow, vm.baseHigh)}
				{@render rangeFields('Bull case', 'bull_low', 'bull_high', vm.bullLow, vm.bullHigh)}
			</div>
			<Field
				id="valuation-target-date"
				name="target_date"
				label="Target date"
				type="date"
				value={vm.targetDate}
				wrapperClass="space-y-2"
			/>
			<TextareaField
				id="valuation-rationale"
				name="rationale"
				label="Rationale"
				value={vm.rationale}
				rows={4}
				wrapperClass="space-y-2"
			/>
			<div class="portfolio-form-actions">
				<NativeButton class="portfolio-form-cancel" onclick={close}>Cancel</NativeButton>
				<SubmitButton class="portfolio-form-save"
					>{vm.exists ? 'Save valuation' : 'Create valuation'}</SubmitButton
				>
			</div>
		</form>
	</div>
{:else if result && 'panel' in result && result.panel === 'error'}
	<div id="valuation-edit-panel" class="portfolio-modal-panel glass-card p-6 md:p-8">
		<div class="error-banner" role="alert">{result.message}</div>
		<SecondaryButton class="mt-4 px-5" onclick={close}>Close</SecondaryButton>
	</div>
{:else}
	<div id="valuation-edit-panel"></div>
{/if}
