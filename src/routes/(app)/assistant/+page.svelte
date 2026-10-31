<script lang="ts">
	import AIConsentPage from '#lib/components/norviq/AIConsentPage.svelte';
	import AssistantPage from '#lib/features/dashboard/assistant/components/AssistantPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	{#if data.aiConsentRequired}
		<title>Allow AI features - Norviq</title>
	{:else}
		<title>Assistant - Norviq</title>
		<meta
			name="description"
			content="Private AI guidance grounded in your Norviq financial data."
		/>
	{/if}
</svelte:head>

{#if data.aiConsentRequired}
	<AIConsentPage next={data.next} />
{:else}
	<AssistantPage vm={data.vm} />
{/if}
