<script lang="ts">
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import DestinationRows from '#lib/components/shell/DestinationRows.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.label} - Norviq</title>
</svelte:head>

<vigil.DocumentPage pageClass="domain-index-page" title={data.label} subtitle={data.question}>
	<div class="flex flex-col gap-8">
		{#each data.sections as section (section.title)}
			<vigil.Section title={section.title}>
				<DestinationRows items={section.items} />
			</vigil.Section>
		{/each}
	</div>
</vigil.DocumentPage>
