<script lang="ts">
	import PartnerPanel from '#lib/features/money/expenses/panels/PartnerPanel.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Budget planner - Norviq</title></svelte:head>
<div class="app-page-content"><PartnerPanel vm={data.vm} /></div>
