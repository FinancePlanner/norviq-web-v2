<script lang="ts">
	import ReportsPage from '#lib/features/insights/reports/ReportsPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#key data.vm.tab}
	<ReportsPage vm={data.vm} />
{/key}
