// handlers.AppHandler.StockDetail for both v2 routes ([symbol] and
// [symbol]/[tab]), including the chi route-level feature gates.

import { error, type RequestEvent } from '@sveltejs/kit';
import { Feature } from '#lib/billing.js';
import { isValidStockTab } from '#lib/nav.js';
import { requireFeature } from '#lib/server/guards.js';
import { loadStockDetailViewModel } from './detail.server.js';
import { labelTitle } from './format.js';

// server.go: r.With(require…).Get("/portfolio/{symbol}/<tab>", StockDetail).
// chi matched these literally (case-sensitive); anything else fell through to
// /portfolio/{symbol}/{tab} with no route gate.
const routeGates: Record<string, [string, string]> = {
	builder: [Feature.MarketFundamentals, 'Stock fundamentals'],
	statements: [Feature.MarketFundamentals, 'Stock fundamentals'],
	ownership: [Feature.MarketFundamentals, 'Stock fundamentals'],
	analysis: [Feature.MarketFundamentals, 'Stock fundamentals'],
	forecast: [Feature.MarketFundamentals, 'Stock fundamentals'],
	compare: [Feature.PeerComparison, 'Peer comparison'],
	earnings: [Feature.EarningsText, 'Earnings']
};

/** normalizeStockDetailTab */
function normalizeTab(tab: string): string {
	const t = tab.trim().toLowerCase();
	return t === 'overview' ? '' : t;
}

export async function loadStockPage(event: RequestEvent, rawTab: string, isPro: boolean) {
	const gate = routeGates[rawTab];
	if (gate) await requireFeature(event, gate[0], gate[1]);

	const symbol = (event.params.symbol ?? '').trim().toUpperCase();
	const tab = normalizeTab(rawTab);
	if (!isValidStockTab(tab)) error(404, 'Not Found');

	const q = event.url.searchParams;
	const vm = await loadStockDetailViewModel(
		event,
		symbol,
		tab,
		q.get('peer') ?? '',
		q.get('filing') ?? '',
		isPro
	);
	vm.isPro = isPro;
	return {
		vm,
		isPro,
		title: vm.symbol + ' - ' + (tab !== '' ? labelTitle(tab) : 'Overview') + ' - Norviq'
	};
}
