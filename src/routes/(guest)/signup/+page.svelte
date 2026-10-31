<script lang="ts">
	import AuthMeta from '#lib/features/auth-onboarding/AuthMeta.svelte';
	import LoginPage from '#lib/features/auth-onboarding/LoginPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<AuthMeta
	title="Sign in - Norviq"
	keywords="Norviq sign in"
	description="Securely access your Norviq account."
/>
<LoginPage isSignup errorMessage={form?.error ?? ''} nextPath={data.next} />
