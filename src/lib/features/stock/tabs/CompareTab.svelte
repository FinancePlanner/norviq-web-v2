<script lang="ts">
	// stock.CompareTab + CompareMetricsTable
	import { EmptyState, SectionCard } from '#lib/components/norviq/index.js';
	import * as table from '#lib/components/norviq/tui/table/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { wealthLine } from '#lib/charts/index.js';
	import { staggerOnMount } from '#lib/motion.js';
	import type { CompareTabVM } from '../detail.js';

	let { vm, symbol }: { vm: CompareTabVM; symbol: string } = $props();
	const spec = $derived(
		vm.chart ? wealthLine('stock-compare-chart', vm.chart.labels, vm.chart.values) : null
	);
	const peerURL = (peer: string) =>
		`/portfolio/${symbol.toLowerCase()}/compare?peer=${peer.toUpperCase()}`;
</script>

<div class="mt-6 space-y-4">
	{#if vm.peers.length > 0}
		<SectionCard title="Compare with peer">
			<div
				class="stock-compare-peers mt-4 flex flex-wrap gap-2"
				{@attach staggerOnMount(':scope > a', 20)}
			>
				{#each vm.peers as peer (peer.symbol)}
					<a
						href={peerURL(peer.symbol)}
						class={peer.selected
							? 'stock-compare-peer stock-compare-peer-active'
							: 'stock-compare-peer'}
					>
						{peer.symbol}
					</a>
				{/each}
			</div>
		</SectionCard>
	{/if}
	{#if vm.hasData && vm.selectedPeer !== ''}
		<SectionCard title={`${symbol} vs ${vm.selectedPeer}`}>
			{#if spec}
				<div class="stock-chart-wrap overview-chart-wrap mt-2 mb-4">
					<EChart {...spec} />
				</div>
			{/if}
			<div class="stock-compare-table-wrap mt-4 overflow-x-auto">
				<table.Table class="stock-forecast-table">
					<thead>
						<tr>
							<th>Metric</th>
							<th>Primary</th>
							<th>Peer</th>
						</tr>
					</thead>
					<tbody>
						{#each vm.rows as row (row.label)}
							<tr>
								<td>{row.label}</td>
								<td class="spring-pop" data-motion="spring">{row.primary}</td>
								<td class="spring-pop" data-motion="spring">{row.peer}</td>
							</tr>
						{/each}
					</tbody>
				</table.Table>
			</div>
		</SectionCard>
	{:else}
		<SectionCard title="Compare">
			<EmptyState
				title="Pick a peer"
				description="Select a peer symbol above to compare fundamentals side by side."
			/>
		</SectionCard>
	{/if}
</div>
