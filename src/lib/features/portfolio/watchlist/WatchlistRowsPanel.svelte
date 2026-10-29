<script lang="ts">
	// pages/portfolio/subpages.templ WatchlistRowsPanel + watchlistRow. Rows are
	// ordered by a TanStack Table sorted row model (the Alpine applySort DOM
	// reorder); `quotes` overlays the 20s poll's price cells by row id, as the
	// out-of-band swaps did. Like Go, the sort keys stay those of the page load.
	import { createSortedRowModel, createTable, rowSortingFeature, tableFeatures } from '@tanstack/svelte-table';
	import EChart from '#lib/charts/EChart.svelte';
	import { sparkline } from '#lib/charts/index.js';
	import { formatFloat } from '#lib/format.js';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SentimentBadge from '#lib/components/norviq/SentimentBadge.svelte';
	import VigMark from '#lib/components/norviq/VigMark.svelte';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import SentimentRollup from '../SentimentRollup.svelte';
	import WatchlistQuote from './WatchlistQuote.svelte';
	import { watchlistComparators, type WatchlistSort } from './sort.js';
	import type { WatchlistQuoteVM, WatchlistRowVM, WatchlistViewModel } from './types.js';

	let {
		vm,
		rows,
		sort,
		quotes,
		onedit,
		onremove
	}: {
		vm: WatchlistViewModel;
		rows: WatchlistRowVM[];
		sort: WatchlistSort;
		quotes: Map<string, WatchlistQuoteVM>;
		onedit: (row: WatchlistRowVM) => void;
		onremove: (row: WatchlistRowVM) => void;
	} = $props();

	const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() });

	const table = createTable({
		features,
		columns: (['name', 'gains', 'weight'] as const).map((id) => ({
			id,
			accessorFn: (row: WatchlistRowVM) => row.symbol,
			sortFn: (a: { original: WatchlistRowVM }, b: { original: WatchlistRowVM }) => watchlistComparators[id](a.original, b.original)
		})),
		get data() {
			return rows;
		},
		getRowId: (row) => row.id,
		get state() {
			return { sorting: [{ id: sort, desc: false }] };
		}
	});

	const sorted = $derived(table.getRowModel().rows.map((r) => r.original));
	const f6 = (v: number) => formatFloat(v, 6);
</script>

{#if rows.length > 0}
	<SentimentRollup vm={vm.sentiment} />
	<vigil.Panel class="watchlist-table overflow-x-auto p-0">
		<div class="overview-watchlist-header watchlist-table-header">
			<span>Symbol</span>
			<span>Trend</span>
			<span>Last</span>
			<span>Net Chg</span>
			<span>Chg %</span>
			<span>Open</span>
			<span>Prev Close</span>
			<span>High</span>
			<span>Low</span>
			<span title="Portfolio weight when held; — if not held">Wt</span>
			<span></span>
			<span></span>
		</div>
		<div class="overview-watchlist-rows vigil-dense-list">
			{#each sorted as row (row.id)}
				{@const spark = row.sparkline ? sparkline(row.sparklineID, row.sparkline) : null}
				<div
					class="overview-watchlist-row watchlist-table-row"
					id={'watchlist-row-' + row.id}
					data-symbol={row.symbol}
					data-held={String(row.isHeld)}
					data-gain={f6(row.rawGain)}
					data-weight={f6(row.rawWeight)}
					data-daypct={f6(row.rawDayChangePct)}
				>
					<a href={row.detailURL} class="overview-watchlist-symbol font-semibold">
						{row.symbol}
						<SentimentBadge vm={row.sentiment} />
					</a>
					<div class="overview-watchlist-spark portfolio-row-spark">
						{#if spark}<EChart {...spark} />{/if}
					</div>
					<WatchlistQuote row={quotes.get(row.id) ?? row} />
					{#if row.isHeld}
						<span class="overview-watchlist-weight text-sm tabular-nums text-muted-foreground" title="Portfolio weight">{row.weightLabel}</span>
					{:else}
						<span class="overview-watchlist-weight text-sm tabular-nums text-muted-foreground" title="Not held in portfolio">—</span>
					{/if}
					<NativeButton
						class="watchlist-edit-btn"
						title="Edit note"
						data-tui-dialog-trigger=""
						data-tui-dialog-target="watchlist-edit-dialog"
						onclick={() => onedit(row)}>Edit</NativeButton
					>
					<NativeButton class="watchlist-remove-btn" aria-label={'Remove ' + row.symbol} onclick={() => onremove(row)}>Remove</NativeButton>
				</div>
			{/each}
		</div>
	</vigil.Panel>
{:else}
	<div class="watchlist-empty glass-card p-8 text-center">
		<VigMark />
		<h2 class="empty-state-title mt-4">Your watchlist is empty</h2>
		<p class="empty-state-desc mt-2">Search for a symbol and add it here to track quotes and news.</p>
		<dialog.Trigger for="watchlist-add-dialog" class="btn-primary empty-state-action mt-6 inline-flex w-auto px-6">Add symbol</dialog.Trigger>
	</div>
{/if}
