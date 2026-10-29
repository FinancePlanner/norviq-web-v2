<script lang="ts">
	// Only rendered when the create action answers instead of redirecting: the
	// AI consent page (Go's RenderAIConsentPage for a form post).
	import AIConsentPage from '#lib/components/norviq/AIConsentPage.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Allow AI features - Norviq</title></svelte:head>
{#if form?.aiConsentRequired}
	<AIConsentPage next={form.next} />
{/if}
