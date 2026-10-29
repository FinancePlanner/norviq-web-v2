<script lang="ts">
	// pages/portfolio/targets.templ TargetFormModal. Go swapped this fragment into
	// #target-action-panel (GET /portfolio/targets/add, /{id}/edit); here the page
	// renders it from row data. Posts to ?/create or ?/update.
	import { enhance } from '$app/forms';
	import { NativeButton, SelectField, SubmitButton, TextareaField, VaultTextField, withSpinner } from '#lib/components/norviq/index.js';
	import type { TargetFormVM } from './targets.js';

	let { vm, onclose }: { vm: TargetFormVM; onclose: () => void } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
	onclick={(e) => {
		// Alpine @click.outside on the card.
		if (e.target === e.currentTarget) onclose();
	}}
>
	<div class="glass-card w-full max-w-md p-6 relative">
		<NativeButton class="absolute top-4 right-4 opacity-50 hover:opacity-100" onclick={onclose}>✕</NativeButton>
		<h2 class="text-xl font-bold mb-4">
			{#if vm.isEdit}
				Edit Target for {vm.symbol}
			{:else}
				Add Target
			{/if}
		</h2>

		{#if vm.error}
			<div class="bg-[var(--color-danger)]/20 text-[var(--color-danger)] p-3 rounded-xl mb-4 text-sm">
				{vm.error}
			</div>
		{/if}

		<form class="space-y-4" method="post" action={vm.isEdit ? '?/update' : '?/create'} use:enhance={withSpinner(() => async ({ result, update }) => {
				// HX-Redirect /portfolio/targets: the panel goes with the page.
				if (result.type === 'redirect') onclose();
				await update();
			})}
		>
			{#if vm.isEdit}
				<input type="hidden" name="id" value={vm.id} />
				<input type="hidden" name="symbol" value={vm.symbol} />
			{:else}
				<VaultTextField label="Symbol" name="symbol" inputType="text" placeholder="AAPL" value={vm.symbol} required />
			{/if}

			<div class="space-y-2">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="field-label">Scenario</label>
				<SelectField
					name="scenario"
					options={[
						{ value: 'Base', label: 'Base', selected: vm.scenario === 'Base' },
						{ value: 'Bull', label: 'Bull', selected: vm.scenario === 'Bull' },
						{ value: 'Bear', label: 'Bear', selected: vm.scenario === 'Bear' }
					]}
				/>
			</div>

			<VaultTextField label="Target Price" name="targetPrice" inputType="number" placeholder="150.00" value={vm.targetPrice} required />

			<div class="grid grid-cols-2 gap-4">
				<VaultTextField label="Low Price" name="lowPrice" inputType="number" placeholder="100.00" value={vm.lowPrice} required />
				<VaultTextField label="High Price" name="highPrice" inputType="number" placeholder="200.00" value={vm.highPrice} required />
			</div>

			<div class="space-y-2">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="field-label">Rationale</label>
				<TextareaField name="rationale" value={vm.rationale} rows={3} />
			</div>

			<div class="flex justify-end gap-3 mt-6">
				<NativeButton class="portfolio-form-cancel" onclick={onclose}>Cancel</NativeButton>
				<SubmitButton class="portfolio-form-save">Save Target</SubmitButton>
			</div>
		</form>
	</div>
</div>
