<script lang="ts">
	import PlanItemPanel from '#lib/features/money/expenses/panels/PlanItemPanel.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Budget planner - Norviq</title></svelte:head>
<div class="app-page-content"><PlanItemPanel vm={data.vm} /></div>
