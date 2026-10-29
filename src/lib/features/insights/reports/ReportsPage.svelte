<script lang="ts">
	// reports.Page / reportsBody + overview_cards.templ + customize.templ, with
	// the Alpine reportsPage() store from reports-preferences.js.
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import X from '@lucide/svelte/icons/x';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { CardHeader, ChartPlaceholder, Icon, NativeButton, SegmentedControl, VigIcon } from '#lib/components/norviq/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { allocationPie, spendingLine, wealthLine } from '#lib/charts/index.js';
	import type { ChartSpec } from '#lib/charts/index.js';
	import { animateValue, staggerOnMount } from '#lib/motion.js';
	import FinancialHealthCard from '#lib/features/dashboard/insights/FinancialHealthCard.svelte';
	import InsightCardsGrid from '#lib/features/dashboard/insights/InsightCardsGrid.svelte';
	import { DefaultCardOrder, isWideCard, reportCardSlotClass, reportChangeClass, reportTabs } from './cards.js';
	import { ReportsPageState } from './preferences.svelte.js';
	import { pillarColorProperty, pillarIconName, type ReportsPageVM } from './types.js';
	import { formatFloat } from '#lib/format.js';

	let { vm }: { vm: ReportsPageVM } = $props();

	// svelte-ignore state_referenced_locally
	const store = new ReportsPageState(vm.tab);
	onMount(() => store.init());

	const netWorthChart = $derived(vm.netWorth.chart ? wealthLine('reports-net-worth-chart', vm.netWorth.chart.labels, vm.netWorth.chart.values) : null);
	const performanceChart = $derived(
		vm.performance.chart ? wealthLine('reports-performance-chart', vm.performance.chart.labels, vm.performance.chart.values) : null
	);
	const allocationChart = $derived(
		vm.allocation.chart ? allocationPie('reports-allocation-chart', vm.allocation.chart.labels, vm.allocation.chart.weights) : null
	);
	const spendingChart = $derived(vm.spending.chart ? spendingLine('reports-spending-chart', vm.spending.chart.labels, vm.spending.chart.values) : null);
	const savingsChart = $derived(
		vm.savingsRate.chart ? wealthLine('reports-savings-rate-chart', vm.savingsRate.chart.labels, vm.savingsRate.chart.values) : null
	);
	const cashFlowChart = $derived(vm.cashFlow.chart ? wealthLine('reports-cashflow-chart', vm.cashFlow.chart.labels, vm.cashFlow.chart.values) : null);

	// The x-init count-up: each hero number pops from 82% of its value.
	function heroCountUp(node: HTMLElement) {
		const raf = requestAnimationFrame(() => {
			node.querySelectorAll<HTMLElement>('.report-card-hero').forEach((el) => {
				const v = (el.textContent ?? '').trim();
				if (!v || el.dataset.animated || !/\d/.test(v)) return;
				el.dataset.prevValue = v;
				el.dataset.animated = 'true';
				const numMatch = v.replace(/[^0-9.-]/g, '');
				if (numMatch) {
					const n = parseFloat(numMatch) || 0;
					el.textContent = v.replace(numMatch, String(Math.round(n * 0.82)));
					animateValue(el, n * 0.82, v, 620);
				}
			});
		});
		return () => cancelAnimationFrame(raf);
	}
</script>

