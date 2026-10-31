<script lang="ts">
	// pages/portfolio/holdings.templ HoldingsPage (+ scripts.js holdingsPage()).
	import { goto } from '$app/navigation';
	import { createQuery } from '@tanstack/svelte-query';
	import {
		columnFilteringFeature,
		createFilteredRowModel,
		createSortedRowModel,
		createTable,
		rowSortingFeature,
		tableFeatures
	} from '@tanstack/svelte-table';
	import { onMount } from 'svelte';
	import {
		NativeButton,
		PilotFollowingBanner,
		PrimaryButton,
		SecondaryButton,
		SelectField
	} from '#lib/components/norviq/index.js';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { staggerOnMount } from '#lib/motion.js';
	import QuoteRefreshStatus from '#lib/features/portfolio/QuoteRefreshStatus.svelte';
	import AddPositionPanel from '#lib/features/portfolio/holdings/AddPositionPanel.svelte';
	import HeroCard from '#lib/features/portfolio/holdings/HeroCard.svelte';
	import PositionActionPanel from '#lib/features/portfolio/holdings/PositionActionPanel.svelte';
	import PositionRow from '#lib/features/portfolio/holdings/PositionRow.svelte';
	import { positionAction } from '#lib/features/portfolio/holdings/client.js';
	import {
		HOLDINGS_SORT_KEY,
		categoryFilter,
		holdingsComparators,
		parseHoldingsSort,
		type HoldingsSort
	} from '#lib/features/portfolio/holdings/sort.js';
	import type {
		AddPositionFormVM,
		PositionActionResult,
		PositionQuoteVM,
		PositionRowVM
	} from '#lib/features/portfolio/holdings/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);

	// holdingsPage(): filter + sort (persisted), applied after mount.
	let filter = $state('all');
	let sort = $state<HoldingsSort>('name');
	onMount(() => {
		try {
			sort = parseHoldingsSort(localStorage.getItem(HOLDINGS_SORT_KEY));
		} catch {
			/* storage blocked */
		}
	});
	function applySort() {
		try {
			localStorage.setItem(HOLDINGS_SORT_KEY, sort);
		} catch {
			/* storage blocked */
		}
	}

	const features = tableFeatures({
		rowSortingFeature,
		columnFilteringFeature,
		sortedRowModel: createSortedRowModel(),
		filteredRowModel: createFilteredRowModel()
	});
	type Row = { original: PositionRowVM };
	const table = createTable({
		features,
		columns: [
			...(['name', 'gains', 'weight'] as const).map((id) => ({
				id,
				accessorFn: (row: PositionRowVM) => row.symbol,
				sortFn: (a: Row, b: Row) => holdingsComparators[id](a.original, b.original)
			})),
			{
				id: 'category',
				accessorFn: (row: PositionRowVM) => row.category,
				filterFn: (row: Row, _id: string, value: string) =>
					categoryFilter(row.original.category, value)
			}
		],
		get data() {
			return vm.positions;
		},
		getRowId: (row) => row.id,
		get state() {
			return {
				sorting: [{ id: sort, desc: false }],
				columnFilters: [{ id: 'category', value: filter }]
			};
		}
	});
	const visibleRows = $derived(table.getRowModel().rows.map((r) => r.original));

	// Quote poll: hx-trigger "load, every 20s [visible], visibilitychange [visible]".
	const quotesQuery = createQuery(() => ({
		queryKey: ['portfolio-holdings-quotes'],
		queryFn: async (): Promise<{ quotes: PositionQuoteVM[]; updatedAt: string } | null> => {
			const res = await fetch('/portfolio/quotes', { headers: { accept: 'application/json' } });
			if (!res.ok) return null;
			return await res.json();
		},
		refetchInterval: 20_000,
		refetchOnWindowFocus: true,
		staleTime: 0
	}));
	const quotes = $derived(new Map((quotesQuery.data?.quotes ?? []).map((q) => [q.id, q])));
	const updatedAt = $derived(quotesQuery.data?.updatedAt ?? '');

	// Dialogs. The add panel starts from the server form; a failed submit
	// replaces it (hx-swap outerHTML). The action panel holds whatever the
	// last row action answered (hx-target #position-action-panel).
	let addOverride = $state<AddPositionFormVM | null>(null);
	const addForm = $derived(addOverride ?? vm.addPosition);
	// svelte-ignore state_referenced_locally
	let addOpen = $state(data.vm.showAddPosition);
	let actionPanel = $state<Exclude<
		PositionActionResult,
		{ redirect: string } | { panel: 'add' }
	> | null>(null);

	async function apply(result: PositionActionResult | null) {
		if (!result) return;
		if ('redirect' in result) {
			// HX-Redirect was a full navigation; close what it would have discarded.
			dialog.closeDialog('add-position-dialog');
			dialog.closeDialog('position-action-dialog');
			addOverride = null;
			await goto(result.redirect, { invalidateAll: true });
			return;
		}
		if (result.panel === 'add') addOverride = result.form;
		else actionPanel = result;
	}

	async function openAction(url: string) {
		dialog.openDialog('position-action-dialog');
		await apply(await positionAction(url));
	}

	const scopeOptions = $derived(
		vm.portfolios.map((item) => ({
			value: item.id,
			label: item.name + ' (' + item.mode + ')',
			// EqualFold: /v1/portfolios lists upper-case UUIDs, links may carry lower-case.
			selected: item.id.toLowerCase() === vm.selectedPortfolio.toLowerCase()
		}))
	);
