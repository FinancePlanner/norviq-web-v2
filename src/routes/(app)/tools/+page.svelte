<script lang="ts">
	import ToolsHubPage from '#lib/features/planning-tools/tools/ToolsHubPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Tools</title>
</svelte:head>

<ToolsHubPage features={data.features} billingUnknown={data.billingUnknown} />
