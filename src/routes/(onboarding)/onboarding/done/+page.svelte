<script lang="ts">
	// onboarding.DonePage
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
</script>

<svelte:head><title>You're set - Norviq</title></svelte:head>

<div class="onboarding-page onboarding-modern-page onboarding-done text-center">
	<div class="onboarding-hero onboarding-step-card glass-card p-8 md:p-12">
		<div class="onboarding-done-badge" aria-hidden="true">
			<Icon name="check" class="h-8 w-8" />
		</div>
		<h1 class="onboarding-title mt-6">You're ready</h1>
		<p class="onboarding-lead mx-auto mt-4 max-w-md">
			Your workspace is set up. Open the dashboard to see wealth, activity, and insights in one place.
		</p>
		<form method="POST" action="/onboarding/complete" class="mt-8">
			<SubmitButton class="inline-flex w-auto px-8">Go to dashboard</SubmitButton>
		</form>
	</div>
</div>
