import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { formatFloat } from '#lib/format.js';
import { buildSentimentBadge, type SentimentBadgeVM } from '#lib/components/norviq/sentiment.js';
import { buildSentimentRollup, type SentimentRollupVM } from './sentiment.js';

// Market enrichment shared by the holdings, watchlist and quote-refresh
// loaders. Ports handlers/market_sparklines.go, sentiment_data.go and the
// fetch helpers in portfolio_data.go / quote_refresh.go.

type Schemas = components['schemas'];
export type QuoteResponse = Schemas['QuoteResponse'];
export type QuoteBatchResponse = Schemas['QuoteBatchResponse'];
export type PnlBySymbol = Schemas['PnlBySymbol'];
export type PnlResponse = Schemas['PnlResponse'];
export type SymbolSentiment = Schemas['SymbolSentiment'];
export type StockListItem = Schemas['StockListItem'];

const SPARKLINE_BAR_COUNT = 14;
/** portfolioEnrichmentTimeout */
export const ENRICHMENT_TIMEOUT_MS = 2000;
/** api.MaxSentimentBatchSymbols */
const MAX_SENTIMENT_BATCH_SYMBOLS = 100;

/** Go's uuid.UUID.String() is lower-case; the backend emits upper-case. */
export const uuidString = (id: string | null | undefined) => (id ?? '').toLowerCase();

/** uuid.Parse acceptance: a well-formed UUID (any case, optional braces/urn are not used by the web). */
export function parseUUID(raw: string | null | undefined): string | null {
	const v = (raw ?? '').trim();
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v.toLowerCase() : null;
}

export function stockSymbols(stocks: StockListItem[]): string[] {
	return stocks.map((s) => s.symbol.trim().toUpperCase()).filter(Boolean);
}

export function sortStocksBySymbol(stocks: StockListItem[]): StockListItem[] {
	return [...stocks].sort((a, b) => {
		const x = a.symbol.toUpperCase();
		const y = b.symbol.toUpperCase();
		return x < y ? -1 : x > y ? 1 : 0;
	});
}

/** quoteRefreshStatusTime: "15:04:05" in the server's clock (Go used time.Now() local). */
export function quoteRefreshStatusTime(t: Date): string {
	const p = (n: number) => String(n).padStart(2, '0');
	return `${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`;
}

export async function fetchQuoteBatch(event: RequestEvent, symbols: string[], signal?: AbortSignal): Promise<QuoteBatchResponse | null> {
	if (symbols.length === 0) return null;
	try {
		return await apiJSON<QuoteBatchResponse>(event, 'GET', '/v1/market/quote/batch', undefined, {
			query: { symbols: symbols.join(',') },
			signal
		});
	} catch {
		return null;
	}
}

export function quoteBySymbol(quotes: QuoteBatchResponse | null | undefined): Map<string, QuoteResponse> {
	const out = new Map<string, QuoteResponse>();
	for (const q of quotes?.quotes ?? []) out.set(q.symbol.toUpperCase(), q);
	return out;
}

async function fetchSparklineCloses(event: RequestEvent, symbol: string, signal?: AbortSignal): Promise<number[]> {
	try {
		const bars = await apiJSON<Schemas['StockHistory'][]>(event, 'GET', '/v1/market/history', undefined, {
			query: { symbol },
			signal
		});
		if (!bars?.length) return [];
		const start = bars.length > SPARKLINE_BAR_COUNT ? bars.length - SPARKLINE_BAR_COUNT : 0;
		return bars.slice(start).map((b) => b.close);
	} catch (err) {
		console.warn('market history fetch failed', symbol, err);
		return [];
	}
}

/** LoadSparklinesForSymbols: recent daily closes (≥2) keyed by upper-case symbol. */
export async function loadSparklinesForSymbols(event: RequestEvent, symbols: string[], signal?: AbortSignal): Promise<Map<string, number[]>> {
	const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
	const out = new Map<string, number[]>();
	await Promise.all(
		unique.map(async (symbol) => {
			const closes = await fetchSparklineCloses(event, symbol, signal);
			if (closes.length >= 2) out.set(symbol, closes);
		})
	);
	return out;
}

/** loadPortfolioMarketEnrichment: quotes + sparklines under the 2s enrichment budget. */
export async function loadPortfolioMarketEnrichment(
	event: RequestEvent,
	symbols: string[]
): Promise<{ quotes: QuoteBatchResponse | null; sparklines: Map<string, number[]> }> {
	if (symbols.length === 0) return { quotes: null, sparklines: new Map() };
	const signal = AbortSignal.timeout(ENRICHMENT_TIMEOUT_MS);
	const [quotes, sparklines] = await Promise.all([fetchQuoteBatch(event, symbols, signal), loadSparklinesForSymbols(event, symbols, signal)]);
	return { quotes, sparklines };
}

