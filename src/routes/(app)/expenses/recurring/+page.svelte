<script lang="ts">
	import RecurringTemplatePanel from '#lib/features/money/expenses/panels/RecurringTemplatePanel.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Budget planner - Norviq</title></svelte:head>
<div class="app-page-content"><RecurringTemplatePanel vm={data.vm} /></div>
