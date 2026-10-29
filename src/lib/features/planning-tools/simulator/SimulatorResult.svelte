<script lang="ts">
	// simulator.Result(vm) — internal/pages/simulator/page.templ. Swapped on its
	// own after a preview.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { deltaBasisPoints, diffSentiment, isBuy, money, percent, quantity, type PageViewModel } from './vm.js';

	let { vm }: { vm: PageViewModel } = $props();
</script>

<vigil.Panel titleID="simulator-result-title">
	<vigil.PanelHeader id="simulator-result-title" title="What it would cost" />
	{#if !vm.result}
		<p class="text-footnote text-muted-foreground">Add a position and run the simulation to see the trades and the cash it would take.</p>
	{:else}
		{@const result = vm.result}
		<vigil.MetricStrip>
			<vigil.Metric label="Cash needed" value={money(result.totalCashNeeded, result.currency)} />
			<vigil.Metric label="Left over" value={money(result.leftoverCash, result.currency)} />
			<vigil.Metric label="Cash weight" value={percent(result.cashBasisPoints)} />
			<vigil.Metric label="Positions" value={String(result.trades.length)} />
		</vigil.MetricStrip>
		{#if result.wholeShares && result.leftoverCash > 0}
			<p class="mt-3 text-footnote text-muted-foreground">
				Whole-share rounding leaves {money(result.leftoverCash, result.currency)} unspent. Allow fractional shares to deploy it.
			</p>
		{/if}
		{#each result.warnings as warning, i (i)}
			<p class="mt-3 text-footnote text-destructive">{warning}</p>
		{/each}
		{#if result.trades.length > 0}
			<h3 class="mt-6 mb-2 text-footnote font-semibold">Trades</h3>
			<vigil.DataTable>
				<thead>
					<tr>
						<th scope="col">Ticker</th>
						<th scope="col">Side</th>
						<th scope="col">Quantity</th>
						<th scope="col">Price</th>
						<th scope="col">Amount</th>
					</tr>
				</thead>
				<tbody>
					{#each result.trades as trade, i (i)}
						<tr>
							<td>{trade.symbol}</td>
							<td>{#if isBuy(trade)}Buy{:else}Sell{/if}</td>
							<td>{quantity(trade.quantity)}</td>
							<td>{money(trade.price, result.currency)}</td>
							<td>{money(trade.notional, result.currency)}</td>
						</tr>
					{/each}
				</tbody>
			</vigil.DataTable>
		{/if}
		{#if result.diff.length > 0}
			<h3 class="mt-6 mb-2 text-footnote font-semibold">Against your current portfolio</h3>
			<vigil.DataTable>
				<thead>
					<tr>
						<th scope="col">Ticker</th>
						<th scope="col">Now</th>
						<th scope="col">Target</th>
						<th scope="col">Change</th>
					</tr>
				</thead>
				<tbody>
					{#each result.diff as row, i (i)}
						<tr>
							<td>{row.symbol}</td>
							<td>{percent(row.currentBasisPoints)}</td>
							<td>{percent(row.targetBasisPoints)}</td>
							<td
								class={[diffSentiment(row) === 'positive' && 'text-success', diffSentiment(row) === 'negative' && 'text-destructive']}
								>{percent(deltaBasisPoints(row))}</td
							>
						</tr>
					{/each}
				</tbody>
			</vigil.DataTable>
		{/if}
	{/if}
</vigil.Panel>
