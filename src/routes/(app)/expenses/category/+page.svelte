<script lang="ts">
	import CategoryPanel from '#lib/features/money/expenses/panels/CategoryPanel.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Budget planner - Norviq</title></svelte:head>
<div class="app-page-content"><CategoryPanel vm={data.vm} /></div>
