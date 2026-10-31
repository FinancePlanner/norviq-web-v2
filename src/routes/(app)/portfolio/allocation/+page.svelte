<script lang="ts">
	// pages/portfolio/subpages.templ AllocationPage (allocationBody and helpers).
	import { page } from '$app/state';
	import EChart from '#lib/charts/EChart.svelte';
	import { allocationPie } from '#lib/charts/index.js';
	import {
		Button,
		EmptyState,
		Field,
		Icon,
		NativeButton,
		SelectField
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import PortfolioListPanel from '#lib/features/portfolio/analytics/PortfolioListPanel.svelte';
	import {
		emptyListForm,
		type AllocationMetricVM,
		type ListFormVM,
		type PortfolioListRowVM
	} from '#lib/features/portfolio/analytics/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);

	// Alpine x-data="{ mode: 'cost' }" with x-init reading ?view=lists.
	let mode = $state(page.url.searchParams.get('view') === 'lists' ? 'lists' : 'cost');

	const costChart = $derived(
		vm.costChart
			? allocationPie(vm.costChart.chartID, vm.costChart.labels, vm.costChart.weights)
			: null
	);
	const sectorChart = $derived(
		vm.sectorChart
			? allocationPie(vm.sectorChart.chartID, vm.sectorChart.labels, vm.sectorChart.weights)
			: null
	);

	// Alpine allocationHoldingsTable (assets/scripts.js).
	let query = $state('');
	let sort = $state('weight');
	const filteredRows = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const rows = q
			? vm.costRows.filter((row) => row.label.toLowerCase().includes(q))
			: [...vm.costRows];
		if (sort === 'ticker') return rows.sort((a, b) => a.label.localeCompare(b.label));
		if (sort === 'value') return rows.sort((a, b) => b.rawValue - a.rawValue);
		return rows.sort((a, b) => b.rawPercent - a.rawPercent);
	});

	// GET /portfolio/allocation/list[/{id}] filled #list-action-panel; the
	// panel is keyed so each open starts from fresh values.
	let listForm = $state<ListFormVM>(emptyListForm());
	let listFormKey = $state(0);
	function openListForm(list?: PortfolioListRowVM) {
		listForm = list
			? {
					listID: list.id,
					name: list.name,
					isEdit: true,
					isDefault: list.isDefault,
					canDelete: list.canDelete,
					error: ''
				}
			: emptyListForm();
		listFormKey++;
		dialog.openDialog('list-action-dialog');
	}

	const metricIcons: Record<string, string> = {
		'Market value': 'wallet',
		'Cost basis': 'receipt',
		'Unrealized P/L': 'trending-up-down',
		Positions: 'rows-3',
		Sectors: 'chart-pie',
		'Largest holding': 'target',
		'Largest sector': 'network'
	};
	const tipIcon = (tone: string) =>
		tone === 'warning' || tone === 'danger'
			? 'circle-alert'
			: tone === 'success'
				? 'badge-info'
				: 'info';
	function tipLabel(tone: string): string {
		switch (tone) {
			case 'warning':
				return 'Action needed';
			case 'danger':
				return 'Risk';
			case 'success':
				return 'Healthy';
			default:
				return 'Insight';
		}
	}
	const sortOptions = [
		{ value: 'weight', label: 'Weight' },
		{ value: 'value', label: 'Value' },
		{ value: 'ticker', label: 'Ticker' }
	];
</script>

<svelte:head>
	<title>Allocation - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

