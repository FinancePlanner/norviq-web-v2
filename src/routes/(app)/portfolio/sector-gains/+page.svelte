<script lang="ts">
	// pages/portfolio/sector_gains.templ SectorGainsPage
	import EChart from '#lib/charts/EChart.svelte';
	import { sectorGainsBar } from '#lib/charts/index.js';
	import { EmptyState, ProGateWrap, SectionCard } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
	const chart = $derived(
		vm.chart ? sectorGainsBar('sector-gains-chart', vm.chart.labels, vm.chart.values) : null
	);

	function totalClass(total: string): string {
		if (total.startsWith('-')) return 'text-danger';
		if (total.startsWith('+')) return 'text-success';
		return '';
	}
	const valueClass = (positive: boolean) =>
		positive ? 'text-success font-medium' : 'text-danger font-medium';
</script>

<svelte:head>
	<title>Sector Gains - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

<ProGateWrap isPro={data.isPro} featureName="Sector gains">
	<div class="app-page-content vigil-deck-page portfolio-sector-gains-page portfolio-modern-page">
		<vigil.ModernPageHeader title="Sector Gains" subtitle={vm.subtitle} />
		{#if vm.totalUnrealizedPnl !== ''}
			<p
				class={[
					'portfolio-sector-gains-total vigil-mono mt-2 text-2xl font-semibold tabular-nums',
					totalClass(vm.totalUnrealizedPnl)
				]}
			>
				{vm.totalUnrealizedPnl}
			</p>
		{/if}
		{#if vm.totalMarketValue !== ''}
			<p class="mt-1 text-sm text-muted-foreground">{vm.totalMarketValue} market value</p>
		{/if}
		{#if vm.hasData}
			<!-- Go called vigil.CommandDeck with no children block, so the deck is
			     empty and the two cards below are its siblings. Ported as is. -->
			<vigil.CommandDeck class="is-2col mt-6" />
			<SectionCard title="Unrealized P/L by sector">
				<div class="allocation-chart-wrap">
					{#if chart}<EChart {...chart} />{/if}
				</div>
			</SectionCard>
			<vigil.Panel class="p-5 md:p-6">
				<h2 class="text-lg font-semibold">Sector breakdown</h2>
				<div class="allocation-sector-table mt-4">
					<div class="allocation-sector-header sector-gains-header">
						<span>Sector</span>
						<span>P/L</span>
						<span>On cost</span>
						<span>Weight</span>
					</div>
					{#each vm.rows as row, i (i)}
						<div class="allocation-sector-row sector-gains-row">
							<span class="font-medium">{row.sector}</span>
							<span class={valueClass(row.positive)}>{row.unrealizedPnl}</span>
							<span class={valueClass(row.positive)}>{row.unrealizedPnlPercent}</span>
							<span>{row.weightPercent}</span>
						</div>
					{/each}
				</div>
			</vigil.Panel>
		{:else if vm.loadError}
			<EmptyState
				title="Could not load sector gains"
				description="Try again in a moment."
				actionLabel="Retry"
				actionHref="/portfolio/sector-gains"
			/>
		{:else}
			<EmptyState
				title="No sector gains yet"
				description="Add positions to your portfolio to see unrealized gains grouped by sector."
				actionLabel="Add position"
				actionHref="/portfolio"
			/>
		{/if}
	</div>
</ProGateWrap>
