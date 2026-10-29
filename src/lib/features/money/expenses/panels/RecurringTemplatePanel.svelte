<script lang="ts">
	// expenses.RecurringTemplatePanel (modals.templ). Create posts to
	// /expenses/recurring, edit to /expenses/recurring/{id} (Go: hx-put), delete
	// to its ?/delete action (Go: hx-delete + hx-confirm).
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import { panelEnhance } from '../panel.js';
	import { categoryOptions, frequencyOptions, pillarOptions, splitModeOptions, type RecurringTemplateFormVM } from '../vm.js';
	import PanelHeader from './PanelHeader.svelte';
	import CancelButton from './CancelButton.svelte';

	let { vm: initial }: { vm: RecurringTemplateFormVM } = $props();
	let vm = $state(untrack(() => initial));
	let failure = $state('');

	const action = $derived(vm.isEdit ? `/expenses/recurring/${vm.templateID}?/update` : '/expenses/recurring');
	const deleteAction = $derived(`/expenses/recurring/${vm.templateID}?/delete&month=${encodeURIComponent(vm.monthQuery)}`);
</script>

<div id="expense-action-panel" class="vigil-modal-body">
	<PanelHeader title={vm.isEdit ? 'Edit recurring expense' : 'Add recurring expense'} />
	{#if vm.error || failure}
		<p class="mt-4 text-sm text-danger" role="alert">{vm.error || failure}</p>
	{/if}
	{#key vm}
		<form
			class="portfolio-form mt-6 space-y-6"
			method="POST"
			{action}
			use:enhance={panelEnhance<RecurringTemplateFormVM>((next) => (vm = next), (_, msg) => (failure = msg || 'Could not save recurring template.'))}
		>
			<input type="hidden" name="month" value={vm.monthQuery} />
			<Field id="recurring-title" name="title" label="Title" value={vm.title} required wrapperClass="space-y-2" />
			<Field id="recurring-amount" name="amount" label="Amount" type="number" value={vm.amount} required wrapperClass="space-y-2" min="0.01" step="0.01" />
			<SelectField id="recurring-pillar" name="pillar" label="Pillar" required wrapperClass="space-y-2" options={pillarOptions(vm.pillar)} />
			<SelectField id="recurring-frequency" name="frequency" label="Frequency" required wrapperClass="space-y-2" options={frequencyOptions(vm.frequency)} />
			{#if vm.categories.length > 0}
				<SelectField
					id="recurring-category"
					name="category_id"
					label="Category (optional)"
					wrapperClass="space-y-2"
					options={categoryOptions(vm.categories, vm.categoryID)}
				/>
			{/if}
			{#if vm.hasPartner}
				<SelectField id="recurring-split" name="split_mode" label="Split" wrapperClass="space-y-2" options={splitModeOptions(vm.splitMode)} />
				<Field
					id="recurring-share"
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
				{#if vm.isEdit}
					<NativeButton
						type="submit"
						class="portfolio-form-cancel text-[var(--color-danger)]"
						formaction={deleteAction}
						formnovalidate
						data-nq-submit={undefined}
						onclick={(e: MouseEvent) => {
							if (!confirm('Delete this recurring template?')) e.preventDefault();
						}}>Delete</NativeButton
					>
				{/if}
				<CancelButton />
				<SubmitButton class="portfolio-form-save">Save template</SubmitButton>
			</div>
		</form>
	{/key}
</div>