/** fetchPnlBySymbol: null on failure so callers fall back to quote-derived values. */
export async function fetchPnlBySymbol(event: RequestEvent, portfolioListID?: string | null): Promise<Map<string, PnlBySymbol> | null> {
	try {
		const resp = await apiJSON<PnlResponse>(event, 'GET', '/v1/pnl', undefined, {
			query: portfolioListID ? { portfolioListId: portfolioListID } : undefined
		});
		const out = new Map<string, PnlBySymbol>();
		for (const item of resp?.items ?? []) out.set(item.symbol.trim().toUpperCase(), item);
		return out;
	} catch (err) {
		console.warn('portfolio pnl fetch failed', err);
		return null;
	}
}

function chunkStrings(values: string[], size: number): string[][] {
	if (size <= 0) return [values];
	const chunks: string[][] = [];
	for (let i = 0; i < values.length; i += size) chunks.push(values.slice(i, i + size));
	return chunks;
}

/** fetchSentimentBySymbol: never fails; a failed lookup reads as "no chatter". */
export async function fetchSentimentBySymbol(event: RequestEvent, symbols: string[]): Promise<Map<string, SymbolSentiment>> {
	const out = new Map<string, SymbolSentiment>();
	if (symbols.length === 0) return out;
	const signal = AbortSignal.timeout(ENRICHMENT_TIMEOUT_MS);
	for (const chunk of chunkStrings(symbols, MAX_SENTIMENT_BATCH_SYMBOLS)) {
		try {
			const resp = await apiJSON<Schemas['SymbolSentimentBatchResponse']>(event, 'GET', '/v1/insights/sentiment/symbols', undefined, {
				query: { symbols: chunk.join(',') },
				signal
			});
			for (const [symbol, s] of Object.entries(resp?.symbols ?? {})) out.set(symbol.trim().toUpperCase(), s);
		} catch {
			/* degrade */
		}
	}
	return out;
}

export function sentimentBadgeFor(sentiments: Map<string, SymbolSentiment> | null | undefined, symbol: string): SentimentBadgeVM {
	const reading = sentiments?.get(symbol.trim().toUpperCase());
	if (!reading) return buildSentimentBadge('', null, null, 0);
	return buildSentimentBadge(reading.label, reading.score, reading.delta1d, reading.postCount);
}

function mapSentimentRollup(payload: Schemas['PortfolioSentimentResponse']): SentimentRollupVM {
	return buildSentimentRollup(
		payload.label,
		payload.score,
		payload.coverage,
		payload.symbolsCovered,
		payload.symbolsTotal,
		payload.postCount,
		payload.mostBullish?.symbol ?? '',
		payload.mostBearish?.symbol ?? '',
		payload.asOfDate ?? ''
	);
}

const hiddenRollup = (): SentimentRollupVM => buildSentimentRollup('', null, 0, 0, 0, 0, '', '', '');

/** loadPortfolioSentimentRollup: value-weighted; hidden on failure. */
export async function loadPortfolioSentimentRollup(event: RequestEvent, portfolioID: string): Promise<SentimentRollupVM> {
	try {
		const id = parseUUID(portfolioID);
		const resp = await apiJSON<Schemas['PortfolioSentimentResponse']>(event, 'GET', '/v1/insights/sentiment/portfolio', undefined, {
			query: id ? { portfolioListId: id } : undefined
		});
		return mapSentimentRollup(resp);
	} catch (err) {
		console.warn('load portfolio sentiment rollup', err);
		return hiddenRollup();
	}
}

/** loadWatchlistSentimentRollup: equal-weighted; hidden on failure. */
export async function loadWatchlistSentimentRollup(event: RequestEvent, watchlistID: string): Promise<SentimentRollupVM> {
	try {
		const id = parseUUID(watchlistID);
		const resp = await apiJSON<Schemas['PortfolioSentimentResponse']>(event, 'GET', '/v1/insights/sentiment/watchlist', undefined, {
			query: id ? { watchlistListId: id } : undefined
		});
		return mapSentimentRollup(resp);
	} catch (err) {
		console.warn('load watchlist sentiment rollup', err);
		return hiddenRollup();
	}
}

/** handlers.formatShares: whole numbers without decimals, else two. */
export function formatShares(shares: number): string {
	return formatFloat(shares, shares % 1 === 0 ? 0 : 2);
}
