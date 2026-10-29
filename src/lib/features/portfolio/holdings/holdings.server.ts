import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiFetch, apiJSON } from '#lib/server/api.js';
import { formatCurrency, formatFloat, formatPercentValue, formatSignedCurrency, formatSignedPercent } from '#lib/format.js';
import {
	fetchPnlBySymbol,
	fetchQuoteBatch,
	fetchSentimentBySymbol,
	formatShares,
	loadPortfolioMarketEnrichment,
	loadPortfolioSentimentRollup,
	parseUUID,
	quoteBySymbol,
	sentimentBadgeFor,
	sortStocksBySymbol,
	stockSymbols,
	uuidString,
	type PnlBySymbol,
	type QuoteResponse,
	type StockListItem,
	type SymbolSentiment
} from '../market.server.js';
import { buildSentimentRollup } from '../sentiment.js';
import { formatChangeLabel, performancePointSeries, primaryChange } from './change.js';
import type {
	AddPositionFormVM,
	AssetFilterVM,
	EditPositionFormVM,
	HoldingsViewModel,
	OnePageRowVM,
	OtherShareLinkVM,
	PortfolioOptionVM,
	PositionRowVM,
	ShareLinkVM
} from './types.js';

// Ports handlers/portfolio_data.go, quote_refresh.go (holdings half),
// portfolio_position*.go helpers, portfolio_onepage.go and pilot_following.go.

type Schemas = components['schemas'];
type ScenarioTargetResponse = Schemas['ScenarioTargetResponse'];

/** No "1D": history is recorded once a day. */
export const PORTFOLIO_TIME_RANGES = ['1W', '1M', '3M', '1Y', 'ALL'];

export function normalizePortfolioTimeRange(r: string | null | undefined): string {
	return PORTFOLIO_TIME_RANGES.includes(r ?? '') ? (r as string) : '1M';
}

export function portfolioAssetFilters(): AssetFilterVM[] {
	return [
		{ id: 'all', label: 'All Assets' },
		{ id: 'stock', label: 'Stocks' },
		{ id: 'etf', label: 'ETFs' },
		{ id: 'crypto', label: 'Crypto' }
	];
}

/** time.Now().Format("2006-01-02") — the Go pod ran on UTC. */
export function today(): string {
	return new Date().toISOString().slice(0, 10);
}

/** api.Date.Format("2006-01-02") */
function dateOnly(raw: string): string {
	return (raw ?? '').slice(0, 10);
}

export function targetAlertDirection(scenario: string): string {
	return scenario.trim().toLowerCase() === 'bear' ? 'below' : 'above';
}

function mapTargetAlertsBySymbol(targets: ScenarioTargetResponse[]): Map<string, ScenarioTargetResponse> {
	const out = new Map<string, ScenarioTargetResponse>();
	for (const t of targets) {
		const key = t.symbol.trim().toUpperCase();
		if (key) out.set(key, t);
	}
	return out;
}

/**
 * mapPositionRow. sentiments may be null — the quote refresh re-renders price
 * fragments only, never the row that carries the badge.
 */
