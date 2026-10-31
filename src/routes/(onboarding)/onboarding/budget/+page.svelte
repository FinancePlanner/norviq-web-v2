<script lang="ts">
	// onboarding.BudgetPage + BudgetForm
	import { enhance } from '$app/forms';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import VaultTextField from '#lib/components/norviq/VaultTextField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const vm = $derived(form?.vm ?? data.vm);
	const submit = withSpinner(
		() =>
			async ({ update }) =>
				update({ reset: false })
	);
</script>

<svelte:head><title>Budget setup - Norviq</title></svelte:head>

<div class="onboarding-page onboarding-modern-page">
	<h1 class="onboarding-title">Monthly budget</h1>
	<p class="onboarding-lead mt-2">
		Split your net salary across pillars. You can refine this later in Expenses.
	</p>
	<div class="onboarding-step-card glass-card mt-8 p-6 md:p-8">
		<form method="POST" action="/onboarding/budget" id="budget-form" use:enhance={submit}>
			<FormErrorBanner message={vm.error} />
			<VaultTextField label="Net monthly salary" name="net_salary" placeholder="5000" required />
			<input type="hidden" name="month" value={vm.month} />
			<div class="mt-6 space-y-4">
				{#each vm.pillars as p (p.key)}
					<div class="budget-pillar-field onboarding-field-card">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="font-semibold">{p.label}</p>
								<p class="text-sm text-muted-foreground">{p.hint}</p>
							</div>
							<div class="w-24">
								<input
									type="text"
									name="share_{p.key}"
									class="field-input text-right"
									placeholder="%"
									inputmode="decimal"
								/>
							</div>
						</div>
					</div>
				{/each}
			</div>
			<p class="mt-4 text-xs text-muted-foreground">
				Enter percentage for each pillar (should total 100%).
			</p>
			<SubmitButton class="mt-6 w-auto px-6">Save budget</SubmitButton>
		</form>
	</div>
	<form method="POST" action="/onboarding/skip" class="mt-6 text-center">
		<input type="hidden" name="step" value="budget" />
		<NativeButton
			type="submit"
			class="onboarding-skip-link text-sm text-muted-foreground hover:opacity-100"
			>Skip budget setup</NativeButton
		>
	</form>
</div>
