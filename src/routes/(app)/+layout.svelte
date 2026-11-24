<script lang="ts">
	import AppShell from '#lib/components/shell/AppShell.svelte';
	import GuidedStepLayer from '#lib/features/auth-onboarding/guided-start/GuidedStepLayer.svelte';
	import QuickAssistant from '#lib/features/dashboard/assistant/components/QuickAssistant.svelte';
	import { Feature } from '#lib/billing.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<!-- The display face (Brygada 1918) sets the Overview greeting and every
     Document page title above the fold; once fetched it is cached for the app. -->
<svelte:head>
	<link
		rel="preload"
		href="/static/fonts/brygada-1918-latin-wght-normal.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
</svelte:head>

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

<!-- Outside the shell: its main column animates, which would anchor a fixed button to it. -->
{#if data.features[Feature.AIInsights] && !data.guidedStep}
	<QuickAssistant />
{/if}
