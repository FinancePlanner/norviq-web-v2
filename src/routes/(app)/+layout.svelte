<script lang="ts">
	import AppShell from '#lib/components/shell/AppShell.svelte';
	import GuidedStepLayer from '#lib/features/auth-onboarding/guided-start/GuidedStepLayer.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<AppShell
	username={data.username}
	email={data.email}
	sidebarItems={data.sidebarItems}
	social={data.social}
	trialExpired={data.trialExpired}
>
	{@render children()}
	{#if data.guidedStep}
		<GuidedStepLayer layer={data.guidedStep} />
	{/if}
</AppShell>
