<script lang="ts">
	// expenses.RecordExpensePanel (modals.templ). Posts to /expenses/record.
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import SecondaryButton from '#lib/components/norviq/SecondaryButton.svelte';
	import NativeInput from '#lib/components/norviq/NativeInput.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import { ReceiptScan } from '../../receipt-scan.svelte.js';
	import { panelEnhance } from '../panel.js';
	import {
		categoryOptions,
		pillarOptions,
		splitModeOptions,
		type RecordExpenseFormVM
	} from '../vm.js';
	import PanelHeader from './PanelHeader.svelte';
	import CancelButton from './CancelButton.svelte';

	let { vm: initial }: { vm: RecordExpenseFormVM } = $props();
	let vm = $state(untrack(() => initial));
	let gateError = $state('');

	const scan = new ReceiptScan();
	$effect(() => () => scan.stop());
</script>

<div id="expense-action-panel" class="vigil-modal-body">
	<PanelHeader title="Record spend" />
	{#if vm.error || gateError}
		<p class="mt-4 text-sm text-danger" role="alert">{vm.error || gateError}</p>
	{/if}
	<div class="mt-4">
		<SecondaryButton fullWidth onclick={() => scan.start()}>Scan receipt QR</SecondaryButton>
		<NativeInput
			type="file"
			class="hidden"
			accept="image/*"
			capture="environment"
			bind:ref={scan.photoInput}
			onchange={(e: Event) => scan.submitPhoto(e)}
		/>
		<SecondaryButton class="mt-2" fullWidth onclick={() => scan.photoInput?.click()}
			>Scan receipt photo</SecondaryButton
		>
		{#if scan.open}
			<div class="mt-3">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video bind:this={scan.video} class="w-full rounded-lg bg-black" playsinline muted></video>
				{#if scan.error}<p class="mt-2 text-sm text-danger">{scan.error}</p>{/if}
				<SecondaryButton class="mt-2" fullWidth onclick={() => scan.stop()}
					>Cancel scan</SecondaryButton
				>
			</div>
		{/if}
	</div>
	{#key vm}
		<form
			class="portfolio-form mt-6 space-y-6"
			method="POST"
			action="/expenses/record"
			use:enhance={panelEnhance<RecordExpenseFormVM>(
				(next) => (vm = next),
				(_, msg) => (gateError = msg || 'Could not save expense. Try again.')
			)}
		>
			<input type="hidden" name="month" value={vm.monthQuery} />
			<Field
				id="expense-title"
				name="title"
				label="Title"
				value={vm.title}
				required
				wrapperClass="space-y-2"
			/>
			<Field
				id="expense-amount"
				name="amount"
				label="Amount"
				type="number"
				value={vm.amount}
				required
				wrapperClass="space-y-2"
				min="0.01"
				step="0.01"
			/>
			<SelectField
				id="expense-pillar"
				name="pillar"
				label="Pillar"
				required
				wrapperClass="space-y-2"
				options={pillarOptions(vm.pillar)}
			/>
			{#if vm.categories.length > 0}
				<SelectField
					id="expense-category"
					name="category_id"
					label="Category (optional)"
					wrapperClass="space-y-2"
					options={categoryOptions(vm.categories, vm.selectedCategory)}
				/>
			{/if}
			<Field
				id="expense-date"
				name="occurred_on"
				label="Date"
				type="date"
				wrapperClass="space-y-2"
			/>
			<!-- Receipt provenance, filled by ReceiptScan when a scan succeeds. -->
			<input type="hidden" id="receipt-source" name="receipt_source" value="" />
			<input type="hidden" id="receipt-merchant" name="receipt_merchant" value="" />
			<input type="hidden" id="receipt-tax-id" name="receipt_tax_id" value="" />
			<input type="hidden" id="receipt-currency" name="receipt_currency" value="" />
			<input type="hidden" id="receipt-total" name="receipt_total" value="" />
			<input type="hidden" id="receipt-vat-total" name="receipt_vat_total" value="" />
			<input type="hidden" id="receipt-issued-on" name="receipt_issued_on" value="" />
			{#if vm.hasPartner}
				<SelectField
					id="expense-split"
					name="split_mode"
					label="Split"
					wrapperClass="space-y-2"
					options={splitModeOptions(vm.splitMode)}
				/>
				<Field
					id="expense-share"
					name="user_share_percent"
					label="Your share (%)"
					type="number"
					value={vm.userSharePercent}
					wrapperClass="space-y-2"
					min="0"
					max="100"
					step="1"
				/>
			{/if}
			<div class="portfolio-form-actions">
				<CancelButton />
				<SubmitButton class="portfolio-form-save">Save expense</SubmitButton>
			</div>
		</form>
	{/key}
</div>
