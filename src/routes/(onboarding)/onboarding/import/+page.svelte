<script lang="ts">
	// onboarding.ImportMenuPage
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';

	const choices = [
		{
			title: 'CSV import',
			description: 'CSV with symbol, shares, buy_price, buy_date (+ optional notes)',
			href: '/onboarding/import/csv',
			icon: 'file-up'
		},
		{
			title: 'Manual entry',
			description: 'Type symbol, shares, and cost basis',
			href: '/onboarding/import/manual',
			icon: 'pencil'
		}
	];
</script>

<svelte:head><title>Import holdings - Norviq</title></svelte:head>

<div class="onboarding-page onboarding-modern-page">
	<h1 class="onboarding-title">Add your holdings</h1>
	<p class="onboarding-lead mt-2">Choose how you want to populate your portfolio.</p>
	<div class="onboarding-choice-grid mt-8 grid gap-4 md:grid-cols-3">
		{#each choices as c (c.href)}
			<a
				href={c.href}
				class="onboarding-choice onboarding-step-card glass-card p-6 transition hover:brightness-[1.02]"
			>
				<span class="onboarding-choice-icon" aria-hidden="true">
					<Icon name={c.icon} class="h-5 w-5" />
				</span>
				<h2 class="mt-4 text-lg font-semibold">{c.title}</h2>
				<p class="mt-2 text-sm text-muted-foreground">{c.description}</p>
			</a>
		{/each}
		<form
			method="POST"
			action="/onboarding/skip"
			class="onboarding-choice onboarding-step-card glass-card p-6"
		>
			<input type="hidden" name="step" value="import" />
			<span class="onboarding-choice-icon opacity-40" aria-hidden="true">
				<Icon name="arrow-right" class="h-5 w-5" />
			</span>
			<h2 class="mt-4 text-lg font-semibold">Skip for now</h2>
			<p class="mt-2 text-sm text-muted-foreground">Set up holdings later from Portfolio</p>
			<SubmitButton class="mt-6 py-2.5 text-sm" fullWidth>Continue</SubmitButton>
		</form>
	</div>
</div>
