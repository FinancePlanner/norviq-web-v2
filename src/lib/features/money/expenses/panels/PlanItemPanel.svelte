<script lang="ts">
	// expenses.PlanItemPanel (modals.templ). Create posts to /expenses/plan-item,
	// edit to /expenses/plan-item/{id} (Go: hx-put), delete to its ?/delete
	// action (Go: hx-delete + hx-confirm).
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import { panelEnhance } from '../panel.js';
	import { pillarOptions, splitModeOptions, type PlanItemFormVM } from '../vm.js';
	import PanelHeader from './PanelHeader.svelte';
	import CancelButton from './CancelButton.svelte';

	let { vm: initial }: { vm: PlanItemFormVM } = $props();
	let vm = $state(untrack(() => initial));
	let failure = $state('');

	const action = $derived(
		vm.isEdit ? `/expenses/plan-item/${vm.itemID}?/update` : '/expenses/plan-item'
	);
	const deleteAction = $derived(
		`/expenses/plan-item/${vm.itemID}?/delete&month=${encodeURIComponent(vm.monthQuery)}`
	);
</script>

<div id="expense-action-panel" class="vigil-modal-body">
	<PanelHeader title={vm.isEdit ? 'Edit plan item' : 'Add plan item'} />
	{#if vm.error || failure}
		<p class="mt-4 text-sm text-danger" role="alert">{vm.error || failure}</p>
	{/if}
	{#key vm}
		<form
			class="portfolio-form mt-6 space-y-6"
			method="POST"
			{action}
			use:enhance={panelEnhance<PlanItemFormVM>(
				(next) => (vm = next),
				(_, msg) => (failure = msg || 'Could not save plan item.')
			)}
		>
			<input type="hidden" name="month" value={vm.monthQuery} />
			{#if vm.snapshotID}
				<input type="hidden" name="snapshot_id" value={vm.snapshotID} />
			{/if}
			<Field
				id="plan-item-title"
				name="title"
				label="Title"
				value={vm.title}
				required
				wrapperClass="space-y-2"
			/>
			<Field
				id="plan-item-amount"
				name="planned_amount"
				label="Planned amount"
				type="number"
				value={vm.plannedAmount}
				required
				wrapperClass="space-y-2"
				min="0"
				step="0.01"
			/>
			<SelectField
				id="plan-item-pillar"
				name="pillar"
				label="Pillar"
				required
				wrapperClass="space-y-2"
				options={pillarOptions(vm.pillar)}
			/>
			{#if vm.hasPartner}
				<SelectField
					id="plan-item-split"
					name="split_mode"
					label="Split"
					wrapperClass="space-y-2"
					options={splitModeOptions(vm.splitMode)}
				/>
				<Field
					id="plan-item-share"
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
							if (!confirm('Delete this plan item?')) e.preventDefault();
						}}>Delete</NativeButton
					>
				{/if}
				<CancelButton />
				<SubmitButton class="portfolio-form-save">Save item</SubmitButton>
			</div>
		</form>
	{/key}
</div>
