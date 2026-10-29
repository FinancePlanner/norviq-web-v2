// Port of the HTTP side of norviq-web internal/handlers/crypto.go,
// crypto_data.go, crypto_coin.go and crypto_portfolio.go. Every /crypto route
// is behind RequireFeature(FeatureCrypto, "Crypto") in Go; callers gate with
// requireCrypto() in each load and action.
import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { changeClass, formatCompactCurrency, formatCurrency, formatFloat, formatSignedPercent } from '#lib/format.js';
import { parseUUID } from '#lib/features/dashboard/goals/form.server.js';
import { cryptoChangePercent, formatCryptoPrice, formatShares } from './markets.js';
import type {
	AssetOptionVM,
	CoinPageVM,
	CoinStat,
	CryptoAssetResponse,
	CryptoHistoricalPoint,
	CryptoMarketsResponse,
	CryptoPortfolioItemRequest,
	CryptoPortfolioItemResponse,
	CryptoQuoteResponse,
	CryptoShortQuote,
	HoldingFormVM,
	NewsItemResponse,
	PageViewModel
} from './types.js';

export const requireCrypto = (event: RequestEvent) => requireFeature(event, Feature.Crypto, 'Crypto');

// ---------------------------------------------------------------------------
// GET /crypto, /crypto/{tab}

/** nav.validCryptoTabs */
const validCryptoTabs = new Set(['', 'overview', 'market', 'bubbles', 'news', 'portfolio']);

export const isValidCryptoTab = (tab: string) => validCryptoTabs.has(tab.trim().toLowerCase());

export function normalizeCryptoTab(tab: string): string {
	const t = tab.trim().toLowerCase();
	return t === '' ? 'overview' : t;
}

async function loadCryptoMarket(event: RequestEvent, vm: PageViewModel) {
	const [assets, quotes] = await Promise.all([
		apiJSON<CryptoAssetResponse[]>(event, 'GET', '/v1/crypto/list').catch(() => null),
		apiJSON<CryptoShortQuote[]>(event, 'GET', '/v1/crypto/batch-quotes').catch(() => null)
	]);
	const quoteBySymbol = new Map<string, { price: number; change: number }>();
	for (const q of quotes ?? []) {
		if (q.symbol == null || q.price == null) continue;
		quoteBySymbol.set(q.symbol.toUpperCase(), { price: q.price, change: q.change ?? 0 });
	}
	for (const asset of (assets ?? []).slice(0, 12)) {
		const row = { symbol: asset.symbol.toUpperCase(), name: asset.name, price: '-', changePct: '', changeClass: '' };
		const q = quoteBySymbol.get(row.symbol);
		if (q) {
			row.price = formatCurrency(q.price);
			const pct = cryptoChangePercent(q.price, q.change);
			if (pct !== null) {
				row.changePct = formatSignedPercent(pct);
				row.changeClass = changeClass(pct);
			}
		}
		vm.assets.push(row);
	}
	if (vm.assets.length === 0) {
		vm.hasLoadError = true;
		vm.errorMessage = 'Could not load crypto market data.';
	}
}

/** loadCryptoSnapshot: the largest coins and their 24h move; false when unavailable. */
async function loadCryptoSnapshot(event: RequestEvent, vm: PageViewModel): Promise<boolean> {
	let resp: CryptoMarketsResponse;
	try {
		resp = await apiJSON<CryptoMarketsResponse>(event, 'GET', '/v1/crypto/markets', undefined, {
			query: { timeframe: '1d', limit: 12 }
		});
	} catch {
		return false;
	}
	const coins = resp?.coins ?? [];
	if (coins.length === 0) return false;
	for (const coin of coins) {
		const row = { symbol: coin.symbol, name: coin.name, price: formatCryptoPrice(coin.price), changePct: '', changeClass: '' };
		if (coin.changePct != null) {
			row.changePct = formatSignedPercent(coin.changePct);
			row.changeClass = changeClass(coin.changePct);
		}
		vm.assets.push(row);
	}
	vm.snapshotFromMarkets = true;
	return true;
}

