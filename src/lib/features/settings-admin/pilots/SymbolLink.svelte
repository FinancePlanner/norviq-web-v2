<script lang="ts">
	// pages/pilots symbolLink(symbol, href).
	let { symbol, href }: { symbol: string; href: string } = $props();
</script>

{#if href}<a class="hover:text-[var(--color-tint)]" {href}>{symbol}</a>{:else}{symbol}{/if}