</script>

<svelte:head>
	<title>Portfolio - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

{#snippet toolbarActions()}
	{#if vm.portfolios.length > 0}
		<SelectField
			id="portfolio-scope"
			name="portfolio"
			class="min-w-48"
			options={scopeOptions}
			aria-label="Portfolio"
			onchange={(e) =>
				(window.location.href =
					'/portfolio?portfolio=' + encodeURIComponent(e.currentTarget.value))}
		/>
	{/if}
	<SecondaryButton href={'/portfolio/one-page?portfolio=' + vm.selectedPortfolio}
		>One page</SecondaryButton
	>
	<SecondaryButton href="/portfolios">Manage</SecondaryButton>
	<PrimaryButton
		class="portfolio-add-btn"
		data-guide="holding-add"
		onclick={() => dialog.openDialog('add-position-dialog')}
	>
		Add position
	</PrimaryButton>
{/snippet}

<div class="app-page-content vigil-deck-page portfolio-page portfolio-modern-page">
	{#if vm.hasLoadError}
		<div class="portfolio-error glass-card" role="alert">
			<p class="font-semibold">Could not load portfolio</p>
			<p class="mt-2 text-sm text-muted-foreground">{vm.errorMessage}</p>
			<a href="/portfolio" class="portfolio-retry-btn mt-4 inline-block">Try again</a>
		</div>
	{:else}
		<vigil.ModernPageHeader title="Holdings" actions={toolbarActions} />
		{#if vm.followingPilot}
			<PilotFollowingBanner vm={vm.followingPilot} />
		{/if}
		<!-- The figure first, then its supporting KPIs as type — the iOS order. -->
		<HeroCard {vm} />
		<vigil.MetricStrip>
			<vigil.Metric label="Shares" value={vm.totalShares} />
			<vigil.Metric label="Avg / position" value={vm.avgPositionValue} />
			<vigil.Metric label="Cash" value={vm.cashBalance} />
		</vigil.MetricStrip>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="portfolio-filter-row">
				{#each vm.assetFilters as f (f.id)}
					<button
						type="button"
						class={['portfolio-filter-btn', filter === f.id && 'portfolio-filter-btn-active']}
						onclick={() => (filter = f.id)}>{f.label}</button
					>
				{/each}
			</div>
			<div class="portfolio-sort flex items-center gap-2 text-subhead text-muted-foreground">
				<span class="whitespace-nowrap">Sort</span>
				<SelectField
					id="portfolio-sort"
					name="sort"
					options={[
						{ value: 'name', label: 'Name' },
						{ value: 'gains', label: 'Gains' },
						{ value: 'weight', label: '% of portfolio' }
					]}
					aria-label="Sort holdings"
					bind:value={() => sort, (v) => (sort = parseHoldingsSort(typeof v === 'string' ? v : ''))}
					onchange={applySort}
				/>
			</div>
		</div>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<QuoteRefreshStatus id="portfolio-quotes-updated" {updatedAt} />
		</div>
		<!-- One card, flat rows with hairlines between them (the iOS holdings list). -->
		<vigil.Panel class="portfolio-positions-panel">
			<div class="portfolio-positions" {@attach staggerOnMount(':scope > div', 28)}>
				{#if vm.positions.length === 0}
					<div class="portfolio-empty empty-state-inline">
						<p class="empty-state-inline-title">No positions</p>
						<p class="empty-state-inline-desc">Add your first holding or change your filter.</p>
						<NativeButton
							class="btn-primary mt-4"
							onclick={() => dialog.openDialog('add-position-dialog')}>Add position</NativeButton
						>
					</div>
				{:else}
					{#each visibleRows as row (row.id)}
						<div>
							<PositionRow
								{row}
								quote={quotes.get(row.id)}
								isPro={vm.isPro}
								rangeKey={vm.selectedTimeRange}
								onaction={openAction}
							/>
						</div>
					{/each}
				{/if}
			</div>
		</vigil.Panel>
		<dialog.Dialog id="add-position-dialog" bind:open={addOpen}>
			<dialog.Content class="glass-card vigil-modal-panel border-0 sm:max-w-2xl">
				<AddPositionPanel
					form={addForm}
					onsubmit={async (form) =>
						apply(await positionAction('/portfolio/positions', 'POST', form))}
				/>
			</dialog.Content>
		</dialog.Dialog>
		<dialog.Dialog id="position-action-dialog">
			<dialog.Content class="glass-card vigil-modal-panel border-0 sm:max-w-2xl">
				{#if actionPanel}
					<PositionActionPanel
						result={actionPanel}
						onsubmit={async (form, method, url) => apply(await positionAction(url, method, form))}
						onrequest={async (method, url) => apply(await positionAction(url, method))}
					/>
				{:else}
					<div id="position-action-panel"></div>
				{/if}
			</dialog.Content>
		</dialog.Dialog>
	{/if}
</div>
