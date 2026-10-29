<script lang="ts">
	import SalaryPanel from '#lib/features/money/expenses/panels/SalaryPanel.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Budget planner - Norviq</title></svelte:head>
<div class="app-page-content"><SalaryPanel vm={data.vm} /></div>
