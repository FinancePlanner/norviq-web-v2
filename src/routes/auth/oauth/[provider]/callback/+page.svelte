<script lang="ts">
	// oauth.go renderOAuthPageError: the sign-in page (AuthLayout) with the message.
	import AuthLayout from '#lib/features/auth-onboarding/AuthLayout.svelte';
	import AuthMeta from '#lib/features/auth-onboarding/AuthMeta.svelte';
	import LoginPage from '#lib/features/auth-onboarding/LoginPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const result = $derived.by(() => {
		if (form) return form;
		const d = data as { error?: string; next?: string };
		return typeof d.error === 'string' ? { error: d.error, next: d.next ?? '' } : null;
	});
</script>

<AuthMeta
	title="Sign in - Norviq"
	keywords="Sign in - Norviq"
	description="Securely access your Norviq account."
/>
<AuthLayout>
	<LoginPage isSignup={false} errorMessage={result?.error ?? ''} nextPath={result?.next ?? ''} />
</AuthLayout>
