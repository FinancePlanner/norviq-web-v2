<script lang="ts">
	// oauth.go renderOAuthPageError: the sign-in page (AuthLayout) with the message.
	import AuthLayout from '#lib/features/auth-onboarding/AuthLayout.svelte';
	import AuthMeta from '#lib/features/auth-onboarding/AuthMeta.svelte';
	import LoginPage from '#lib/features/auth-onboarding/LoginPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const result = $derived(form ?? ('error' in data ? data : null));
</script>

<AuthMeta title="Sign in - Norviq" keywords="Sign in - Norviq" description="Securely access your Norviq account." />
<AuthLayout>
	<LoginPage isSignup={false} errorMessage={result?.error ?? ''} nextPath={result?.next ?? ''} />
</AuthLayout>