{#snippet chartOrPlaceholder(spec: ChartSpec | null)}
	{#if spec}<EChart {...spec} />{:else}<ChartPlaceholder />{/if}
{/snippet}

{#snippet card(cardID: string)}
	{#if cardID === 'net-worth'}
		{@const c = vm.netWorth}
		<article class="report-card glass-card p-5 md:p-6 card-hover">
			<CardHeader title="Net worth" desc="Total wealth over time" />
			{#if c.available}
				<p class="report-card-hero mt-4 spring-pop" data-format="$" data-motion="spring">{c.totalValue}</p>
				{#if c.changeLabel}<p class={reportChangeClass(c.changePositive)}>{c.changeLabel}</p>{/if}
				<div class="report-card-chart mt-4 min-h-[180px]">{@render chartOrPlaceholder(netWorthChart)}</div>
			{:else}
				<p class="report-card-empty mt-4">Add holdings to track net worth.</p>
			{/if}
		</article>
	{:else if cardID === 'quick-stats'}
		{@const c = vm.quickStats}
		<article class="report-card glass-card p-5 md:p-6 card-hover">
			<CardHeader title="Quick stats" desc="Key portfolio metrics" />
			{#if c.error}
				<p class="mt-2 text-sm text-[var(--color-danger)]">{c.error}</p>
			{:else if c.available}
				<dl class="report-stat-grid mt-4">
					{#each c.stats as stat, i (i)}
						<div class="report-stat">
							<dt class="report-stat-label">{stat.label}</dt>
							<dd class="report-stat-value">{stat.value}</dd>
						</div>
					{/each}
				</dl>
			{:else}
				<p class="report-card-empty mt-4">Portfolio stats will appear once you import positions.</p>
			{/if}
		</article>
	{:else if cardID === 'insights'}
		{@const c = vm.insights}
		<article class="report-card report-card-wide glass-card p-5 md:p-6 card-hover">
			<CardHeader title="Insights" desc="Personalized focus areas" />
			{#if c.available && c.financialHealth}
				<div class="report-insights-stack mt-4 space-y-4">
					<FinancialHealthCard health={c.financialHealth} />
					<InsightCardsGrid cards={c.insightCards} />
				</div>
			{:else}
				<p class="report-card-empty mt-4">Insights unavailable right now.</p>
			{/if}
		</article>
	{:else if cardID === 'performance'}
		{@const c = vm.performance}
		<article class="report-card glass-card p-5 md:p-6 card-hover">
			<CardHeader title="Performance" desc="Returns across your holdings" />
			{#if c.error}
				<p class="mt-2 text-sm text-[var(--color-danger)]">{c.error}</p>
			{:else if c.available}
				{#if c.changeLabel}<p class={'mt-4 ' + reportChangeClass(c.changePositive)}>{c.changeLabel}</p>{/if}
				<div class="report-card-chart mt-4 min-h-[180px]">{@render chartOrPlaceholder(performanceChart)}</div>
			{:else}
				<p class="report-card-empty mt-4">Performance history will appear after your first snapshot.</p>
			{/if}
		</article>
	{:else if cardID === 'allocation'}
		{@const c = vm.allocation}
		<article class="report-card glass-card p-5 md:p-6 card-hover">
			<CardHeader title="Allocation" desc="Sector and asset mix" />
			{#if c.available}
				<div class="report-allocation mt-4">
					{#if allocationChart}
						<div class="report-card-chart allocation-chart-wrap min-h-[160px]"><EChart {...allocationChart} /></div>
					{/if}
					{#if c.rows.length > 0}
						<ul class="allocation-legend mt-4">
							{#each c.rows as row, i (i)}
								<li class="allocation-legend-row">
									<span class="allocation-legend-dot" style={'background:' + row.color}></span>
									<span class="allocation-legend-label">{row.label}</span>
									<span class="allocation-legend-value">{row.value}</span>
									<span class="allocation-legend-percent">{row.percent}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{:else}
				<p class="report-card-empty mt-4">Sector allocation appears once holdings have profile data.</p>
			{/if}
		</article>
	{:else if cardID === 'spending'}
		{@const c = vm.spending}
		<article class="report-card glass-card p-5 md:p-6 card-hover">
			<CardHeader title="Spending" desc="Where your money went" />
			{#if c.available}
				{#if c.latestMonth}
					<p class="report-card-hero mt-4 spring-pop" data-motion="spring">{c.latestMonth}</p>
					<p class="text-sm text-muted-foreground">Latest month</p>
				{/if}
				{#if c.changeLabel}<p class={'mt-2 ' + reportChangeClass(c.changePositive)}>{c.changeLabel}</p>{/if}
				<div class="report-card-chart mt-4 min-h-[180px]">{@render chartOrPlaceholder(spendingChart)}</div>
			{:else}
				<p class="report-card-empty mt-4">Record expenses to see spending trends.</p>
			{/if}
		</article>
	{:else if cardID === 'budget-tracking'}
		{@const c = vm.budgetTracking}
		<article class="report-card glass-card p-5 md:p-6 card-hover">
			<CardHeader title="Budget tracking" desc="Plan vs actual by pillar" />
			{#if c.available}
				<ul class="report-pillar-list mt-4 space-y-4">
					{#each c.rows as row, i (i)}
						<li class="report-pillar-row" style={pillarColorProperty(row)}>
							<div class="report-pillar-header">
								<span class="report-pillar-name">
									<span class="report-pillar-glyph" aria-hidden="true"><Icon name={pillarIconName(row)} class="h-4 w-4" /></span>
									<span class="font-medium">{row.label}</span>
								</span>
								<span class="text-sm text-muted-foreground">{row.actual} / {row.target}</span>
							</div>
							<div class="pillar-progress mt-2" aria-hidden="true">
								{#if row.hasTarget}
									<div class={['pillar-progress-fill', 'is-' + row.state]} style={`width:${formatFloat(row.percent, 0)}%`}></div>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="report-card-empty mt-4">Set salary and pillar targets to track your budget.</p>
			{/if}
		</article>
	{:else if cardID === 'savings-rate'}
		{@const c = vm.savingsRate}
		<article class="report-card glass-card p-5 md:p-6 card-hover">
			<CardHeader title="Savings rate" desc="Income retained over time" />
			{#if c.available}
				<p class="report-card-hero mt-4 spring-pop" data-motion="spring">{c.latestRate}</p>
				{#if c.changeLabel}<p class={reportChangeClass(c.changePositive)}>{c.changeLabel}</p>{/if}
				<div class="report-card-chart mt-4 min-h-[180px]">{@render chartOrPlaceholder(savingsChart)}</div>
			{:else}
				<p class="report-card-empty mt-4">Savings rate needs income and expense history.</p>
			{/if}
		</article>
	{:else if cardID === 'household-split'}
		{@const c = vm.householdSplit}
		<article class="report-card glass-card p-5 md:p-6 card-hover">
			<CardHeader title="Household split" desc="Partner contribution share" />
			{#if c.available}
				<dl class="report-stat-grid mt-4">
					<div class="report-stat">
						<dt class="report-stat-label">Your spend</dt>
						<dd class="report-stat-value">{c.myActual}</dd>
					</div>
					{#if c.hasPartner}
						<div class="report-stat">
							<dt class="report-stat-label">Partner spend</dt>
							<dd class="report-stat-value">{c.partnerActual}</dd>
						</div>
						<div class="report-stat">
							<dt class="report-stat-label">Your plan</dt>
							<dd class="report-stat-value">{c.myPlanned}</dd>
						</div>
						<div class="report-stat">
							<dt class="report-stat-label">Partner plan</dt>
							<dd class="report-stat-value">{c.partnerPlanned}</dd>
						</div>
					{/if}
				</dl>
				{#if c.hasPartner && c.mySharePct > 0}
					<p class="mt-4 text-sm text-muted-foreground">You covered {formatFloat(c.mySharePct, 0)}% of household spending this month.</p>
				{/if}
			{:else}
				<p class="report-card-empty mt-4">Link a household partner to see split analytics.</p>
			{/if}
		</article>
	{:else if cardID === 'cash-flow'}
		{@const c = vm.cashFlow}
		<article class="report-card glass-card p-5 md:p-6 card-hover">
			<CardHeader title="Cash flow" desc="Inflows and outflows" />
			{#if c.available}
				<p class="report-card-hero mt-4 spring-pop" data-motion="spring">{c.latestNet}</p>
				<p class="text-sm text-muted-foreground">Net this month</p>
				<dl class="report-stat-grid mt-4">
					<div class="report-stat">
						<dt class="report-stat-label">Income</dt>
						<dd class="report-stat-value">{c.latestIncome}</dd>
					</div>
					<div class="report-stat">
						<dt class="report-stat-label">Expenses</dt>
						<dd class="report-stat-value">{c.latestExpenses}</dd>
					</div>
				</dl>
				{#if c.changeLabel}<p class={'mt-2 ' + reportChangeClass(c.changePositive)}>{c.changeLabel}</p>{/if}
				<div class="report-card-chart mt-4 min-h-[180px]">{@render chartOrPlaceholder(cashFlowChart)}</div>
			{:else}
				<p class="report-card-empty mt-4">Cash flow trends appear once salary and expenses are tracked.</p>
			{/if}
		</article>
	{/if}
{/snippet}

{#snippet toolbarActions()}
	<NativeButton class="btn-secondary reports-customize-btn px-4" data-testid="reports-customize-button" onclick={() => (store.showCustomize = true)}>
		Customize
	</NativeButton>
{/snippet}

<svelte:window onkeydown={(e) => store.showCustomize && e.key === 'Escape' && store.closeCustomize()} />

<div class="app-page-content vigil-deck-page reports-page reports-modern-page">
	<vigil.ModernPageHeader title="Reports" actions={toolbarActions} />
	<div>
		<SegmentedControl items={reportTabs()} activePath={vm.activePath} />
	</div>
	{#if vm.hasLoadError}
		<div class="glass-card p-6 mt-6" role="alert">
			<p class="font-semibold">Could not load reports</p>
			<p class="mt-2 text-sm text-muted-foreground">{vm.errorMessage}</p>
		</div>
	{/if}
	<div class="reports-grid mt-6 grid gap-4 sm:grid-cols-2" {@attach staggerOnMount(':scope > article', 45)} {@attach heroCountUp}>
		{#each DefaultCardOrder as cardID (cardID)}
			{#if store.cardVisible(cardID)}
				<div class={reportCardSlotClass(isWideCard(cardID))} data-report-card={cardID} style={store.cardOrderStyle(cardID)}>
					{@render card(cardID)}
				</div>
			{/if}
		{/each}
	</div>
	{#if store.ready && store.visibleCount() === 0}
		<div class="empty-state glass-card mt-6 p-8 md:p-10">
			<div class="empty-state-icon" aria-hidden="true">
				<VigIcon class="empty-state-vig mx-auto" />
			</div>
			<h2 class="empty-state-title">Nothing to show here</h2>
			<p class="empty-state-desc">Every card on this tab is hidden. Bring back the ones you care about.</p>
			<NativeButton class="btn-primary empty-state-action mt-6 inline-flex w-auto px-6" onclick={() => (store.showCustomize = true)}>Customize cards</NativeButton>
		</div>
	{/if}
	{#if store.showCustomize}
		<div class="portfolio-modal reports-customize-modal" in:fade={{ duration: 240 }} out:fade={{ duration: 160 }}>
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div class="portfolio-modal-backdrop" onclick={() => store.closeCustomize()}></div>
			<div class="portfolio-modal-panel glass-card p-6 md:p-8" role="dialog" aria-modal="true" aria-labelledby="reports-customize-title">
				<div class="reports-customize-header">
					<div>
						<h2 id="reports-customize-title" class="text-xl font-bold">Customize dashboard</h2>
						<p class="mt-1 text-sm text-muted-foreground">Reorder cards or hide ones you do not need.</p>
					</div>
					<NativeButton class="pines-modal-close" aria-label="Close" onclick={() => store.closeCustomize()}>
						<X class="h-5 w-5" data-lucide="icon" />
					</NativeButton>
				</div>
				<p class="reports-customize-hint mt-4 text-xs font-semibold text-muted-foreground">Drag controls reorder globally; eye toggles visibility</p>
				<ul class="reports-customize-list mt-4 space-y-2">
					{#each store.prefs.order as cardId, index (cardId)}
						<li class="reports-customize-row glass-card px-4 py-3 row-hover card-hover transition">
							<div class="reports-customize-row-main">
								<span class="reports-customize-label">{store.cardLabel(cardId)}</span>
								{#if store.isHidden(cardId)}
									<span class="reports-customize-hidden-badge">Hidden</span>
								{/if}
							</div>
							<div class="reports-customize-actions">
								<NativeButton class="reports-customize-icon-btn" aria-label="Move up" disabled={index === 0} onclick={() => store.moveCard(index, -1)}>↑</NativeButton>
								<NativeButton
									class="reports-customize-icon-btn"
									aria-label="Move down"
									disabled={index === store.prefs.order.length - 1}
									onclick={() => store.moveCard(index, 1)}>↓</NativeButton
								>
								<button type="button" class="reports-customize-toggle" onclick={() => store.toggleCard(cardId)}>
									{store.isHidden(cardId) ? 'Show' : 'Hide'}
								</button>
							</div>
						</li>
					{/each}
				</ul>
				<div class="reports-customize-footer mt-6 flex flex-wrap gap-3">
					<NativeButton class="btn-secondary px-5" onclick={() => store.resetPreferences()}>Reset to default</NativeButton>
					<NativeButton class="btn-primary px-5" onclick={() => store.closeCustomize()}>Done</NativeButton>
				</div>
			</div>
		</div>
	{/if}
</div>
