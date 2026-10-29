<script lang="ts">
	import GrowPage from '#lib/features/planning-tools/planning/GrowPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Grow</title>
</svelte:head>

<GrowPage vm={form?.vm ?? data.vm} />
