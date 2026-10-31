<script lang="ts">
	// /trading (internal/pages/trading/dashboard.templ), a desk prototype in Go
	// too. Kept as Go has it, oddities included (see docs/parity/planning-tools.md):
	//   - the range buttons and watchlist rows load the symbol's price chart;
	//     Go hx-got /portfolio/{symbol}/chart?range=… into #main-chart, whose
	//     chart tab ignores the range. Here they load the same price history
	//     (GET /v1/market/history) and draw the same chart.
	//   - the Buy form posts to /portfolio/positions (portfolio domain); the
	//     Short form posts to the literal "/portfolio/positions/{id}/sell".
	//   - the search box shows the watchlist search results in place of the
	//     table; their Add buttons target #watchlist-rows-panel, which this
	//     page does not have, so they do nothing (htmx targetError in Go).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import Field from '#lib/components/norviq/Field.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import EChart from '#lib/charts/EChart.svelte';
	import { wealthLine } from '#lib/charts/index.js';
	import {
		priceSeries,
		tradingChangeClass,
		tradingChangeClassForString,
		type PositionRow,
		type PriceSeries,
		type StockHistory,
		type WatchlistSearchResult
	} from '#lib/features/planning-tools/trading/types.js';

	let { data } = $props();
	const vm = $derived(data.vm);

	let series = $derived<PriceSeries | null>(data.vm.chart);
	const chart = $derived(
		series ? wealthLine('stock-price-chart', series.labels, series.values) : null
	);

	// updateOrderPanelFromRow: the hidden symbol inputs and both limit prices.
	let orderSymbol = $derived(data.vm.selectedSymbol);
	let buyPrice = $derived<string>(data.vm.selectedPrice);
	let shortPrice = $derived<string>(data.vm.selectedPrice);

	async function loadChart(symbol: string) {
		try {
			const res = await fetch(
				'/api/v1/market/history?symbol=' + encodeURIComponent(symbol.trim().toUpperCase())
			);
			if (!res.ok) return;
			series = priceSeries((await res.json()) as StockHistory[]);
		} catch (err) {
			console.warn('trading chart load failed', err);
		}
	}

	function selectRow(pos: PositionRow) {
		loadChart(pos.symbol);
		orderSymbol = pos.symbol;
		const clean = (pos.last || '').replace(/[^0-9.]/g, '');
		buyPrice = clean || '0';
		shortPrice = clean || '0';
	}

	// hx-get="/portfolio/watchlist/search" hx-trigger="input changed delay:200ms"
	let query = $state('');
	let lastQuery = '';
	let searching = $state(false);
	let results = $state<WatchlistSearchResult[]>([]);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	function oninput(e: Event) {
		const value = (e.currentTarget as HTMLInputElement).value;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			if (value === lastQuery) return;
			lastQuery = value;
			search(value);
		}, 200);
	}

	async function search(raw: string) {
		const q = raw.trim();
		query = q;
		searching = true;
		results = [];
		if (q === '') return;
		try {
			const res = await fetch('/api/v1/assets/search?limit=8&q=' + encodeURIComponent(q));
			const rows = res.ok
				? ((await res.json()) as { symbol?: string; name?: string; exchange?: string }[])
				: [];
			if (query !== q) return;
			results = (rows ?? [])
				.map((r) => ({
					symbol: (r.symbol ?? '').trim(),
					name: (r.name ?? '').trim(),
					exchange: (r.exchange ?? '').trim()
				}))
				.filter((r) => r.symbol !== '');
		} catch {
			results = [];
		}
	}
</script>

<svelte:head>
	<title>Trading - Norviq</title>
	<meta name="keywords" content="Norviq dashboard" />
	<meta name="description" content="Your Norviq financial dashboard." />
</svelte:head>

