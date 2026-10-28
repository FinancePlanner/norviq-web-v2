// Port of norviq-web internal/publicsymbols: the allowlist of tickers that get
// a public, crawlable analysis page at /s/{SYMBOL}.
//
// A curated list rather than "whatever the backend will answer for" on
// purpose: every entry is a URL we promise Google exists and will keep
// returning 200. Anything outside it is a 404. Sorted, so all() yields a
// byte-stable sitemap.

const symbols: readonly string[] = [
	'AAPL', 'ABBV', 'ABNB', 'ABT', 'ACN', 'ADBE', 'ADI', 'ADP', 'AEP', 'AFL',
	'AIG', 'AMAT', 'AMD', 'AMGN', 'AMT', 'AMZN', 'AON', 'APD', 'ARKK', 'AVGO',
	'AXP', 'BA', 'BAC', 'BDX', 'BK', 'BKNG', 'BLK', 'BMY', 'BND', 'BRK.B',
	'BSX', 'C', 'CAT', 'CB', 'CI', 'CL', 'CMCSA', 'CME', 'COF', 'COP',
	'COST', 'CRM', 'CSCO', 'CSX', 'CVS', 'CVX', 'D', 'DE', 'DHR', 'DIA',
	'DIS', 'DUK', 'ECL', 'EL', 'ELV', 'EMR', 'EOG', 'EQIX', 'ETN', 'EXC',
	'F', 'FDX', 'GD', 'GE', 'GILD', 'GIS', 'GLD', 'GM', 'GOOGL', 'GS',
	'HD', 'HON', 'HUM', 'IBM', 'ICE', 'INTC', 'INTU', 'ISRG', 'ITW', 'IWM',
	'JNJ', 'JPM', 'KHC', 'KLAC', 'KMB', 'KO', 'LIN', 'LLY', 'LMT', 'LOW',
	'LRCX', 'MA', 'MAR', 'MCD', 'MDLZ', 'MDT', 'MET', 'META', 'MMC', 'MMM',
	'MO', 'MRK', 'MS', 'MSFT', 'MU', 'NEE', 'NFLX', 'NKE', 'NOC', 'NOW',
	'NSC', 'NVDA', 'ORCL', 'PEP', 'PFE', 'PG', 'PGR', 'PLD', 'PM', 'PNC',
	'PSA', 'PYPL', 'QCOM', 'QQQ', 'REGN', 'RTX', 'SBUX', 'SCHW', 'SHW', 'SLB',
	'SLV', 'SMH', 'SO', 'SPG', 'SPY', 'SYK', 'T', 'TGT', 'TJX', 'TLT',
	'TMO', 'TMUS', 'TRV', 'TSLA', 'TXN', 'UBER', 'UNH', 'UNP', 'UPS', 'USB',
	'V', 'VEA', 'VLO', 'VOO', 'VRTX', 'VTI', 'VWO', 'VZ', 'WFC', 'WM',
	'WMT', 'XLB', 'XLC', 'XLE', 'XLF', 'XLI', 'XLK', 'XLP', 'XLRE', 'XLU',
	'XLV', 'XLY', 'XOM', 'ZTS'
];

const allowed = new Set(symbols);

/** Whether sym has a public page. Normalizes case and surrounding space. */
export function allowedSymbol(sym: string): boolean {
	return allowed.has(sym.trim().toUpperCase());
}

/** Go name: publicsymbols.Allowed. */
export { allowedSymbol as allowed };

/** The allowlisted symbols, sorted. A copy: callers may not corrupt the allowlist. */
export function all(): string[] {
	return [...symbols];
}
