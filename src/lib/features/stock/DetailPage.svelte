<script lang="ts">
	// stock.DetailPage (page.templ): toolbar, sub-nav, the active tab and the
	// page's modal shells.
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import { ChartPlaceholder, ProGateWrap, SectionCard } from '#lib/components/norviq/index.js';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import StockSubNav from '#lib/components/shell/StockSubNav.svelte';
	import { stockDetailTabs, stockTabFeature } from '#lib/nav.js';
	import AnalysisTab from './analysis/AnalysisTab.svelte';
	import ChartBuilderTab from './builder/ChartBuilderTab.svelte';
	import PositionActionsMenu from './PositionActionsMenu.svelte';
	import { panels } from './panels.svelte.js';
	import { labelTitle } from './format.js';
	import ChartTab from './tabs/ChartTab.svelte';
	import CompareTab from './tabs/CompareTab.svelte';
	import EarningsTab from './tabs/EarningsTab.svelte';
	import ForecastTab from './tabs/ForecastTab.svelte';
	import NewsTab from './tabs/NewsTab.svelte';
	import OverviewTab from './tabs/OverviewTab.svelte';
	import OwnershipTab from './tabs/OwnershipTab.svelte';
	import SentimentTab from './tabs/SentimentTab.svelte';
	import StatementsTab from './tabs/StatementsTab.svelte';
	import TranscriptPanel from './tabs/TranscriptPanel.svelte';
	import ValuationPanel from './tabs/ValuationPanel.svelte';
	import type { DetailViewModel } from './detail.js';

	let { vm, isPro }: { vm: DetailViewModel; isPro: boolean } = $props();

	const lower = $derived(vm.symbol.toLowerCase());
	const tabs = $derived(stockDetailTabs(lower));
	const activePath = $derived(
		'/portfolio/' + lower + (vm.activeTab !== '' ? '/' + vm.activeTab : '')
	);

	function tabFeatureName(tab: string): string {
		switch (tab) {
			case 'builder':
				return 'Chart builder';
			case 'statements':
				return 'Financial statements';
			case 'analysis':
				return 'Stock analysis';
			case 'forecast':
				return 'Forecast scenarios';
			case 'compare':
				return 'Compare stocks';
			case 'earnings':
				return 'Earnings & transcripts';
			case 'ownership':
				return 'Ownership & insider activity';
			default:
				return labelTitle(tab);
		}
	}
</script>

{#snippet backLink(href: string, label: string)}
	<a {href} class="vigil-settings-back stock-back-link">
		<ChevronLeft class="h-4 w-4 shrink-0" data-lucide="icon" />
		<span>{label}</span>
	</a>
{/snippet}

{#snippet tabContent()}
	{#if vm.activeTab === 'chart'}
		<ChartTab chart={vm.chart} />
	{:else if vm.activeTab === 'builder'}
		<ChartBuilderTab vm={vm.chartBuilder} symbol={vm.symbol} />
	{:else if vm.activeTab === 'statements'}
		<StatementsTab vm={vm.statements} />
	{:else if vm.activeTab === 'analysis'}
		<AnalysisTab vm={vm.analysis} symbol={vm.symbol} />
	{:else if vm.activeTab === 'forecast'}
		<ForecastTab vm={vm.forecast} />
	{:else if vm.activeTab === 'compare'}
		<CompareTab vm={vm.compare} symbol={vm.symbol} />
	{:else if vm.activeTab === 'news'}
		<NewsTab vm={vm.news} />
	{:else if vm.activeTab === 'sentiment'}
		<SentimentTab vm={vm.sentiment} />
	{:else if vm.activeTab === 'earnings'}
		<EarningsTab {vm} />
	{:else if vm.activeTab === 'ownership'}
		<OwnershipTab vm={vm.ownership} />
	{:else if vm.activeTab !== '' && vm.activeTab !== 'overview'}
		<div class="mt-6">
			<SectionCard title={labelTitle(vm.activeTab)}><ChartPlaceholder /></SectionCard>
		</div>
	{/if}
{/snippet}

<div class="app-page-content vigil-deck-page stock-detail-page stock-modern-page">
	<div class="stock-detail-toolbar">
		{#if !vm.hasPosition && vm.activeTab === 'earnings'}
			{@render backLink('/portfolio/earnings', 'Earnings calendar')}
		{:else}
			{@render backLink('/portfolio', 'Holdings')}
		{/if}
		{#if vm.hasPosition && vm.positionID !== '' && !vm.hasLoadError}
			<PositionActionsMenu symbol={vm.symbol} positionID={vm.positionID} {isPro} />
		{/if}
	</div>
	<StockSubNav symbol={vm.symbol} {tabs} {activePath} />
	{#if vm.hasLoadError}
		<div class="stock-detail-error glass-card mt-6 p-6" role="alert">
			<p class="font-semibold">Could not load {vm.symbol}</p>
			<p class="mt-2 text-sm text-muted-foreground">{vm.errorMessage}</p>
			<a href="/portfolio" class="portfolio-retry-btn mt-4 inline-block">Return to holdings</a>
		</div>
	{:else if vm.activeTab === '' || vm.activeTab === 'overview'}
		<OverviewTab {vm} />
	{:else if stockTabFeature(vm.activeTab) !== '' && !isPro}
		<ProGateWrap {isPro} featureName={tabFeatureName(vm.activeTab)}
			>{@render tabContent()}</ProGateWrap
		>
	{:else}
		{@render tabContent()}
	{/if}
	<dialog.Dialog id="transcript-dialog">
		<dialog.Content
			class="glass-card vigil-modal-panel stock-transcript-panel border-0 p-6 sm:max-w-2xl md:p-8"
		>
			<TranscriptPanel vm={panels.transcript} />
		</dialog.Content>
	</dialog.Dialog>
	<dialog.Dialog id="valuation-action-dialog">
		<dialog.Content class="glass-card vigil-modal-panel border-0 p-6 sm:max-w-2xl md:p-8">
			<ValuationPanel result={panels.valuation} />
		</dialog.Content>
	</dialog.Dialog>
</div>
