<script lang="ts">
	// dashboard.PulsePage (pulse.templ).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import ConnectAgentPill from '#lib/components/norviq/ConnectAgentPill.svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import PeriodControl from '#lib/features/dashboard/command-center/PeriodControl.svelte';
	import PulseCharts from '#lib/features/dashboard/command-center/PulseCharts.svelte';
	import PortfolioChartPanel from '#lib/features/dashboard/command-center/PortfolioChartPanel.svelte';
	import OverviewSetupPanel from '#lib/features/dashboard/command-center/OverviewSetupPanel.svelte';
	import { showOverviewSetup } from '#lib/features/dashboard/command-center/overview.js';
	import WhyMovedStrip from '#lib/features/dashboard/panels/WhyMovedStrip.svelte';
	import EconomyPulseCard from '#lib/features/dashboard/panels/EconomyPulseCard.svelte';
	import NewsTickerShell from '#lib/features/dashboard/panels/NewsTickerShell.svelte';
	import ActivityPanel from '#lib/features/dashboard/activity/ActivityPanel.svelte';
	import RecentSpendCard from '#lib/features/dashboard/activity/RecentSpendCard.svelte';
	import FinancialHealthCard from '#lib/features/dashboard/insights/FinancialHealthCard.svelte';
	import InsightKPIStrip from '#lib/features/dashboard/insights/InsightKPIStrip.svelte';
	import FocusPointsTeaser from '#lib/features/dashboard/insights/FocusPointsTeaser.svelte';

	let { data } = $props();
	const vm = $derived(data.vm);
	const overview = $derived(vm.overview);
</script>

<svelte:head>
	<title>{t('Period')} - Norviq</title>
	<meta name="keywords" content="Norviq dashboard" />
	<meta name="description" content="Your Norviq financial dashboard." />
</svelte:head>

{#snippet headerActions()}
	<PeriodControl options={vm.rangeOptions} />
	<ConnectAgentPill />
{/snippet}

<div
	class="app-page-content vigil-deck-page overview-page overview-modern-page command-center-page"
>
	<vigil.ModernPageHeader title={t('Period')} actions={headerActions} />
	<section class="cc-rail cc-rail-pulse" aria-label={t('Period')}>
		<PulseCharts {vm} />
		{#await data.whyMoved}
			<WhyMovedStrip />
		{:then whyMoved}
			<WhyMovedStrip vm={whyMoved} />
		{/await}
		<div class="overview-dashboard-grid">
			<div class="overview-main-primary">
				<PortfolioChartPanel vm={overview} />
				<!-- Go also required !GuidedStart.Visible; the guided-start card is not ported in this domain. -->
				{#if showOverviewSetup(overview)}
					<OverviewSetupPanel />
				{/if}
				<ActivityPanel
					activities={overview.activities}
					error={!!overview.loadErrors.activities}
					currency={overview.currency}
					spendCurrency={overview.spendCurrency}
				/>
				{#if overview.focusPoints.length > 0 || overview.goalsError}
					<FocusPointsTeaser points={overview.focusPoints} goalsError={overview.goalsError} />
				{/if}
			</div>
			<aside class="overview-main-side">
				{#if overview.loadErrors.insights}
					<vigil.ErrorRetry
						title={t('Financial health')}
						message={t('Financial health is unavailable right now.')}
					/>
				{:else}
					<FinancialHealthCard health={overview.financialHealth} />
				{/if}
				{#if overview.insightCards.length > 0}
					<div class="overview-kpi-strip mt-1">
						<InsightKPIStrip cards={overview.insightCards} />
					</div>
				{/if}
				<div id="recent-spend-panel">
					{#if overview.loadErrors.expenses}
						<vigil.ErrorRetry
							title={t('Recent spend')}
							message={t('Recent expenses are unavailable right now.')}
						/>
					{:else}
						<RecentSpendCard items={overview.recentSpend} />
					{/if}
				</div>
				<NewsTickerShell />
				{#await data.economyPulse}
					<EconomyPulseCard />
				{:then pulse}
					<EconomyPulseCard vm={pulse} />
				{/await}
			</aside>
		</div>
	</section>
</div>
