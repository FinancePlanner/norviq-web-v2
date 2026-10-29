// internal/pages/trading: TradingDashboardVM and PositionRow. Client-safe.

export interface PositionRow {
	symbol: string;
	last: string;
	netChg: string;
	chgPct: string;
	volume: string;
	changePositive: boolean;
}

export interface PriceSeries {
	labels: string[];
	values: number[];
}

export interface TradingDashboardVM {
	title: string;
	positions: PositionRow[];
	selectedSymbol: string;
	selectedPrice: string;
	selectedChange: string;
	/** The selected symbol's price history (Go: ChartHTML from the stock chart tab); null = no chart. */
	chart: PriceSeries | null;
	isPro: boolean;
}

/** StockHistory bar (GET /v1/market/history). */
export interface StockHistory {
	date: string;
	close: number;
	open?: number;
	high?: number;
	low?: number;
	volume?: number;
}

/** WatchlistSearchResultVM (portfolio/subpages.templ). */
export interface WatchlistSearchResult {
	symbol: string;
	name: string;
	exchange: string;
}

/** trading.TradingChangeClass */
export function tradingChangeClass(positive: boolean): string {
	return positive ? 'text-emerald-400' : 'text-rose-400';
}

/** trading.TradingChangeClassForString (Go oddity kept: anything not starting with '-' is green). */
export function tradingChangeClassForString(ch: string): string {
	if (ch.length > 0 && (ch[0] === '+' || ch[0] !== '-')) return 'text-emerald-400';
	return 'text-rose-400';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** loadStockChartTab: bar.Date.Format("Jan 2") over the closes. */
export function priceSeries(bars: StockHistory[] | null | undefined): PriceSeries | null {
	if (!bars || bars.length === 0) return null;
	const labels: string[] = [];
	const values: number[] = [];
	for (const bar of bars) {
		const [y, m, d] = String(bar.date).slice(0, 10).split('-').map(Number);
		const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
		labels.push(`${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`);
		values.push(bar.close);
	}
	return { labels, values };
}
