<script lang="ts">
	import RetirePage from '#lib/features/planning-tools/planning/RetirePage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Retire</title>
</svelte:head>

<RetirePage vm={data.vm} />
