<script lang="ts">
	// onboarding.WelcomePage
	import BrandLogo from '#lib/components/norviq/BrandLogo.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
	import VigFull from '#lib/components/norviq/VigFull.svelte';
</script>

<svelte:head><title>Welcome - Norviq</title></svelte:head>

<div class="onboarding-page onboarding-modern-page">
	<div class="onboarding-hero onboarding-step-card glass-card p-8 text-center md:p-12">
		<VigFull class="onboarding-vig mx-auto" />
		<div class="mt-5">
			<BrandLogo variant="full-large" />
		</div>
		<h1 class="onboarding-title mt-6">One app. Every angle.</h1>
		<p class="onboarding-lead mx-auto mt-4 max-w-lg">
			The vigil begins in a few minutes - import holdings or add them manually, then outline your
			monthly budget. Wealth, spending, and the signals between.
		</p>
		<PrimaryButton href="/onboarding/import" class="onboarding-cta mt-8 inline-flex px-8"
			>Get started</PrimaryButton
		>
		<form method="POST" action="/onboarding/skip" class="mt-4">
			<input type="hidden" name="step" value="all" />
			<NativeButton
				type="submit"
				class="onboarding-skip-link text-sm text-muted-foreground hover:opacity-100"
				>Skip for now</NativeButton
			>
		</form>
	</div>
</div>