async function loadCryptoNews(event: RequestEvent, vm: PageViewModel) {
	let items: NewsItemResponse[];
	try {
		items = (await apiJSON<NewsItemResponse[]>(event, 'GET', '/v1/crypto/news', undefined, { query: { limit: 10 } })) ?? [];
	} catch {
		return;
	}
	for (const item of items) {
		const row = {
			title: (item.headline ?? '').trim(),
			summary: (item.summary ?? '').trim(),
			url: (item.url ?? '').trim(),
			source: (item.source ?? '').trim(),
			date: ''
		};
		if (row.title === '') row.title = 'Untitled';
		if (row.summary === '-') row.summary = '';
		if ((item.publishedAt ?? '').trim() !== '') row.date = item.publishedAt;
		vm.news.push(row);
	}
}

async function listCryptoPortfolio(event: RequestEvent): Promise<CryptoPortfolioItemResponse[] | null> {
	try {
		return (await apiJSON<CryptoPortfolioItemResponse[]>(event, 'GET', '/v1/crypto/portfolio')) ?? [];
	} catch {
		return null;
	}
}

async function loadCryptoPortfolio(event: RequestEvent, vm: PageViewModel) {
	const items = await listCryptoPortfolio(event);
	if (items === null) return;
	let totalValue = 0;
	for (const item of items) {
		vm.holdings.push({
			// uuid.UUID.String(): lower-case.
			id: item.id.toLowerCase(),
			symbol: item.symbol.toUpperCase(),
			name: item.name,
			quantity: formatShares(item.quantity),
			avgCost: formatCurrency(item.averageBuyPrice)
		});
		totalValue += item.quantity * item.averageBuyPrice;
	}
	vm.holdingCount = vm.holdings.length;
	vm.portfolioValue = formatCurrency(vm.holdingCount > 0 ? totalValue : 0);
}

/** LoadCryptoViewModel (Go loads the overview's three sources in series; these run together). */
export async function loadCryptoViewModel(event: RequestEvent, tab: string, activePath: string): Promise<PageViewModel> {
	const vm: PageViewModel = {
		tab: normalizeCryptoTab(tab),
		markets: null,
		snapshotFromMarkets: false,
		activePath,
		hasLoadError: false,
		errorMessage: '',
		assets: [],
		holdings: [],
		news: [],
		portfolioValue: '',
		holdingCount: 0
	};
	switch (vm.tab) {
		case 'news':
			await loadCryptoNews(event, vm);
			break;
		case 'portfolio':
			await loadCryptoPortfolio(event, vm);
			break;
		case 'market':
		case 'bubbles':
			// Rendered by the lazy markets query (Go: /crypto/markets/fragment).
			break;
		default:
			await Promise.all([
				loadCryptoSnapshot(event, vm).then((ok) => (ok ? undefined : loadCryptoMarket(event, vm))),
				loadCryptoNews(event, vm),
				loadCryptoPortfolio(event, vm)
			]);
	}
	return vm;
}

// ---------------------------------------------------------------------------
// GET /crypto/coin/{symbol}

/** FMP crypto symbols are a ticker plus the quote currency (BTCUSD, PEPEUSD). */
const cryptoCoinSymbolPattern = /^[A-Z0-9]{1,15}USD$/;

const cryptoCoinRanges = [
	{ value: '1w', label: '1W' },
	{ value: '1m', label: '1M' },
	{ value: '3m', label: '3M' },
	{ value: 'ytd', label: 'YTD' },
	{ value: '1y', label: '1Y' },
	{ value: 'all', label: 'All' }
];

function normalizeCryptoCoinRange(raw: string | null): string {
	const v = (raw ?? '').trim().toLowerCase();
	return cryptoCoinRanges.some((r) => r.value === v) ? v : '1y';
}

/** Go's time.AddDate (normalising overflow, e.g. Mar 31 - 1 month = Mar 3), in UTC. */
function addDate(now: Date, years: number, months: number, days: number): Date {
	return new Date(
		Date.UTC(
			now.getUTCFullYear() + years,
			now.getUTCMonth() + months,
			now.getUTCDate() + days,
			now.getUTCHours(),
			now.getUTCMinutes(),
			now.getUTCSeconds()
		)
	);
}

/** cryptoCoinRangeStart: the first day of the chart window. */
function cryptoCoinRangeStart(rangeValue: string, now: Date): Date {
	switch (rangeValue) {
		case '1w':
			return addDate(now, 0, 0, -7);
		case '1m':
			return addDate(now, 0, -1, 0);
		case '3m':
			return addDate(now, 0, -3, 0);
		case 'ytd':
			return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
		case 'all':
			return new Date(Date.UTC(2010, 0, 1));
		default:
			return addDate(now, -1, 0, 0);
	}
}

