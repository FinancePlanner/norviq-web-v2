<script lang="ts">
	// expenses.CategoryPanel (modals.templ). Posts to /expenses/category.
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import { panelEnhance } from '../panel.js';
	import { pillarOptionsWithAll, type CategoryFormVM } from '../vm.js';
	import PanelHeader from './PanelHeader.svelte';
	import CancelButton from './CancelButton.svelte';

	let { vm: initial }: { vm: CategoryFormVM } = $props();
	let vm = $state(untrack(() => initial));
</script>

<div id="expense-action-panel" class="vigil-modal-body">
	<PanelHeader title="Add category" />
	{#if vm.error}
		<p class="mt-4 text-sm text-danger" role="alert">{vm.error}</p>
	{/if}
	{#key vm}
		<form
			class="portfolio-form mt-6 space-y-6"
			method="POST"
			action="/expenses/category"
			use:enhance={panelEnhance<CategoryFormVM>(
				(next) => (vm = next),
				(_, msg) => (vm = { ...vm, error: msg || 'Could not save category.' })
			)}
		>
			<input type="hidden" name="month" value={vm.monthQuery} />
			<Field
				id="category-name"
				name="name"
				label="Name"
				value={vm.name}
				required
				wrapperClass="space-y-2"
			/>
			<SelectField
				id="category-pillar"
				name="pillar"
				label="Pillar (optional)"
				wrapperClass="space-y-2"
				options={pillarOptionsWithAll(vm.pillar)}
			/>
			<div class="portfolio-form-actions">
				<CancelButton />
				<SubmitButton class="portfolio-form-save">Save category</SubmitButton>
			</div>
		</form>
	{/key}
</div>
