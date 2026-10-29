<script lang="ts">
	import ResetPasswordPage from '#lib/features/auth-onboarding/ResetPasswordPage.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<ResetPasswordPage initial={form} />
