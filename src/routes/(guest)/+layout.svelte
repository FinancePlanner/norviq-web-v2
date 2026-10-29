<script lang="ts">
	// RedirectIfAuthenticated group (hooks.server.ts) rendered in AuthLayout.
	import AuthLayout from '#lib/features/auth-onboarding/AuthLayout.svelte';

	let { children } = $props();
</script>

<AuthLayout>
	{@render children()}
</AuthLayout>
