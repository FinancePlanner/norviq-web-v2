<script lang="ts">
	// components.InsiderActivity(vm) — no-op when !vm.present.
	import { insiderFlowLabel, type InsiderVM } from './market-signals.js';

	let { vm }: { vm: InsiderVM } = $props();
</script>

{#if vm.present}
	<div data-market-signal="insider">
		{#if vm.clusterBuy}
			<p class="market-insider-cluster mb-3 inline-block rounded-full border px-3 py-1 text-sm font-semibold positive">
				{vm.clusterBuy}
			</p>
		{/if}
		<p class="text-sm text-muted-foreground">
			{vm.windowLabel}
			<span class="mx-2">·</span>
			{insiderFlowLabel(vm)}
			<span class="mx-2">·</span>
			net <span class={['font-semibold', vm.netSharesTone]}>{vm.netShares}</span>
		</p>
		{#if vm.trades.length > 0}
			<table class="mt-4 w-full text-left text-sm">
				<thead class="text-muted-foreground">
					<tr>
						<th scope="col" class="py-2 font-medium">Date</th>
						<th scope="col" class="py-2 font-medium">Insider</th>
						<th scope="col" class="py-2 font-medium">Type</th>
						<th scope="col" class="py-2 text-right font-medium">Shares</th>
						<th scope="col" class="py-2 text-right font-medium">Value</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.trades as trade, i (i)}
						<tr class="border-t">
							<td class="py-2 whitespace-nowrap">{trade.date}</td>
							<td class="py-2">
								{trade.name}
								{#if trade.title}
									<span class="block text-xs text-muted-foreground">{trade.title}</span>
								{/if}
							</td>
							<td class="py-2">{trade.kind}</td>
							<td class="py-2 text-right tabular-nums">{trade.shares}</td>
							<td class="py-2 text-right tabular-nums">{trade.value}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
{/if}
