// Port of norviq-web handlers/public_stock.go + public_stock_data.go: the
// crawlable, unauthenticated /s/{SYMBOL} page.
//
// Every fan-out leg degrades to an empty section rather than an error: the URL
// is allowlisted and in the sitemap, so it has to keep answering 200 even when
// a provider is down. Nothing here is user-scoped: the calls authenticate with
// PUBLIC_API_TOKEN and the result is cached and served to every visitor.

import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { config } from '#lib/server/env.js';
import { changeClass, formatFloat, formatSignedPercent } from '#lib/format.js';
import { goFormat } from '#lib/features/dashboard/shared.js';
import { PublicPageCache } from './page-cache.server.js';
import {
	insiderWindowPublicDays,
	mapCongressTrades,
	mapInsiderActivity,
	mapInstitutionalOwnership,
	mapPublicRecentEarnings,
	mapTechnicals,
	publicCongressRows,
	publicInsiderTrades,
	publicInstitutionalTop
} from './signals.js';
import type {
	CompanyProfileResponse,
	CongressTrade,
	HistoryResponse,
	InsiderActivityResponse,
	InstitutionalOwnershipResponse,
	RecentEarningsResponse,
	StockDetailsResponse,
	StockVM,
	TechnicalSignalsResponse,
	TickerSentimentResponse
} from './types.js';

/** publicSymbolPattern: the shape a ticker may take in the URL. */
const publicSymbolPattern = /^[A-Z.-]{1,10}$/;

/** api.BackendHTTPTimeout: one leg's cap is the whole render's cap. */
const publicRenderTimeoutMs = 60_000;

/** publicPageTTL */
const publicPageTTLMs = 15 * 60_000;

/** One cache per Worker isolate (Go: one per process). */
const cache = new PublicPageCache<StockVM>(publicPageTTLMs);

/** normalizePublicSymbol */
export function normalizePublicSymbol(raw: string): string | null {
	const symbol = (raw ?? '').trim().toUpperCase();
	return publicSymbolPattern.test(symbol) ? symbol : null;
}

/** publicAbsoluteURL */
export function publicAbsoluteURL(publicBase: string, path: string): string {
	return publicBase ? publicBase.replace(/\/+$/, '') + path : path;
}

function publicStockTitle(companyName: string, symbol: string): string {
	return `${companyName} (${symbol}) stock analysis — Norviq`;
}

