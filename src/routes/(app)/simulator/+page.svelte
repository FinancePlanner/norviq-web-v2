<script lang="ts">
	import SimulatorPage from '#lib/features/planning-tools/simulator/SimulatorPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Portfolio simulator</title>
</svelte:head>

<SimulatorPage vm={data.vm} />
