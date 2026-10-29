<script lang="ts">
	// onboarding.ProgressBar(activeStep)
	let { activeStep }: { activeStep: number } = $props();

	const onboardingSteps = ['Plan', 'Import', 'Budget', 'Done'];

	function progressItemClass(step: number, active: number): string {
		const base = 'onboarding-progress-item';
		if (step < active) return base + ' onboarding-progress-item-done';
		if (step === active) return base + ' onboarding-progress-item-active';
		return base;
	}
</script>

<nav class="onboarding-progress" aria-label="Setup progress">
	<ol class="onboarding-progress-list">
		{#each onboardingSteps as label, i (label)}
			<li class={progressItemClass(i + 1, activeStep)}>
				<span class="onboarding-progress-dot" aria-hidden="true">{i + 1}</span>
				<span class="onboarding-progress-label">{label}</span>
			</li>
		{/each}
	</ol>
</nav>
