<script lang="ts">
	// middleware.RenderAIConsentPage: AIConsentPage(next) in the app shell.
	import AIConsentPage from '#lib/components/norviq/AIConsentPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Allow AI features - Norviq</title></svelte:head>

<AIConsentPage next={form?.next ?? data.next} />