function cryptoCoinStats(q: CryptoQuoteResponse): CoinStat[] {
	const stats: CoinStat[] = [];
	const add = (label: string, value: number | null | undefined, format: (v: number) => string) => {
		if (value != null && value > 0) stats.push({ label, value: format(value) });
	};
	add('Market cap', q.marketCap, formatCompactCurrency);
	add('Volume (24h)', q.volume, formatCompactCurrency);
	if (q.dayLow != null && q.dayHigh != null) {
		stats.push({ label: 'Day range', value: formatCryptoPrice(q.dayLow) + ' – ' + formatCryptoPrice(q.dayHigh) });
	}
	if (q.yearLow != null && q.yearHigh != null) {
		stats.push({ label: '52-week range', value: formatCryptoPrice(q.yearLow) + ' – ' + formatCryptoPrice(q.yearHigh) });
	}
	add('50-day average', q.priceAvg50, formatCryptoPrice);
	add('200-day average', q.priceAvg200, formatCryptoPrice);
	return stats;
}

/** CryptoCoin: daily close chart plus quote stats. */
export async function loadCoinPage(event: RequestEvent, rawSymbol: string): Promise<CoinPageVM> {
	const symbol = rawSymbol.trim().toUpperCase();
	if (!cryptoCoinSymbolPattern.test(symbol)) error(404, 'Not Found');
	const rangeValue = normalizeCryptoCoinRange(event.url.searchParams.get('range'));

	const vm: CoinPageVM = {
		symbol,
		name: symbol,
		price: '',
		change: '',
		changeClass: '',
		rangeLabel: '',
		ranges: [],
		chart: null,
		stats: [],
		errorMessage: ''
	};
	for (const cr of cryptoCoinRanges) {
		if (cr.value === rangeValue) vm.rangeLabel = cr.label;
		vm.ranges.push({ label: cr.label, href: `/crypto/coin/${symbol}?range=${cr.value}`, active: cr.value === rangeValue });
	}

	const from = cryptoCoinRangeStart(rangeValue, new Date()).toISOString().slice(0, 10);
	const path = encodeURIComponent(symbol);
	const [quotes, history] = await Promise.all([
		apiJSON<CryptoQuoteResponse[]>(event, 'GET', `/v1/crypto/quote/${path}`).catch(() => null),
		apiJSON<CryptoHistoricalPoint[]>(event, 'GET', `/v1/crypto/history/full/${path}`, undefined, { query: { from } }).catch(
			() => null
		)
	]);
	const quote = quotes && quotes.length > 0 ? quotes[0] : null;
	const points = history ?? [];

	if (!quote && points.length === 0) vm.errorMessage = `Price data for ${symbol} isn’t available right now`;
	if (quote) {
		vm.name = quote.name;
		vm.price = formatCryptoPrice(quote.price);
		vm.change = formatSignedPercent(quote.changePercentage);
		vm.changeClass = changeClass(quote.changePercentage);
		vm.stats = cryptoCoinStats(quote);
	}
	if (points.length > 0) {
		const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
		vm.chart = {
			id: `crypto_coin_${symbol.toLowerCase()}_${rangeValue}`,
			labels: sorted.map((p) => p.date),
			closes: sorted.map((p) => p.close)
		};
	}
	return vm;
}

// ---------------------------------------------------------------------------
// /crypto/portfolio/holding[/{id}]

async function loadCryptoAssets(event: RequestEvent): Promise<CryptoAssetResponse[] | null> {
	try {
		return (await apiJSON<CryptoAssetResponse[]>(event, 'GET', '/v1/crypto/list')) ?? [];
	} catch {
		return null;
	}
}

/** loadCryptoHoldingFormVM */
export async function loadCryptoHoldingFormVM(event: RequestEvent, rawItemID: string): Promise<HoldingFormVM> {
	const assets = await loadCryptoAssets(event);
	const vm: HoldingFormVM = {
		itemID: '',
		symbol: '',
		name: '',
		quantity: '',
		avgCost: '',
		assets: (assets ?? []).map((a): AssetOptionVM => ({ symbol: a.symbol.toUpperCase(), name: a.name })),
		isEdit: false,
		error: ''
	};
	const itemID = rawItemID.trim();
	if (itemID === '') return vm;

	vm.isEdit = true;
	vm.itemID = itemID;
	const items = await listCryptoPortfolio(event);
	if (items === null) {
		vm.error = 'Could not load holding.';
		return vm;
	}
	const parsed = parseUUID(itemID);
	if (!parsed) {
		vm.error = 'Invalid holding.';
		return vm;
	}
	const item = items.find((i) => i.id.toLowerCase() === parsed);
	if (!item) {
		vm.error = 'Holding not found.';
		return vm;
	}
	vm.symbol = item.symbol.toUpperCase();
	vm.name = item.name;
	vm.quantity = formatShares(item.quantity);
	vm.avgCost = formatFloat(item.averageBuyPrice, 2);
	return vm;
}

