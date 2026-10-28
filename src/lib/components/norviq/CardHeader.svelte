<script lang="ts">
	// components.CardHeader(title, desc) and components.ReportCardHeader (identical).
	let { title, desc = '' }: { title: string; desc?: string } = $props();
</script>

<div>
	<h3 class="text-body font-semibold">{title}</h3>
	{#if desc}
		<p class="mt-0.5 text-footnote text-muted-foreground">{desc}</p>
	{/if}
</div>