function publicStockDescription(companyName: string, symbol: string): string {
	return `${companyName} (${symbol}) price, 12-month trend, earnings history, and social sentiment. Free stock analysis from Norviq.`;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function cachedPublicStock(event: RequestEvent, symbol: string): Promise<StockVM> {
	return cache.do(symbol, () => loadPublicStockViewModel(event, symbol));
}

export async function loadPublicStockViewModel(
	event: RequestEvent,
	symbol: string
): Promise<StockVM> {
	const cfg = config();
	const base = cfg.publicBaseURL;
	const vm: StockVM = {
		symbol,
		companyName: symbol,
		price: '',
		changePct: '',
		changeTone: '',
		currency: '',
		exchange: '',
		sparkline: null,
		rangeLabel: '',
		sentiment: { present: false, label: '', score: '', postCount: 0 },
		earnings: { nextDate: '', streakHeadline: '', streakTone: '', quarters: [] },
		technicals: { present: false },
		insider: { present: false, windowLabel: '', buys: 0, sells: 0, netShares: '', trades: [] },
		institutional: { present: false, holders: [] },
		congress: { present: false, trades: [] },
		gateHref: '/signup?next=/portfolio/' + symbol,
		title: '',
		metaDescription: '',
		canonicalURL: publicAbsoluteURL(base, '/s/' + symbol),
		ogImageURL: publicAbsoluteURL(base, '/static/images/og.png')
	};

	if (cfg.publicAPIToken) {
		// Detached from any one visitor: the result is shared by every request
		// parked behind it, so it is bounded by its own deadline.
		const signal = AbortSignal.timeout(publicRenderTimeoutMs);
		const seg = encodeURIComponent(symbol);
		const leg = <T>(
			what: string,
			path: string,
			query?: Record<string, string | number>
		): Promise<T | null> =>
			apiJSON<T>(event, 'GET', path, undefined, { auth: 'public', query, signal }).catch((err) => {
				if (what === 'earnings' && typeof err?.status === 'number') {
					console.warn('public stock earnings fetch refused', {
						symbol,
						status: err.status,
						impact: 'the earnings section is missing from this page for the cache TTL'
					});
				} else {
					console.warn(`public stock ${what} fetch failed`, { symbol, error: String(err) });
				}
				return null;
			});

		const to = new Date();
		const from = new Date(to);
		from.setUTCFullYear(from.getUTCFullYear() - 1);

		const [
			details,
			profile,
			history,
			earnings,
			sentiment,
			technicals,
			insider,
			institutional,
			congress
		] = await Promise.all([
			leg<StockDetailsResponse>('details', '/v1/market/details', { symbol }),
			leg<CompanyProfileResponse>('profile', `/v1/market/profile/${seg}`),
			leg<HistoryResponse>('history', `/v1/market/history/${seg}`, {
				from: ymd(from),
				to: ymd(to)
			}),
			// The un-gated teaser, not the Pro-gated /v1/market/earnings/{symbol}.
			leg<RecentEarningsResponse>('earnings', `/v1/market/earnings/${seg}/recent`),
			// Pro-gated upstream; a 403 just hides the badge.
			leg<TickerSentimentResponse>('sentiment', `/v1/insights/tickers/${seg}/sentiment`),
			leg<TechnicalSignalsResponse>('technicals', `/v1/market/technicals/${seg}`),
			leg<InsiderActivityResponse>('insider', `/v1/market/insider/${seg}`, {
				days: insiderWindowPublicDays
			}),
			leg<InstitutionalOwnershipResponse>('institutional', `/v1/market/institutional/${seg}`),
			leg<{ trades: CongressTrade[] | null }>('congress', `/v1/market/congress/${seg}`)
		]);

		applyHeader(vm, details, profile);
		applySparkline(vm, history);
		applySentiment(vm, sentiment);
		vm.earnings = mapPublicRecentEarnings(earnings);
		vm.technicals = mapTechnicals(technicals);
		vm.insider = mapInsiderActivity(insider, publicInsiderTrades);
		vm.institutional = mapInstitutionalOwnership(institutional, publicInstitutionalTop);
		vm.congress = mapCongressTrades(congress?.trades, publicCongressRows);
	}

	vm.title = publicStockTitle(vm.companyName, symbol);
	vm.metaDescription = publicStockDescription(vm.companyName, symbol);
	return vm;
}

function applyHeader(
	vm: StockVM,
	details: StockDetailsResponse | null,
	profile: CompanyProfileResponse | null
) {
	if (profile) {
		const name = (profile.name ?? '').trim();
		if (name) vm.companyName = name;
		vm.currency = (profile.currency ?? '').trim();
		vm.exchange = (profile.exchange ?? '').trim();
	}
	if (!details) return;
	const company = (details.company ?? '').trim();
	if (company && vm.companyName === vm.symbol) vm.companyName = company;
	if (details.latestPrice) vm.price = '$' + formatFloat(details.latestPrice, 2);
	vm.changePct = formatSignedPercent(details.changePercent ?? 0);
	vm.changeTone = changeClass(details.changePercent ?? 0);
}

function applySparkline(vm: StockVM, history: HistoryResponse | null) {
	const bars = history?.bars ?? [];
	if (bars.length < 2) return;
	const sorted = [...bars].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	let low = sorted[0].close;
	let high = sorted[0].close;
	const points = sorted.map((bar) => {
		low = Math.min(low, bar.close);
		high = Math.max(high, bar.close);
		return { label: goFormat(new Date(bar.date), 'Jan 2006'), value: bar.close };
	});
	const tone = sorted[sorted.length - 1].close < sorted[0].close ? 'negative' : 'positive';
	vm.sparkline = { points, tone };
	vm.rangeLabel = `12-month range $${formatFloat(low, 2)} – $${formatFloat(high, 2)}`;
}

function applySentiment(vm: StockVM, sentiment: TickerSentimentResponse | null) {
	const agg = sentiment?.aggregate;
	if (!agg || !(agg.label ?? '').trim()) return;
	vm.sentiment = { present: true, label: agg.label, postCount: agg.postCount, score: '' };
	if (agg.score != null)
		vm.sentiment.score = (agg.score >= 0 ? '+' : '') + formatFloat(agg.score, 2);
}
