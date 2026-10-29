<script lang="ts">
	// Footer: the summary's three totals. Cell edits replace it (Go: out of band).
	import type { FooterVM } from '../types.js';

	let { vm }: { vm: FooterVM } = $props();
</script>

{#snippet footerStat(label: string, value: string, note: string)}
	<div class="rounded-xl border border-border p-3">
		<p class="text-footnote text-muted-foreground">{label}</p>
		<p class="text-title3 font-semibold tabular-nums">{value}</p>
		{#if note}
			<p class="text-footnote text-muted-foreground">{note}</p>
		{/if}
	</div>
{/snippet}

<div id="terminal-footer" class="grid gap-3 sm:grid-cols-3" hidden={!vm.visible}>
	{@render footerStat('Total value wanted', vm.totalValueWanted, '')}
	{@render footerStat('Still needed at terminal prices', vm.totalStillNeeded, '')}
	{@render footerStat("Capital at today's price", vm.totalCapitalToday, vm.pricedNote)}
</div>
