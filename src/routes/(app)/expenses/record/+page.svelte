<script lang="ts">
	import RecordExpensePanel from '#lib/features/money/expenses/panels/RecordExpensePanel.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Budget planner - Norviq</title></svelte:head>
<div class="app-page-content"><RecordExpensePanel vm={data.vm} /></div>