export function mapPositionRow(
	stock: StockListItem,
	targets: Map<string, ScenarioTargetResponse> | null,
	quotes: Map<string, QuoteResponse>,
	pnl: Map<string, PnlBySymbol> | null,
	sparklines: Map<string, number[]> | null,
	sentiments: Map<string, SymbolSentiment> | null,
	index: number
): PositionRowVM {
	const symbol = stock.symbol.trim().toUpperCase();
	let subtitle = 'Holding';
	let notes = '';
	if (stock.notes && stock.notes.trim() !== '') {
		subtitle = stock.notes.trim();
		notes = subtitle;
	}
	const row: PositionRowVM = {
		id: uuidString(stock.id),
		symbol,
		symbolInitial: symbol === '' ? '?' : symbol[0].toUpperCase(),
		sentiment: sentimentBadgeFor(sentiments, symbol),
		subtitle,
		sharesLabel: formatShares(stock.shares) + ' shares',
		sharesRaw: formatShares(stock.shares),
		buyPriceRaw: formatFloat(stock.buyPrice, 2),
		buyDate: dateOnly(stock.buyDate),
		notes,
		costBasis: formatCurrency(stock.shares * stock.buyPrice),
		category: stock.category,
		detailURL: '/portfolio/' + symbol.toLowerCase(),
		chgPct: '-',
		marketValue: formatCurrency(stock.shares * stock.buyPrice),
		lastPrice: '-',
		netChg: '-',
		changePositive: false,
		todayGL: '-',
		totalGL: '-',
		totalGLPct: '-',
		totalPositive: false,
		weightPct: '-',
		rawGain: 0,
		rawWeight: 0,
		volume: '-',
		sparkline: null,
		sparklineID: '',
		targetAlertPrice: '',
		targetAlertID: '',
		targetAlertDirection: ''
	};

	const q = quotes.get(symbol);
	if (q) {
		row.marketValue = formatCurrency(stock.shares * q.c);
		row.lastPrice = formatCurrency(q.c);
		if (q.d !== undefined && q.d !== null) {
			row.netChg = `${q.d < 0 ? '' : '+'}${formatFloat(q.d, 2)}`;
		}
		if (q.dp !== undefined && q.dp !== null) {
			row.changePositive = q.dp >= 0;
			row.chgPct = `${row.changePositive ? '+' : ''}${formatFloat(q.dp, 2)}%`;
		}
	}

	// Server-computed P&L wins over quote-derived values when available.
	const p = pnl?.get(symbol);
	if (p) {
		if (p.costBasis != null) row.costBasis = formatCurrency(p.costBasis);
		if (p.currentPrice != null) row.lastPrice = formatCurrency(p.currentPrice);
		if (p.marketValue != null) row.marketValue = formatCurrency(p.marketValue);
		if (p.dayChange != null) {
			row.todayGL = formatSignedCurrency(p.dayChange);
			row.changePositive = p.dayChange >= 0;
		}
		if (p.dayChangePercent != null) row.chgPct = formatSignedPercent(p.dayChangePercent);
		// Without a live quote the backend falls back to cost basis, which
		// makes unrealized P&L a meaningless 0 — keep the placeholder then.
		if (p.currentPrice != null) {
			row.totalGL = formatSignedCurrency(p.unrealizedPnl);
			row.totalPositive = p.unrealizedPnl >= 0;
			row.rawGain = p.unrealizedPnl;
			if (p.unrealizedPnlPercent != null) row.totalGLPct = formatSignedPercent(p.unrealizedPnlPercent);
		}
		if (p.weightPercent != null) {
			row.weightPct = formatPercentValue(p.weightPercent);
			row.rawWeight = p.weightPercent;
		}
	}

	const closes = sparklines?.get(symbol);
	if (closes) {
		row.sparkline = closes;
		row.sparklineID = `holdings-spark-${symbol}-${index}`;
	}

	const alert = targets?.get(symbol);
	if (alert) {
		row.targetAlertPrice = formatCurrency(alert.targetPrice);
		row.targetAlertID = uuidString(alert.id);
		row.targetAlertDirection = targetAlertDirection(alert.scenario);
	}
	return row;
}

function emptyAddPosition(range: string): AddPositionFormVM {
	return {
		portfolioID: '',
		symbol: '',
		category: 'stock',
		shares: '',
		buyPrice: '',
		buyDate: today(),
		notes: '',
		range,
		error: '',
		currentPortfolioValue: 0
	};
}

