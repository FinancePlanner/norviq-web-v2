<script lang="ts">
	// onboarding.ManualPage + ManualForm
	import { enhance } from '$app/forms';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import ToastBanner from '#lib/components/norviq/ToastBanner.svelte';
	import VaultTextField from '#lib/components/norviq/VaultTextField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const vm = $derived(form?.vm ?? data.vm);

	// Keyed on each submit result so the inputs take the server's values.
	let generation = $state(0);
	const submit = withSpinner(() => async ({ update }) => {
		await update({ reset: false });
		generation++;
	});

	const ready = $derived(vm.rows.filter((r) => r.symbol.trim() && r.shares.trim() && r.buyPrice.trim()).length);
	const categoryOptions = $derived([
		{ value: 'stock', label: 'Stock', selected: vm.category === 'stock' },
		{ value: 'etf', label: 'ETF', selected: vm.category === 'etf' },
		{ value: 'crypto', label: 'Crypto', selected: vm.category === 'crypto' }
	]);
</script>

<svelte:head><title>Add holdings - Norviq</title></svelte:head>

<div class="onboarding-page onboarding-modern-page">
	<a href="/onboarding/import" class="onboarding-back">← Back</a>
	<h1 class="onboarding-title">Manual entry</h1>
	<p class="onboarding-lead mt-2">Add one or more positions, then import them together.</p>
	{#if vm.added}
		<ToastBanner message="Positions imported." />
	{/if}
	<div class="onboarding-step-card glass-card mt-8 p-6 md:p-8">
		{#key generation}
			<form method="POST" action="/onboarding/import/manual" id="manual-form" use:enhance={submit}>
				<input type="hidden" name="row_count" value={String(vm.rows.length)} />
				<FormErrorBanner message={vm.error} />
				<div class="grid gap-4 md:grid-cols-2 mb-6">
					<SelectField id="category" name="category" label="Category" options={categoryOptions} />
					<VaultTextField label="Buy date (all rows)" name="buy_date" inputType="date" value={vm.buyDate} required />
				</div>
				<div class="space-y-4">
					{#each vm.rows as row, i (i)}
						<fieldset class="manual-row onboarding-field-card">
							<legend class="px-1 text-sm font-semibold text-muted-foreground">Position {i + 1}</legend>
							<div class="mt-2 grid gap-4 md:grid-cols-3">
								<VaultTextField label="Symbol" name="row_{i}_symbol" placeholder="AAPL" value={row.symbol} required />
								<VaultTextField label="Shares" name="row_{i}_shares" placeholder="10" value={row.shares} required />
								<VaultTextField
									label="Buy price"
									name="row_{i}_buy_price"
									placeholder="150.00"
									value={row.buyPrice}
									required
								/>
							</div>
						</fieldset>
					{/each}
				</div>
				<p class="mt-4 text-sm text-muted-foreground">{ready} position(s) ready</p>
				<div class="mt-6 flex flex-wrap gap-3">
					<SubmitButton class="w-auto px-6" name="action" value="continue">Import and continue</SubmitButton>
					{#if vm.rows.length < 25}
						<SubmitButton class="px-6" name="action" value="add_row">Add row</SubmitButton>
					{/if}
				</div>
			</form>
		{/key}
	</div>
</div>
