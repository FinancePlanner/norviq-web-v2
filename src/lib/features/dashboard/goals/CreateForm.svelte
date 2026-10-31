<script lang="ts">
	// goals.createForm(vm)
	import { enhance } from '$app/forms';
	import { Field, SelectField, SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import type { Option } from '#lib/components/norviq/types.js';
	import type { PortfolioListSummary } from './types.js';

	let {
		portfolios,
		onsubmitted
	}: { portfolios: PortfolioListSummary[]; onsubmitted?: () => void } = $props();

	const goalTypes: Option[] = [
		{ value: 'financial_independence', label: 'Financial independence' },
		{ value: 'retirement', label: 'Retirement' },
		{ value: 'home_purchase', label: 'Home purchase' },
		{ value: 'emergency_fund', label: 'Emergency fund' },
		{ value: 'investment_target', label: 'Investment target' },
		{ value: 'custom', label: 'Custom' }
	];
	const riskProfiles: Option[] = [
		{ value: 'conservative', label: 'Conservative · 4%' },
		{ value: 'moderate', label: 'Moderate · 6%', selected: true },
		{ value: 'aggressive', label: 'Aggressive · 8%' }
	];
	// goalPortfolioOptions: no blank entry, the field is required.
	const portfolioOptions = $derived(
		portfolios.map((p): Option => ({ value: p.id, label: p.name }))
	);
</script>

<form
	id="new-goal"
	class="mt-6 space-y-5"
	method="POST"
	action="?/create"
	use:enhance={withSpinner(() => async ({ update }) => {
		await update();
		// Go answered with a 303 and a full page load, which closed the modal.
		onsubmitted?.();
	})}
>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field
			name="name"
			label="Goal name"
			required
			class="mt-2 w-full"
			wrapperClass="block text-sm font-medium sm:col-span-2"
		/>
		<SelectField
			name="goalType"
			label="Goal type"
			class="mt-2 w-full"
			wrapperClass="block text-sm font-medium"
			options={goalTypes}
		/>
		<SelectField
			name="riskProfile"
			label="Risk profile"
			class="mt-2 w-full"
			wrapperClass="block text-sm font-medium"
			options={riskProfiles}
		/>
		<Field
			name="targetAmount"
			label="Target amount"
			type="number"
			required
			class="mt-2 w-full"
			wrapperClass="block text-sm font-medium"
			min="1"
			step="1"
		/>
		<Field
			name="targetDate"
			label="Target date"
			type="date"
			required
			class="mt-2 w-full"
			wrapperClass="block text-sm font-medium"
		/>
		<Field
			name="startingCapital"
			label="Starting capital"
			type="number"
			value="0"
			class="mt-2 w-full"
			wrapperClass="block text-sm font-medium"
			min="0"
		/>
		<Field
			name="monthlyContribution"
			label="Monthly contribution"
			type="number"
			value="500"
			class="mt-2 w-full"
			wrapperClass="block text-sm font-medium"
			min="0"
		/>
		<Field
			name="baseCurrency"
			label="Currency"
			value="USD"
			required
			class="mt-2 w-full"
			wrapperClass="block text-sm font-medium"
			maxlength={3}
		/>
		<SelectField
			name="portfolioId"
			label="Portfolio"
			required
			class="mt-2"
			wrapperClass="block text-sm font-medium"
			options={portfolioOptions}
		/>
		<Field
			name="allocationPercentage"
			label="Portfolio share (%)"
			type="number"
			value="100"
			class="mt-2 w-full"
			wrapperClass="block text-sm font-medium"
			min="1"
			max="100"
		/>
	</div>
	<div class="rounded-lg bg-black/5 p-4 text-sm text-muted-foreground dark:bg-white/5">
		Return assumptions map to the selected risk profile. Target amounts are nominal. No AI is used
		in this calculation.
	</div>
	<SubmitButton>Create goal</SubmitButton>
</form>