/** LoadHoldingsViewModelForPortfolio */
export async function loadHoldingsViewModel(event: RequestEvent, timeRange: string | null, portfolioID: string): Promise<HoldingsViewModel> {
	const selectedTimeRange = normalizePortfolioTimeRange(timeRange);
	const vm: HoldingsViewModel = {
		sentiment: buildSentimentRollup('', null, 0, 0, 0, 0, '', '', ''),
		portfolios: [],
		selectedPortfolio: '',
		heroLabel: 'Portfolio value',
		totalValue: '',
		heroSubtitle: '',
		trendLabel: 'No portfolio trend yet',
		chartLabels: [],
		chartValues: [],
		selectedTimeRange,
		timeRanges: PORTFOLIO_TIME_RANGES,
		totalShares: '',
		avgPositionValue: '',
		cashBalance: '',
		positions: [],
		assetFilters: portfolioAssetFilters(),
		loadErrors: {},
		hasLoadError: false,
		errorMessage: '',
		isPro: false,
		showAddPosition: false,
		addPosition: emptyAddPosition(''),
		followingPilot: null
	};

	const listID = parseUUID(portfolioID);
	const q = listID ? { portfolioListId: listID } : undefined;
	const fail = (key: string) => (err: unknown) => {
		vm.loadErrors[key] = true;
		console.warn(`portfolio ${key} fetch failed`, err);
		return null;
	};

	// Wave 1 (8824553): everything that needs only the portfolio. The sentiment
	// roll-up is computed server-side from the portfolio, not from the symbols,
	// so it starts here instead of waiting for the holdings.
	const [stocksRes, summary, performance, pnl, targetsRes, rollup] = await Promise.all([
		apiJSON<StockListItem[]>(event, 'GET', '/v1/stocks', undefined, { query: q }).catch(fail('stocks')),
		apiJSON<Schemas['PortfolioSummaryResponse']>(event, 'GET', '/v1/portfolio/summary', undefined, { query: q }).catch(fail('summary')),
		apiJSON<Schemas['PortfolioPerformanceResponse']>(event, 'GET', '/v1/portfolio/performance', undefined, {
			query: { ...q, range: selectedTimeRange }
		}).catch(fail('performance')),
		fetchPnlBySymbol(event, listID),
		apiJSON<ScenarioTargetResponse[]>(event, 'GET', '/v1/targets').catch(fail('targets')),
		loadPortfolioSentimentRollup(event, portfolioID)
	]);

	let stocks = stocksRes ?? [];
	if (vm.loadErrors.stocks && stocks.length === 0) {
		vm.hasLoadError = true;
		vm.errorMessage = "We couldn't load your holdings. Check your connection and try again.";
		return vm;
	}

	const targetsBySymbol = mapTargetAlertsBySymbol(targetsRes ?? []);
	let holdingsValue = 0;
	let totalShares = 0;
	for (const s of stocks) {
		holdingsValue += s.shares * s.buyPrice;
		totalShares += s.shares;
	}
	const cashBalance = summary?.cashBalance ?? 0;
	const totalValue = holdingsValue + cashBalance;
	const positionCount = stocks.length;

	vm.totalValue = formatCurrency(totalValue);
	vm.heroSubtitle = `${positionCount} positions`;
	vm.totalShares = formatShares(totalShares);
	vm.cashBalance = formatCurrency(cashBalance);
	vm.avgPositionValue = formatCurrency(positionCount === 0 ? 0 : holdingsValue / positionCount);
	vm.addPosition.currentPortfolioValue = totalValue;

	if (performance) {
		if (performance.points?.length) {
			const { labels, values } = performancePointSeries(performance.points);
			vm.chartLabels = labels;
			vm.chartValues = values;
		}
		const change = formatChangeLabel(primaryChange(performance.changes));
		if (change.ok) vm.trendLabel = change.label;
	}

	stocks = sortStocksBySymbol(stocks);
	const symbols = stocks.map((s) => s.symbol);
	// Wave 2: both need the symbols and nothing else, and each degrades on its
	// own budget, so they run side by side rather than adding up.
	const [{ quotes, sparklines }, sentiments] = await Promise.all([
		loadPortfolioMarketEnrichment(event, symbols),
		fetchSentimentBySymbol(event, symbols)
	]);
	vm.sentiment = rollup;
	const quoteMap = quoteBySymbol(quotes);
	vm.positions = stocks.map((s, i) => mapPositionRow(s, targetsBySymbol, quoteMap, pnl, sparklines, sentiments, i));
	vm.addPosition.range = vm.selectedTimeRange;
	return vm;
}

