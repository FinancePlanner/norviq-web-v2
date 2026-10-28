<script lang="ts">
	// components.CongressTrades(vm) — the per-symbol list; no-op when !vm.present.
	import type { CongressVM } from './market-signals.js';

	let { vm }: { vm: CongressVM } = $props();
</script>

{#if vm.present}
	<table class="w-full text-left text-sm" data-market-signal="congress">
		<thead class="text-muted-foreground">
			<tr>
				<th scope="col" class="py-2 font-medium">Filer</th>
				<th scope="col" class="py-2 font-medium">Chamber</th>
				<th scope="col" class="py-2 font-medium">Type</th>
				<th scope="col" class="py-2 font-medium">Amount</th>
				<th scope="col" class="py-2 font-medium">Traded</th>
			</tr>
		</thead>
		<tbody>
			{#each vm.trades as trade, i (i)}
				<tr class="border-t">
					<td class="py-2">{trade.politician}</td>
					<td class="py-2">{trade.chamber}</td>
					<td class="py-2">{trade.type}</td>
					<td class="py-2 tabular-nums">{trade.amountRange}</td>
					<td class="py-2 whitespace-nowrap">{trade.transactionDate}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
