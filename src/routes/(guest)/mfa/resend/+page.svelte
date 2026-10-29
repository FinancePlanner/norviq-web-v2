<script lang="ts">
	import MfaStandalone from '#lib/features/auth-onboarding/MfaStandalone.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<MfaStandalone initial={form?.mfa ?? null} />
