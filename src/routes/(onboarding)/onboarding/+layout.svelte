<script lang="ts">
	// RequireAuth group (hooks.server.ts); every /onboarding page renders in
	// OnboardingLayout. Each page's load returns its progress `step`.
	import { page } from '$app/state';
	import OnboardingLayout from '#lib/features/auth-onboarding/onboarding/OnboardingLayout.svelte';

	let { children } = $props();
</script>

<OnboardingLayout step={(page.data.step as number | undefined) ?? 0}>
	{@render children()}
</OnboardingLayout>
