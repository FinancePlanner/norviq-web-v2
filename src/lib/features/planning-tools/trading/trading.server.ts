import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { formatCurrency, formatFloat, formatSignedPercent } from '#lib/format.js';
import { priceSeries, type PositionRow, type PriceSeries, type StockHistory, type TradingDashboardVM } from './types.js';

// Port of handlers.TradingDashboard (app.go). Go built the rows with the whole
// LoadHoldingsViewModel and the chart with LoadStockDetailViewModel(tab
// "chart"); only the parts this page renders are fetched here: the stock list,
// quotes and server P&L (mapPositionRow's price columns) and the selected
// symbol's price history (loadStockChartTab).

interface StockListItem {
	symbol: string;
}

interface QuoteResponse {
	symbol: string;
	c: number;
	d?: number | null;
	dp?: number | null;
}

interface PnlBySymbol {
	symbol: string;
	currentPrice?: number | null;
	dayChange?: number | null;
	dayChangePercent?: number | null;
}

async function tryJSON<T>(event: RequestEvent, path: string, query?: Record<string, string | number>): Promise<T | null> {
	try {
		return await apiJSON<T>(event, 'GET', path, undefined, { query });
	} catch (err) {
		console.warn('trading fetch failed', path, err);
		return null;
	}
}

/** mapPositionRow's price columns (portfolio_data.go). */
function positionRow(stock: StockListItem, quotes: Map<string, QuoteResponse>, pnl: Map<string, PnlBySymbol>): PositionRow {
	const symbol = stock.symbol.trim().toUpperCase();
	const row: PositionRow = { symbol, last: '-', netChg: '-', chgPct: '-', volume: '-', changePositive: false };
	const q = quotes.get(symbol);
	if (q) {
		row.last = formatCurrency(q.c);
		if (q.d != null) row.netChg = `${q.d < 0 ? '' : '+'}${formatFloat(q.d, 2)}`;
		if (q.dp != null) {
			row.changePositive = q.dp >= 0;
			row.chgPct = `${row.changePositive ? '+' : ''}${formatFloat(q.dp, 2)}%`;
		}
	}
	const p = pnl.get(symbol);
	if (p) {
		if (p.currentPrice != null) row.last = formatCurrency(p.currentPrice);
		if (p.dayChange != null) row.changePositive = p.dayChange >= 0;
		if (p.dayChangePercent != null) row.chgPct = formatSignedPercent(p.dayChangePercent);
	}
	return row;
}

/** loadStockChartTab: the selected symbol's closes, or null (no chart). */
async function loadChart(event: RequestEvent, symbol: string, stocksLoaded: boolean): Promise<PriceSeries | null> {
	// LoadStockDetailViewModel returned before the chart tab when the
	// holdings lookup (findPortfolioStock) failed in transport.
	if (!stocksLoaded || !symbol) return null;
	const bars = await tryJSON<StockHistory[]>(event, '/v1/market/history', { symbol: symbol.trim().toUpperCase() });
	return priceSeries(bars);
}

export async function loadTradingDashboard(event: RequestEvent, isPro: boolean): Promise<TradingDashboardVM> {
	const [stocks, pnlResp] = await Promise.all([
		tryJSON<StockListItem[]>(event, '/v1/stocks'),
		tryJSON<{ items: PnlBySymbol[] }>(event, '/v1/pnl')
	]);
	const list = (stocks ?? []).slice().sort((a, b) => (a.symbol.toUpperCase() < b.symbol.toUpperCase() ? -1 : a.symbol.toUpperCase() > b.symbol.toUpperCase() ? 1 : 0));
	const pnl = new Map((pnlResp?.items ?? []).map((i) => [i.symbol.trim().toUpperCase(), i]));
	const quotes = new Map<string, QuoteResponse>();
	if (list.length > 0) {
		const batch = await tryJSON<{ quotes: QuoteResponse[] }>(event, '/v1/market/quote/batch', { symbols: list.map((s) => s.symbol).join(',') });
		for (const q of batch?.quotes ?? []) quotes.set(q.symbol.toUpperCase(), q);
	}
	const positions = list.map((s) => positionRow(s, quotes, pnl));
	// "Default to a symbol with data, e.g. first or NOK" (Go).
	const selected = positions.length > 0 ? positions[0].symbol : 'NOK';
	return {
		title: 'Trading Dashboard',
		positions,
		selectedSymbol: selected,
		selectedPrice: '-',
		selectedChange: '-',
		chart: await loadChart(event, selected, stocks !== null),
		isPro
	};
}