/** parsePositiveFloat (onboarding.go): a comma decimal separator is accepted. */
function parsePositiveFloat(raw: string): number | null {
	const text = raw.replaceAll(',', '.');
	if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text)) return null;
	const v = Number(text);
	return Number.isFinite(v) && v > 0 ? v : null;
}

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');

async function buildCryptoPortfolioRequest(
	event: RequestEvent,
	form: FormData
): Promise<{ body: CryptoPortfolioItemRequest; error: '' } | { body: null; error: string }> {
	const symbol = str(form.get('symbol')).trim().toUpperCase();
	if (symbol === '') return { body: null, error: 'Select or enter a symbol.' };
	let name = str(form.get('name')).trim();
	if (name === '') {
		// lookupCryptoAssetName
		const assets = await loadCryptoAssets(event);
		name = (assets ?? []).find((a) => a.symbol.toUpperCase() === symbol)?.name ?? '';
	}
	if (name === '') name = symbol;
	const quantity = parsePositiveFloat(str(form.get('quantity')).trim());
	if (quantity === null) return { body: null, error: 'Enter a valid quantity.' };
	const averageBuyPrice = parsePositiveFloat(str(form.get('average_buy_price')).trim());
	if (averageBuyPrice === null) return { body: null, error: 'Enter a valid average buy price.' };
	return { body: { symbol, name, quantity, averageBuyPrice }, error: '' };
}

/** renderCryptoHoldingError: the panel again, with the error and what was typed. */
async function holdingError(event: RequestEvent, form: FormData, itemID: string, msg: string) {
	const vm = await loadCryptoHoldingFormVM(event, itemID);
	vm.error = msg;
	const symbol = str(form.get('symbol')).trim();
	if (symbol) vm.symbol = symbol.toUpperCase();
	const name = str(form.get('name')).trim();
	if (name) vm.name = name;
	const quantity = str(form.get('quantity')).trim();
	if (quantity) vm.quantity = quantity;
	const avg = str(form.get('average_buy_price')).trim();
	if (avg) vm.avgCost = avg;
	// Go answered 200 with the re-rendered panel; a failure keeps the dialog open.
	return fail(400, { vm });
}

/** submitCryptoHolding: create (itemID "") or update; success goes to /crypto/portfolio (Go: HX-Redirect). */
export async function submitCryptoHolding(event: RequestEvent, itemID: string) {
	await requireCrypto(event);
	const form = await event.request.formData();
	const built = await buildCryptoPortfolioRequest(event, form);
	if (built.error) return holdingError(event, form, itemID, built.error);
	if (itemID === '') {
		try {
			await apiJSON<CryptoPortfolioItemResponse>(event, 'POST', '/v1/crypto/portfolio', built.body);
		} catch {
			return holdingError(event, form, itemID, 'Could not add holding.');
		}
	} else {
		const parsed = parseUUID(itemID);
		if (!parsed) return holdingError(event, form, itemID, 'Invalid holding.');
		try {
			await apiJSON<CryptoPortfolioItemResponse>(event, 'PUT', `/v1/crypto/portfolio/${parsed}`, built.body);
		} catch {
			return holdingError(event, form, itemID, 'Could not update holding.');
		}
	}
	redirect(303, '/crypto/portfolio');
}

/** CryptoPortfolioHoldingDelete: Go re-rendered #crypto-holdings-body; here the page reloads its data. */
export async function deleteCryptoHolding(event: RequestEvent, itemID: string) {
	await requireCrypto(event);
	const parsed = parseUUID(itemID.trim());
	if (!parsed) return fail(400, { message: 'Invalid holding' });
	try {
		await apiJSON(event, 'DELETE', `/v1/crypto/portfolio/${parsed}`);
	} catch {
		return fail(502, { message: 'Could not remove holding' });
	}
	redirect(303, '/crypto/portfolio');
}
