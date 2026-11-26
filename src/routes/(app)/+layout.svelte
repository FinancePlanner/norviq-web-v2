<script lang="ts">
	import AppShell from '#lib/components/shell/AppShell.svelte';
	import GuidedStepLayer from '#lib/features/auth-onboarding/guided-start/GuidedStepLayer.svelte';
	import QuickAssistant from '#lib/features/dashboard/assistant/components/QuickAssistant.svelte';
	import { quickQMounted } from '#lib/features/dashboard/assistant/quick.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	// One condition mounts the card and tells the shell's Ask Q to open it.
	const quickQ = $derived(quickQMounted(data));
</script>

<AppShell
	username={data.username}
	email={data.email}
	sidebar={data.sidebar}
	social={data.social}
	trialExpired={data.trialExpired}
	{quickQ}
>
	{@render children()}
	{#if data.guidedStep}
		<GuidedStepLayer layer={data.guidedStep} />
	{/if}
</AppShell>

<!-- Outside the shell: its main column animates, which would anchor a fixed button to it. -->
{#if quickQ}
	<QuickAssistant />
{/if}