/** LoadHoldingsQuoteRows: every holding (not scoped to a portfolio, as in Go). */
export async function loadHoldingsQuoteRows(event: RequestEvent): Promise<PositionRowVM[]> {
	let stocks: StockListItem[];
	try {
		stocks = (await apiJSON<StockListItem[]>(event, 'GET', '/v1/stocks')) ?? [];
	} catch (err) {
		console.warn('portfolio quote refresh stocks fetch failed', err);
		return [];
	}
	stocks = sortStocksBySymbol(stocks);
	const symbols = stockSymbols(stocks);
	const [quotes, pnl] = await Promise.all([fetchQuoteBatch(event, symbols), fetchPnlBySymbol(event, null)]);
	const quoteMap = quoteBySymbol(quotes);
	return stocks.map((s, i) => mapPositionRow(s, null, quoteMap, pnl, null, null, i));
}

/** GET /v1/portfolios (hand-written api.PortfolioPage). null on failure. */
export async function loadPortfolioOptions(event: RequestEvent): Promise<PortfolioOptionVM[] | null> {
	try {
		const page = await apiJSON<{ items?: { id: string; name: string; mode: string }[] }>(event, 'GET', '/v1/portfolios');
		return (page?.items ?? []).map((i) => ({ id: i.id, name: i.name, mode: i.mode }));
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Position forms (portfolio_position.go, portfolio_position_actions.go)

/** Backend error body → readable reason (handlers.apiErrorMessage). */
function apiErrorMessage(body: string, fallback: string): string {
	if (!body) return fallback;
	let text = body.trim();
	if (text.startsWith('{')) {
		try {
			const payload = JSON.parse(text) as { reason?: unknown };
			text = typeof payload.reason === 'string' ? payload.reason.trim() : '';
		} catch {
			return fallback;
		}
	}
	if (text === '' || text.length > 180 || /^[A-Z][A-Z0-9_]+$/.test(text)) return fallback;
	return text;
}

/** handlers.pilotManagedReason: a 409 whose reason mentions a pilot follow. */
export function pilotManagedReason(status: number, body: string): string {
	if (status !== 409) return '';
	const reason = apiErrorMessage(body, '');
	return reason.toLowerCase().includes('pilot follow') ? reason : '';
}

export interface RawResult {
	status: number;
	body: string;
	ok: boolean;
	/** a transport error (Go's err != nil) */
	networkError: boolean;
}

export async function rawCall(event: RequestEvent, method: string, path: string, input?: unknown): Promise<RawResult> {
	try {
		const res = await apiFetch(
			event,
			method,
			path,
			input === undefined ? null : JSON.stringify(input),
			{ headers: input === undefined ? {} : { 'Content-Type': 'application/json' } }
		);
		const body = await res.text();
		return { status: res.status, body, ok: res.ok, networkError: false };
	} catch {
		return { status: 0, body: '', ok: false, networkError: true };
	}
}

function goParseFloat(raw: string): number | null {
	const s = raw.trim();
	if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) && !/^[+-]?(inf|infinity|nan)$/i.test(s)) return null;
	const v = Number(s.replace(/^\+?inf(inity)?$/i, 'Infinity').replace(/^-inf(inity)?$/i, '-Infinity'));
	return Number.isNaN(v) && !/nan/i.test(s) ? null : v;
}

