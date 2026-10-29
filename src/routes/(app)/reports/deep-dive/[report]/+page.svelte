<script lang="ts">
	// reports.DeepDiveReportPage
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { EmptyState } from '#lib/components/norviq/index.js';
	import { statPillValueClassLocal } from '#lib/features/insights/reports/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>{vm.title} - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-deck-page reports-page reports-modern-page">
	<a href="/reports/deep-dive" class="text-sm text-muted-foreground hover:opacity-100 flex items-center gap-1 mb-2">
		<ArrowLeft class="h-4 w-4" data-lucide="icon" /> Back to Deep Dives
	</a>
	<vigil.ModernPageHeader title={vm.title} subtitle={vm.description} />

	{#if !vm.dataAvailable}
		<div class="mt-8">
			<EmptyState title="Data Unavailable" description="This advanced statistic requires more data or is not yet populated by the backend." />
		</div>
	{:else}
		<div class="glass-card p-6 mt-8">
			{#if vm.title === 'Calendar Performance'}
				<div class="space-y-4">
					{#each vm.calendar as day, i (i)}
						<div class="flex justify-between items-center border-b border-border pb-2">
							<span>{day.date}</span>
							<span class={statPillValueClassLocal(day.positive)}>{day.pnlPercent}</span>
						</div>
					{/each}
				</div>
			{:else if vm.title === 'Sector Allocation'}
				<div class="space-y-4">
					{#each vm.sectors as sector, i (i)}
						<div class="flex justify-between items-center border-b border-border pb-2">
							<div class="flex items-center gap-2">
								<span class="w-3 h-3 rounded-full" style={'background-color: ' + sector.color}></span>
								<span>{sector.label}</span>
							</div>
							<span>{sector.percent}</span>
						</div>
					{/each}
				</div>
			{:else if vm.title === 'Winners vs. Losers' || vm.title === 'Stock Scorecard'}
				<div class="space-y-4">
					{#each vm.stocks as stock, i (i)}
						<div class="flex justify-between items-center border-b border-border pb-2">
							<span class="font-bold">{stock.symbol}</span>
							<div class="text-right">
								<div>{stock.marketValue}</div>
								{#if stock.unrealizedPnlPercent}
									<div class={statPillValueClassLocal(stock.positive)}>{stock.unrealizedPnlPercent}</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="opacity-70">Report generated successfully.</p>
			{/if}
		</div>
	{/if}
</div>
