<script lang="ts">
	// pages/portfolio/quote_refresh.templ QuoteRefreshStatus: empty and hidden
	// until the first poll lands, then "Updated 15:04:05".
	let { id, updatedAt = '' }: { id: string; updatedAt?: string } = $props();
</script>

<p {id} class="text-xs text-muted-foreground" hidden={updatedAt === ''}>
	{#if updatedAt !== ''}Updated {updatedAt}{/if}
</p>