<div class="app-page-content vigil-canvas-page trading-modern-page">
	<vigil.ModernPageHeader title="Trading desk" />
	<div class="vigil-command-split trading-command-split">
		<div class="vigil-command-split-main">
			<vigil.Panel class="trading-chart-panel flex flex-1 flex-col border border-border p-4">
				<div class="mb-3 flex items-baseline justify-between px-2">
					<div>
						<div class="flex items-center gap-3">
							<span class="text-2xl font-semibold text-foreground">{vm.selectedSymbol}</span>
							<span class="text-2xl text-foreground tabular-nums">{vm.selectedPrice}</span>
						</div>
						<div class={'text-sm font-medium ' + tradingChangeClassForString(vm.selectedChange)}>
							{vm.selectedChange}
						</div>
					</div>
					<div class="flex gap-1 text-xs">
						<NativeButton
							class="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground"
							onclick={() => loadChart(vm.selectedSymbol)}>1D</NativeButton
						>
						<NativeButton
							class="rounded-full px-3 py-1 hover:bg-card"
							onclick={() => loadChart(vm.selectedSymbol)}>1W</NativeButton
						>
						<NativeButton
							class="rounded-full px-3 py-1 hover:bg-card"
							onclick={() => loadChart(vm.selectedSymbol)}>1M</NativeButton
						>
						<NativeButton
							class="rounded-full px-3 py-1 hover:bg-card"
							onclick={() => loadChart(vm.selectedSymbol)}>YTD</NativeButton
						>
					</div>
				</div>
				<div id="main-chart" class="min-h-[340px] flex-1 rounded-lg bg-muted p-2">
					{#if chart}<EChart {...chart} />{/if}
				</div>
				<div class="mt-2 flex justify-between px-2 text-[10px] text-muted-foreground">
					<div>Volume: -</div>
					<div class="opacity-60">Data via Finnhub / FMP · Click rows to change symbol</div>
				</div>
			</vigil.Panel>
			<vigil.Panel class="trading-order-panel border border-border p-5">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<div class="mb-2 text-xs font-semibold text-success">Buy</div>
						<form method="POST" action="/portfolio/positions" class="space-y-3">
							<input type="hidden" name="symbol" value={orderSymbol} />
							<div class="grid grid-cols-2 gap-3">
								<Field name="shares" label="Shares" type="number" value="100" step="1" />
								<Field
									name="buy_price"
									label="Limit Price"
									type="number"
									bind:value={buyPrice}
									step="0.01"
								/>
							</div>
							<NativeButton
								type="submit"
								class="w-full rounded-lg bg-success py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-success"
							>
								Buy {vm.selectedSymbol}
							</NativeButton>
						</form>
					</div>
					<div>
						<div class="mb-2 text-xs font-semibold text-danger">Short</div>
						<form method="POST" action="/portfolio/positions/{'{id}'}/sell" class="space-y-3">
							<input type="hidden" name="symbol" value={orderSymbol} />
							<div class="grid grid-cols-2 gap-3">
								<Field name="shares" label="Shares" type="number" value="50" step="1" />
								<Field
									name="price"
									label="Limit Price"
									type="number"
									bind:value={shortPrice}
									step="0.01"
								/>
							</div>
							<NativeButton
								type="submit"
								class="w-full rounded-lg bg-danger py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-danger"
							>
								Short {vm.selectedSymbol}
							</NativeButton>
						</form>
					</div>
				</div>
				<div id="trading-feedback" class="mt-3 min-h-[18px] text-center text-xs"></div>
			</vigil.Panel>
		</div>
		<vigil.CommandSplitAside>
			<vigil.Panel class="trading-watchlist-panel flex flex-col bg-muted p-4 text-foreground">
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-lg font-semibold">Watchlist</h2>
					<input
						type="text"
						placeholder="Search symbols..."
						class="w-48 rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
						{oninput}
					/>
				</div>
				<div
					id="watchlist-table"
					class="flex-1 overflow-auto rounded-lg border border-border bg-card/60"
				>
					{#if searching}
						{#if query === ''}
							<p class="pines-search-hint text-sm text-muted-foreground">Type to search symbols</p>
						{:else if results.length === 0}
							<p class="pines-search-hint text-sm text-muted-foreground">
								No matches for "{query}"
							</p>
						{:else}
							<ul class="pines-search-results mt-2">
								{#each results as row (row.symbol)}
									<li class="pines-search-result">
										<div>
											<p class="font-semibold">{row.symbol}</p>
											{#if row.name}
												<p class="text-sm text-muted-foreground">{row.name}</p>
											{/if}
										</div>
										<NativeButton class="btn-secondary px-3 py-1.5 text-sm">Add</NativeButton>
									</li>
								{/each}
							</ul>
						{/if}
					{:else}
						<vigil.DataTable>
							<thead>
								<tr>
									<th class="text-left">Symbol</th>
									<th class="text-right">Last</th>
									<th class="text-right">Net Chg</th>
									<th class="text-right">Chg %</th>
									<th class="text-right">Volume</th>
								</tr>
							</thead>
							<tbody>
								{#each vm.positions as pos, i (i)}
									<tr
										class="cursor-pointer transition-colors hover:bg-card/60"
										data-symbol={pos.symbol}
										data-last={pos.last}
										onclick={() => selectRow(pos)}
									>
										<td class="font-semibold text-foreground">{pos.symbol}</td>
										<td class="vigil-mono text-right tabular-nums">{pos.last}</td>
										<td class={'text-right tabular-nums ' + tradingChangeClass(pos.changePositive)}
											>{pos.netChg}</td
										>
										<td class={'text-right tabular-nums ' + tradingChangeClass(pos.changePositive)}
											>{pos.chgPct}</td
										>
										<td class="vigil-mono text-right text-muted-foreground tabular-nums"
											>{pos.volume}</td
										>
									</tr>
								{/each}
							</tbody>
						</vigil.DataTable>
					{/if}
				</div>
				<div class="mt-2 px-1 text-[10px] text-muted-foreground">
					Live data · Updates on interaction
				</div>
			</vigil.Panel>
		</vigil.CommandSplitAside>
	</div>
</div>
