<script lang="ts">
	import DetailPage from '#lib/features/stock/DetailPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="keywords" content="Norviq dashboard" />
	<meta name="description" content="Your Norviq financial dashboard." />
</svelte:head>

<DetailPage vm={data.vm} isPro={data.isPro} />