function validDate(raw: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
	const [y, m, d] = raw.split('-').map(Number);
	const t = new Date(Date.UTC(y, m - 1, d));
	return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

const formStr = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export interface StockRequest {
	symbol: string;
	shares: number;
	buyPrice: number;
	buyDate: string;
	category: string;
	notes?: string;
	portfolioListId?: string;
}

/** parseAddPositionRequest */
export function parseAddPositionRequest(f: FormData): { req: StockRequest | null; form: AddPositionFormVM; error: string } {
	const form: AddPositionFormVM = {
		portfolioID: formStr(f, 'portfolio'),
		symbol: formStr(f, 'symbol'),
		category: formStr(f, 'category'),
		shares: formStr(f, 'shares'),
		buyPrice: formStr(f, 'buy_price'),
		buyDate: formStr(f, 'buy_date'),
		notes: formStr(f, 'notes'),
		range: normalizePortfolioTimeRange(String(f.get('range') ?? '')),
		error: '',
		currentPortfolioValue: 0
	};
	const current = goParseFloat(formStr(f, 'current_value'));
	if (current !== null && current > 0) form.currentPortfolioValue = current;

	const symbol = form.symbol.toUpperCase();
	if (symbol === '') return { req: null, form, error: 'Enter a symbol.' };
	const shares = goParseFloat(form.shares);
	if (shares === null || !(shares > 0)) return { req: null, form, error: 'Enter a valid share amount.' };
	const buyPrice = goParseFloat(form.buyPrice);
	if (buyPrice === null || !(buyPrice > 0)) return { req: null, form, error: 'Enter a valid buy price.' };
	if (!validDate(form.buyDate)) return { req: null, form, error: 'Enter a valid buy date.' };
	if (!['stock', 'etf', 'crypto'].includes(form.category)) return { req: null, form, error: 'Choose a valid category.' };

	const req: StockRequest = { symbol, shares, buyPrice, buyDate: form.buyDate, category: form.category };
	if (form.notes !== '') req.notes = form.notes;
	const listID = parseUUID(form.portfolioID);
	if (listID) req.portfolioListId = listID;
	return { req, form, error: '' };
}

/** renderAddPositionForm defaults */
export function addPositionFormDefaults(form: AddPositionFormVM): AddPositionFormVM {
	return { ...form, buyDate: form.buyDate || today(), category: form.category || 'stock' };
}

export function createStockErrorMessage(res: RawResult): string {
	if (res.networkError) return 'Failed to create position. Check your connection and try again.';
	const pilot = pilotManagedReason(res.status, res.body);
	if (pilot) return pilot;
	if (res.body) {
		// Go unmarshalled into {reason, message, error string}; a Vapor error
		// body carries "error": true, which fails that unmarshal, so only
		// bodies without a boolean "error" reach this branch.
		try {
			const payload = JSON.parse(res.body) as Record<string, unknown>;
			const okShape = ['reason', 'message', 'error'].every((k) => payload[k] === undefined || payload[k] === null || typeof payload[k] === 'string');
			if (okShape) {
				for (const k of ['reason', 'message', 'error']) if (payload[k]) return payload[k] as string;
			}
		} catch {
			/* not JSON */
		}
	}
	if (res.status === 409) return 'This symbol is already in your portfolio.';
	return `Failed to create position (HTTP ${res.status}).`;
}

export function updateStockErrorMessage(res: RawResult): string {
	if (res.networkError) return 'Failed to update position. Check your connection and try again.';
	return pilotManagedReason(res.status, res.body) || `Failed to update position (HTTP ${res.status}).`;
}

export function sellStockErrorMessage(res: RawResult): string {
	if (res.networkError) return 'Failed to sell shares. Check your connection and try again.';
	return pilotManagedReason(res.status, res.body) || `Failed to sell shares (HTTP ${res.status}).`;
}

export function createTargetErrorMessage(res: RawResult): string {
	if (res.networkError) return 'Failed to save price alert. Check your connection and try again.';
	if (res.status === 403) return 'Price alerts require a Pro subscription.';
	return `Failed to save price alert (HTTP ${res.status}).`;
}

/** portfolioRedirectURL */
export function portfolioRedirectURL(timeRange: string): string {
	return timeRange !== '' && timeRange !== '1M' ? '/portfolio?range=' + encodeURIComponent(timeRange) : '/portfolio';
}

/** portfolioRedirectURLForPortfolio (url.Values.Encode sorts keys). */
export function portfolioRedirectURLForPortfolio(timeRange: string, portfolioID: string): string {
	const values = new URLSearchParams();
	if (portfolioID !== '') values.set('portfolio', portfolioID);
	if (timeRange !== '' && timeRange !== '1M') values.set('range', timeRange);
	values.sort();
	const qs = values.toString();
	return qs ? '/portfolio?' + qs : '/portfolio';
}

/** loadPositionForm: GET /v1/stocks/id/{id}. Throws a status for the caller to answer. */
export async function loadPositionForm(
	event: RequestEvent,
	rawID: string
): Promise<{ ok: true; stockID: string; form: EditPositionFormVM } | { ok: false; status: number; message: string }> {
	const stockID = parseUUID(rawID);
	if (!stockID) return { ok: false, status: 400, message: 'Invalid position' };
	let stock: StockListItem;
	try {
		stock = await apiJSON<StockListItem>(event, 'GET', `/v1/stocks/id/${stockID}`);
		if (!stock) throw new Error('empty');
	} catch {
		return { ok: false, status: 404, message: 'Position not found' };
	}
	return {
		ok: true,
		stockID,
		form: {
			id: uuidString(stock.id),
			symbol: stock.symbol.toUpperCase(),
			category: stock.category,
			shares: formatShares(stock.shares),
			buyPrice: formatFloat(stock.buyPrice, 2),
			buyDate: dateOnly(stock.buyDate),
			notes: (stock.notes ?? '').trim(),
			range: '',
			error: ''
		}
	};
}

export async function lookupTargetForSymbol(event: RequestEvent, symbol: string): Promise<ScenarioTargetResponse | null> {
	try {
		const targets = await apiJSON<ScenarioTargetResponse[]>(event, 'GET', '/v1/targets');
		const key = symbol.trim().toUpperCase();
		return (targets ?? []).find((t) => t.symbol.trim().toUpperCase() === key) ?? null;
	} catch {
		return null;
	}
}

export { goParseFloat, validDate, formStr };

// ---------------------------------------------------------------------------
// One page (portfolio_onepage.go)

export const ONE_PAGE_MAX_ROWS = 12;

export function buildOnePageRows(rows: PositionRowVM[], maxRows: number): { rows: OnePageRowVM[]; other: string } {
	const sorted = [...rows].sort((a, b) => b.rawWeight - a.rawWeight);
	const out: OnePageRowVM[] = [];
	let rest = 0;
	sorted.forEach((r, i) => {
		if (i >= maxRows) {
			rest += r.rawWeight;
			return;
		}
		out.push({
			symbol: r.symbol,
			weight: r.weightPct,
			marketValue: r.marketValue,
			totalGLPct: r.totalGLPct,
			totalPositive: r.totalPositive,
			chgPct: r.chgPct,
			changePositive: r.changePositive
		});
	});
	return { rows: out, other: rest <= 0 ? '' : formatFloat(rest, 1) + '%' };
}

/** shareScope: only a real UUID passes through, else "all". */
export function shareScope(portfolioID: string | null | undefined): string {
	const id = (portfolioID ?? '').trim();
	return parseUUID(id) ? id : 'all';
}

interface PortfolioShareLink {
	slug: string;
	url: string;
	scope: string;
	createdAt: string;
}

function otherShareLinks(links: PortfolioShareLink[], scope: string): OtherShareLinkVM[] {
	return links
		.filter((l) => l.scope !== scope)
		.map((l) => ({ scope: l.scope, url: l.url, label: l.scope === 'all' ? 'All portfolios' : 'A single portfolio' }));
}

export async function loadShareLink(event: RequestEvent, scope: string): Promise<ShareLinkVM> {
	const vm: ShareLinkVM = { scope, url: '', error: '', others: [] };
	let links: PortfolioShareLink[];
	try {
		links = (await apiJSON<PortfolioShareLink[]>(event, 'GET', '/v1/portfolio/share-links')) ?? [];
	} catch (err) {
		console.warn('load portfolio share links', err);
		return vm;
	}
	vm.url = links.find((l) => l.scope === scope)?.url ?? '';
	vm.others = otherShareLinks(links, scope);
	return vm;
}

export async function createShareLink(event: RequestEvent, scope: string): Promise<ShareLinkVM> {
	try {
		const link = await apiJSON<PortfolioShareLink>(event, 'POST', '/v1/portfolio/share-links/' + scope);
		const vm = await loadShareLink(event, scope);
		vm.url = link?.url ?? '';
		return vm;
	} catch (err) {
		console.warn('create portfolio share link', err);
		const vm = await loadShareLink(event, scope);
		vm.error = "Couldn't create a link. Try again.";
		return vm;
	}
}

export async function revokeShareLink(event: RequestEvent, scope: string, target: string): Promise<ShareLinkVM> {
	let failed = false;
	try {
		await apiJSON(event, 'DELETE', '/v1/portfolio/share-links/' + target);
	} catch (err) {
		console.warn('revoke portfolio share link', err);
		failed = true;
	}
	const vm = await loadShareLink(event, scope);
	if (failed) vm.error = "Couldn't stop sharing. Try again.";
	return vm;
}
