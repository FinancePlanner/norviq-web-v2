<script lang="ts">
	// pages/portfolio/dividends.templ DividendsPage
	import EChart from '#lib/charts/EChart.svelte';
	import { spendingLine } from '#lib/charts/index.js';
	import { EmptyState, ProGateWrap } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
	const chart = $derived(
		vm.monthlyChart
			? spendingLine('dividends-monthly-chart', vm.monthlyChart.labels, vm.monthlyChart.values)
			: null
	);
</script>

<svelte:head>
	<title>Dividends - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

<ProGateWrap isPro={data.isPro} featureName="Dividend tracking">
	<div class="app-page-content vigil-canvas-page portfolio-dividends-page portfolio-modern-page">
		<vigil.ModernPageHeader
			title="Dividend tracking"
			subtitle="Projected income from your holdings"
		/>

		{#if vm.loadError}
			<div class="glass-card mt-6 p-6" role="alert">
				<p class="font-semibold">Could not load dividend data</p>
				<p class="mt-2 text-sm text-muted-foreground">Try refreshing the page.</p>
			</div>
		{:else}
			<div class="vigil-command-split mt-6">
				<div class="vigil-command-split-main">
					<vigil.Panel class="p-6">
						<h2 class="text-lg font-semibold">Annual projected income</h2>
						{#if vm.annualProjectedIncome !== ''}
							<p class="vigil-mono text-3xl font-semibold tabular-nums">
								{vm.annualProjectedIncome}
							</p>
						{:else}
							<!-- Not "$0.00": an empty projection means the figure has not been computed. -->
							<p class="text-sm text-muted-foreground">Not calculated yet</p>
						{/if}
						{#if chart}
							<div class="mt-6">
								<EChart {...chart} />
							</div>
						{/if}
					</vigil.Panel>
				</div>
				<vigil.CommandSplitAside>
					<vigil.Panel class="p-6">
						<h2 class="text-lg font-semibold">Upcoming payouts</h2>
						{#if vm.upcoming.length > 0}
							<ul class="vigil-dense-list mt-4">
								{#each vm.upcoming as div, i (i)}
									<div
										class="glass-card flex items-center justify-between gap-3 border border-[var(--color-border)] p-3"
									>
										<div>
											<span class="font-semibold">{div.symbol}</span>
											<p class="mt-1 text-xs text-muted-foreground">Pay date: {div.paymentDate}</p>
										</div>
										<div class="text-right">
											<span class="font-medium text-[var(--color-success)]"
												>+{div.projectedTotal}</span
											>
											<p class="mt-1 text-xs text-muted-foreground">{div.amountPerShare} / share</p>
										</div>
									</div>
								{/each}
							</ul>
						{:else}
							<EmptyState
								title="No upcoming dividends"
								description="Your current holdings have no projected dividend payouts scheduled."
							/>
						{/if}
					</vigil.Panel>
				</vigil.CommandSplitAside>
			</div>
		{/if}
	</div>
</ProGateWrap>
