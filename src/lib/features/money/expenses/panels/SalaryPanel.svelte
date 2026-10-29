<script lang="ts">
	// expenses.SalaryPanel (modals.templ). Posts to /expenses/salary.
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import { panelEnhance } from '../panel.js';
	import type { SalaryFormVM } from '../vm.js';
	import PanelHeader from './PanelHeader.svelte';
	import CancelButton from './CancelButton.svelte';

	let { vm: initial }: { vm: SalaryFormVM } = $props();
	let vm = $state(untrack(() => initial));
</script>

<div id="expense-action-panel" class="vigil-modal-body">
	<PanelHeader title="Salary & pillar targets" />
	{#if vm.error}
		<p class="mt-4 text-sm text-danger" role="alert">{vm.error}</p>
	{/if}
	{#key vm}
		<form
			class="portfolio-form mt-6 space-y-6"
			method="POST"
			action="/expenses/salary"
			use:enhance={panelEnhance<SalaryFormVM>((next) => (vm = next), (_, msg) => (vm = { ...vm, error: msg || 'Could not save salary and targets.' }))}
		>
			<input type="hidden" name="month" value={vm.monthQuery} />
			{#if vm.snapshotID}
				<input type="hidden" name="snapshot_id" value={vm.snapshotID} />
			{/if}
			<Field id="net-salary" name="net_salary" label="Monthly net salary" type="number" value={vm.salary} required wrapperClass="space-y-2" min="0" step="0.01" />
			<section class="space-y-4">
				<p class="field-label">Pillar split (%)</p>
				{#each vm.shares as share (share.key)}
					<div class="budget-pillar-field rounded-lg border border-black/5 p-4 dark:border-white/10">
						<p class="font-semibold">{share.label}</p>
						<p class="text-xs text-muted-foreground">{share.hint}</p>
						<Field
							name={'share_' + share.key}
							type="number"
							value={share.value}
							class="mt-3"
							min="0"
							max="100"
							step="1"
							aria-label={share.label + ' share percent'}
						/>
					</div>
				{/each}
			</section>
			<div class="portfolio-form-actions">
				<CancelButton />
				<SubmitButton class="portfolio-form-save">Save budget</SubmitButton>
			</div>
		</form>
	{/key}
</div>