{#snippet quickActions()}
	<div class="allocation-actions" aria-label="Allocation actions">
		<Button href="/portfolio" class="allocation-action allocation-action-primary">
			<Icon name="plus" class="h-4 w-4" />
			<span>Add holding</span>
		</Button>
		<Button href="/onboarding/import/csv" variant="outline" class="allocation-action">
			<Icon name="upload" class="h-4 w-4" />
			<span>Import CSV</span>
		</Button>
		<Button href="/settings/export" variant="outline" class="allocation-action">
			<Icon name="download" class="h-4 w-4" />
			<span>Export</span>
		</Button>
		<Button href="/portfolio/targets" variant="outline" class="allocation-action">
			<Icon name="target" class="h-4 w-4" />
			<span>Targets</span>
		</Button>
		<Button href="/reports/portfolio" variant="outline" class="allocation-action">
			<Icon name="list-filter-plus" class="h-4 w-4" />
			<span>Rebalance</span>
		</Button>
	</div>
{/snippet}

{#snippet inlineMeta(metrics: AllocationMetricVM[])}
	<div class="allocation-inline-meta">
		{#each metrics as metric, i (i)}
			<div class={'allocation-inline-metric allocation-tone-' + metric.tone}>
				<span>{metric.label}</span>
				<strong>{metric.value}</strong>
				{#if metric.delta !== ''}
					<em>{metric.delta}</em>
				{/if}
			</div>
		{/each}
	</div>
{/snippet}

{#snippet costPanel()}
	{#if vm.hasCostData}
		<section class="allocation-panel allocation-donut-panel">
			<div class="allocation-panel-heading">
				<div>
					<h2>Cost basis breakdown</h2>
					<p>Top holdings are shown individually; smaller positions are grouped as Other.</p>
				</div>
			</div>
			{#if vm.costMeta.length > 0}
				{@render inlineMeta(vm.costMeta)}
			{/if}
			<div class="allocation-chart-wrap">
				{#if costChart}<EChart {...costChart} />{/if}
				{#if vm.totalValue !== ''}
					<div class="allocation-chart-center" aria-hidden="true">
						<span>Market value</span>
						<strong>{vm.totalValue}</strong>
					</div>
				{/if}
			</div>
			<ul class="allocation-legend">
				{#each vm.costRows as row, i (i)}
					<li class="allocation-legend-row">
						<span class="allocation-legend-dot" style={'background:' + row.color}></span>
						<span class="allocation-legend-label">{row.label}</span>
						<span class="allocation-legend-value">{row.value}</span>
						<span class="allocation-legend-percent">{row.percent}</span>
					</li>
				{/each}
			</ul>
			{#if vm.costOtherCount > 0}
				<div class="allocation-other-footer">
					<strong>Donut grouping</strong>
					<span
						>{`${vm.costOtherCount} smaller positions grouped as Other · ${vm.costOtherWeight} combined · ${vm.costOtherValue}`}</span
					>
				</div>
			{/if}
		</section>
	{:else}
		<EmptyState
			title="No positions yet"
			description="Add positions to your portfolio to see how your wealth is distributed."
			actionLabel="Add position"
			actionHref="/portfolio"
		/>
	{/if}
{/snippet}

{#snippet sectorPanel()}
	{#if vm.hasSectorData}
		<div class="allocation-layout grid gap-6 lg:grid-cols-2">
			<section class="allocation-panel">
				<div class="allocation-panel-heading">
					<div>
						<h2>Sector exposure</h2>
						<p>Portfolio value grouped by reported sector metadata.</p>
					</div>
				</div>
				{#if vm.sectorMeta.length > 0}
					{@render inlineMeta(vm.sectorMeta)}
				{/if}
				<div class="allocation-chart-wrap">
					{#if sectorChart}<EChart {...sectorChart} />{/if}
				</div>
			</section>
			<section class="allocation-panel">
				<div class="allocation-panel-heading">
					<div>
						<h2>Sector weights</h2>
						<p>Weight compared with a simple equal-sector baseline.</p>
					</div>
				</div>
				<div class="allocation-sector-table">
					<div class="allocation-sector-header">
						<span>Sector</span>
						<span>Weight</span>
						<span>vs equal</span>
					</div>
					{#each vm.sectorRows as row, i (i)}
						<div class="allocation-sector-row">
							<div class="allocation-sector-name">
								<span class="allocation-legend-dot" style={'background:' + row.color}></span>
								<span>{row.label}</span>
							</div>
							<span class="allocation-sector-weight">{row.percent}</span>
							<span class="allocation-sector-overweight">{row.overweight}</span>
						</div>
					{/each}
				</div>
			</section>
		</div>
	{:else}
		<EmptyState
			title="No sector data yet"
			description="Sector breakdown appears once your holdings have sector metadata."
			actionLabel="View holdings"
			actionHref="/portfolio"
		/>
	{/if}
{/snippet}

{#snippet listsBody()}
	<div id="portfolio-lists-panel">
		{#if vm.hasLists}
			<div class="allocation-list-toolbar mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2>Portfolio lists</h2>
					<p>Organize holdings into separate portfolios.</p>
				</div>
				<NativeButton
					class="btn-secondary px-4 py-2 text-sm"
					data-tui-dialog-trigger=""
					data-tui-dialog-target="list-action-dialog"
					onclick={() => openListForm()}
				>
					New list
				</NativeButton>
			</div>
			<div class="portfolio-lists-grid grid gap-4 sm:grid-cols-2">
				{#each vm.portfolioLists as list (list.id)}
					<div class="portfolio-list-card allocation-panel p-5">
						<div class="flex items-start justify-between gap-3">
							<a href={list.holdingsURL} class="min-w-0 flex-1 transition hover:brightness-[1.02]">
								<p class="portfolio-list-name font-semibold">{list.name}</p>
								{#if list.isDefault}
									<span class="portfolio-list-badge">Default</span>
								{/if}
								{#if list.totalValue !== ''}
									<p class="portfolio-list-value mt-2 font-medium">{list.totalValue}</p>
								{/if}
								<p class="portfolio-list-meta mt-2 text-sm text-muted-foreground">
									{list.positionCount}
								</p>
							</a>
							<NativeButton
								class="btn-secondary shrink-0 px-3 py-1 text-xs"
								data-tui-dialog-trigger=""
								data-tui-dialog-target="list-action-dialog"
								onclick={() => openListForm(list)}
							>
								Edit
							</NativeButton>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="allocation-panel p-8 text-center">
				<EmptyState
					title="No portfolio lists"
					description="Create lists to organize positions separately from your default portfolio."
					actionLabel="New list"
					actionHref="#"
				/>
				<NativeButton
					class="btn-primary mt-4 inline-flex w-auto px-6"
					data-tui-dialog-trigger=""
					data-tui-dialog-target="list-action-dialog"
					onclick={() => openListForm()}
				>
					New list
				</NativeButton>
			</div>
		{/if}
	</div>
{/snippet}

<div class="app-page-content vigil-deck-page portfolio-allocation-page allocation-modern-page">
	<div class="allocation-shell">
		<vigil.ModernPageHeader title="Allocation" subtitle={vm.subtitle} actions={quickActions} />
		{#if vm.loadError}
			<div class="allocation-alert mt-4" role="status">
				<p class="font-semibold">Some allocation data could not be loaded.</p>
				<p>Charts and notes use the data that is currently available.</p>
			</div>
		{/if}
	</div>
	<div class="allocation-mode-workspace">
		<div class="allocation-workspace">
			<div class="allocation-left-stack">
				<section class="allocation-panel allocation-analytics-panel">
					<div class="allocation-panel-heading">
						<div>
							<h2>Portfolio analytics</h2>
							<p>Current value, cost basis, concentration, and metadata coverage.</p>
						</div>
					</div>
					{#if vm.summaryMetrics.length > 0}
						<div class="allocation-metric-strip">
							{#each vm.summaryMetrics as metric, i (i)}
								<div class={'allocation-metric allocation-tone-' + metric.tone}>
									<span class="allocation-metric-icon" aria-hidden="true">
										<Icon name={metricIcons[metric.label] ?? 'circle-gauge'} class="h-4 w-4" />
									</span>
									<div class="allocation-metric-content">
										<span class="allocation-metric-label">{metric.label}</span>
										<strong class="allocation-metric-value">{metric.value}</strong>
										{#if metric.delta !== ''}
											<span class="allocation-metric-delta">{metric.delta}</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else if vm.totalValue !== ''}
						<p class="portfolio-allocation-total mt-2 text-2xl font-semibold">{vm.totalValue}</p>
					{/if}
				</section>
				{#if vm.tips.length > 0}
					<section class="allocation-notes-panel" aria-label="Concentration review">
						<div class="allocation-panel-heading">
							<div>
								<h2>Concentration review</h2>
								<p>Actionable checks from current weights and metadata quality.</p>
							</div>
						</div>
						<div class="allocation-tips-grid">
							{#each vm.tips as tip, i (i)}
								<article class={'allocation-tip allocation-tone-' + tip.tone}>
									<span class="allocation-tip-icon" aria-hidden="true">
										<Icon name={tipIcon(tip.tone)} class="h-4 w-4" />
									</span>
									<div class="allocation-tip-body">
										<span class="allocation-tip-kicker">{tipLabel(tip.tone)}</span>
										<h3>{tip.title}</h3>
										<p>{tip.detail}</p>
										{#if tip.value !== '' || tip.action !== ''}
											<div class="allocation-tip-footer">
												{#if tip.value !== ''}
													<strong>{tip.value}</strong>
												{/if}
												{#if tip.action !== ''}
													<small>{tip.action}</small>
												{/if}
											</div>
										{/if}
									</div>
								</article>
							{/each}
						</div>
					</section>
				{/if}
				<div class="allocation-mode-card">
					<div class="filter-chips" role="group" aria-label="Allocation mode">
						<NativeButton
							class={'filter-chip ' + (mode === 'cost' ? 'filter-chip-active' : '')}
							onclick={() => (mode = 'cost')}>Cost basis</NativeButton
						>
						<NativeButton
							class={'filter-chip ' + (mode === 'sector' ? 'filter-chip-active' : '')}
							onclick={() => (mode = 'sector')}>Sector</NativeButton
						>
						<NativeButton
							class={'filter-chip ' + (mode === 'lists' ? 'filter-chip-active' : '')}
							onclick={() => (mode = 'lists')}>Lists</NativeButton
						>
					</div>
				</div>
			</div>
			<div class="allocation-right-stack">
				<div style:display={mode === 'cost' ? undefined : 'none'}>
					{@render costPanel()}
				</div>
				<div style:display={mode === 'sector' ? undefined : 'none'}>
					{@render sectorPanel()}
				</div>
				<div style:display={mode === 'lists' ? undefined : 'none'}>
					{@render listsBody()}
				</div>
			</div>
		</div>
		<div class="allocation-mode-detail" style:display={mode === 'cost' ? undefined : 'none'}>
			{#if vm.hasCostData}
				<section class="allocation-full-holdings">
					<div class="allocation-table-toolbar">
						<div>
							<h2>All holdings</h2>
							<p>
								{`Search and sort ${vm.costRows.length} positions by ticker, value, or weight.`}
							</p>
						</div>
						<div class="allocation-table-controls">
							<label class="allocation-search">
								<span class="sr-only">Search holdings</span>
								<Icon name="search" class="h-4 w-4" />
								<Field type="search" placeholder="Search ticker" bind:value={query} />
							</label>
							<label class="allocation-sort">
								<span>Sort</span>
								<SelectField name="" options={sortOptions} bind:value={sort} />
							</label>
						</div>
					</div>
					<div class="allocation-table-wrap">
						<div class="allocation-holdings-table">
							<div class="allocation-holdings-header">
								<span>Ticker</span>
								<span>Company</span>
								<span>Sector</span>
								<span>Value</span>
								<span>Weight</span>
							</div>
							{#each filteredRows as row (row.label)}
								<div class="allocation-holdings-row">
									<span class="allocation-table-symbol">
										<span class="allocation-legend-dot" style={'background:' + row.color}></span>
										<span>{row.label}</span>
									</span>
									<span class="allocation-table-muted">Not available</span>
									<span class="allocation-table-badge">Unclassified</span>
									<span>{row.value}</span>
									<span>{row.percent}</span>
								</div>
							{/each}
						</div>
						<p
							class="allocation-table-empty"
							style:display={filteredRows.length === 0 ? undefined : 'none'}
						>
							No holdings match that search.
						</p>
					</div>
				</section>
			{/if}
		</div>
	</div>
	<dialog.Dialog id="list-action-dialog">
		<dialog.Content class="glass-card vigil-modal-panel border-0 p-6 sm:max-w-2xl md:p-8">
			{#key listFormKey}
				<PortfolioListPanel vm={listForm} />
			{/key}
		</dialog.Content>
	</dialog.Dialog>
</div>
