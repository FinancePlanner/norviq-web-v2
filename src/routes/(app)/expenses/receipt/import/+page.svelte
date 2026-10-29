<script lang="ts">
	// Direct navigation to the receipt import (Go only served it as an htmx
	// fragment for the planner dialog). Same component the planner embeds.
	import ReceiptImportPanel from '#lib/features/money/receipts/ReceiptImportPanel.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Without JS the actions post here and the page re-renders from `form`.
	const panelData = $derived(form?.state ? { state: form.state } : data);
</script>

<svelte:head><title>Scan receipts - Norviq</title></svelte:head>

{#if panelData.state.kind === 'consent'}
	<ReceiptImportPanel data={panelData} page={true} />
{:else}
	<div class="app-page-content">
		<ReceiptImportPanel data={panelData} page={true} />
	</div>
{/if}
