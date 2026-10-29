<script lang="ts">
	// onboarding.QuestionnairePage (native form post, as in Go)
	import NativeInput from '#lib/components/norviq/NativeInput.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';

	const goals = [
		['build_wealth', 'Build long-term wealth'],
		['track_portfolio', 'Track portfolio performance'],
		['control_spending', 'Control monthly spending'],
		['replace_spreadsheets', 'Replace spreadsheets']
	];
	const painPoints = [
		['scattered_accounts', 'Accounts are scattered'],
		['unclear_progress', 'Progress is hard to read'],
		['manual_tracking', 'Manual tracking is slow'],
		['budget_blindspots', 'Budget blind spots']
	];
	const holdings = [
		['import_csv', 'Import broker CSV'],
		['manual_entry', 'Add manually'],
		['later', 'Set up later']
	];
	const spending = [
		['monthly_budget', 'Monthly budget'],
		['recurring_expenses', 'Recurring expenses'],
		['partner_expenses', 'Partner expenses']
	];
</script>

{#snippet radioOption(name: string, value: string, label: string)}
	<label class="onboarding-option">
		<NativeInput type="radio" {name} {value} class="mr-2" required={value === 'build_wealth'} />
		{label}
	</label>
{/snippet}

{#snippet checkboxOption(name: string, value: string, label: string)}
	<label class="onboarding-option block">
		<NativeInput type="checkbox" {name} {value} class="mr-2" />
		{label}
	</label>
{/snippet}

<svelte:head><title>Personalize Norviq - Norviq</title></svelte:head>

<div class="onboarding-page onboarding-modern-page">
	<div class="onboarding-hero onboarding-step-card glass-card p-8 md:p-10">
		<h1 class="onboarding-title">Shape your Norviq setup</h1>
		<p class="onboarding-lead mt-3 max-w-2xl">
			Answer a few quick questions so the web setup follows the same planning path as the iOS onboarding flow.
		</p>
		<form method="POST" action="/onboarding/questionnaire" class="mt-8 space-y-7 text-left">
			<fieldset>
				<legend class="field-label">Main goal</legend>
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					{#each goals as [value, label] (value)}
						{@render radioOption('goal', value, label)}
					{/each}
				</div>
			</fieldset>
			<fieldset>
				<legend class="field-label">Current friction</legend>
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					{#each painPoints as [value, label] (value)}
						{@render checkboxOption('pain_points', value, label)}
					{/each}
				</div>
			</fieldset>
			<div class="grid gap-6 md:grid-cols-2">
				<fieldset>
					<legend class="field-label">Holdings setup</legend>
					<div class="mt-3 space-y-3">
						{#each holdings as [value, label] (value)}
							{@render checkboxOption('holdings_preference', value, label)}
						{/each}
					</div>
				</fieldset>
				<fieldset>
					<legend class="field-label">Spending focus</legend>
					<div class="mt-3 space-y-3">
						{#each spending as [value, label] (value)}
							{@render checkboxOption('spending_preference', value, label)}
						{/each}
					</div>
				</fieldset>
			</div>
			<div class="flex flex-wrap items-center gap-3 pt-2">
				<SubmitButton class="w-auto px-8">Continue setup</SubmitButton>
				<span class="text-sm text-muted-foreground">You can change every setup choice later.</span>
			</div>
		</form>
	</div>
</div>
