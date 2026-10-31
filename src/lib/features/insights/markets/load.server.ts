// Server loads for /markets. Ports of norviq-web internal/handlers/
// markets.go (MarketsOverview, mapMovers), markets_earnings_data.go
// (LoadMarketsEarningsViewModel), markets_congress.go
// (LoadMarketsCongressViewModel) + market_signals_data.go mapCongressTrades,
// and markets_sentiment.go (MarketsSentimentBoard, mapTrendingRows).

import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { formatCompactCurrency, formatFloat } from '#lib/format.js';
import { buildSentimentBadge, sentimentPostCountLabel } from '#lib/components/norviq/sentiment.js';
import type { CongressTradeVM } from '#lib/components/norviq/market-signals.js';
import { getJSON } from '#lib/features/dashboard/fetch.server.js';
import { goFormat } from '#lib/features/dashboard/shared.js';
import {
	formatChangePct,
	formatSentimentDelta,
	formatVolumeZ,
	type CongressFeedVM,
	type EarningsCalendarVM,
	type EarningsDayVM,
	type MoverVM,
	type OverviewVM,
	type SentimentBoardVM,
	type SentimentRowVM
} from './types.js';

type S = components['schemas'];

// ---------------------------------------------------------------------------
// MarketsOverview: one backend call (the backend caches it for 60s).

function mapMovers(items: S['MarketMover'][] | null | undefined): MoverVM[] {
	return (items ?? []).map((item) => ({
		symbol: item.symbol,
		name: item.name,
		price: formatFloat(item.price, 2),
		change: formatChangePct(item.changePct),
		changePct: item.changePct
	}));
}

export async function loadMarketsOverview(event: RequestEvent): Promise<OverviewVM> {
	const vm: OverviewVM = { indices: [], gainers: [], losers: [], heatmapTiles: [], asOf: '' };
	const res = await getJSON<S['MarketOverviewResponse']>(event, '/v1/market/overview');
	if (!res.data) {
		console.warn('load market overview', res.status);
		return vm;
	}
	const overview = res.data;
	vm.asOf = overview.asOf;
	vm.indices = (overview.indices ?? []).map((index) => ({
		label: index.label,
		price: formatFloat(index.price, 2),
		change: formatChangePct(index.changePct),
		changePct: index.changePct,
		isProxy: index.isProxy,
		proxy: index.symbol
	}));
	vm.gainers = mapMovers(overview.gainers);
	vm.losers = mapMovers(overview.losers);
	vm.heatmapTiles = (overview.heatmap ?? []).map((tile) => ({
		symbol: tile.symbol,
		name: tile.name,
		sector: tile.sector,
		marketCap: tile.marketCap,
		changePct: tile.changePct
	}));
	return vm;
}

// ---------------------------------------------------------------------------
// Earnings calendar

const EARNINGS_WEEKDAYS = 5;
const EARNINGS_NAME_LOOKUPS = 25;
const DAY_MS = 86_400_000;

/** A civil date at UTC midnight (the Go pod runs in UTC). */
const utcDay = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const addDays = (t: Date, n: number) => new Date(t.getTime() + n * DAY_MS);
const isoDay = (t: Date) => t.toISOString().slice(0, 10);

/** mondayOf: midnight on the Monday that opened t's week (Sunday belongs to the week before). */
function mondayOf(t: Date): Date {
	const offset = (t.getUTCDay() + 6) % 7;
	const day = addDays(t, -offset);
	return utcDay(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
}

/** parseEarningsWeek: any valid YYYY-MM-DD snaps to its Monday; anything else is this week. */
function parseEarningsWeek(raw: string | null, now: Date): Date {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw ?? '').trim());
	if (m) {
		const t = utcDay(+m[1], +m[2] - 1, +m[3]);
		// time.Parse rejects out-of-range days ("2026-02-31") rather than rolling over.
		if (t.getUTCFullYear() === +m[1] && t.getUTCMonth() === +m[2] - 1 && t.getUTCDate() === +m[3])
			return mondayOf(t);
	}
	return mondayOf(now);
}

const parseEarningsScope = (raw: string | null): 'all' | 'mine' =>
	(raw ?? '').trim().toLowerCase() === 'mine' ? 'mine' : 'all';

const marketsEarningsHref = (weekStart: Date, scope: string) =>
	`/markets/earnings?week=${isoDay(weekStart)}&scope=${scope}`;

function earningsWeekLabel(weekStart: Date, weekEnd: Date): string {
	if (weekStart.getUTCMonth() === weekEnd.getUTCMonth()) {
		return `${goFormat(weekStart, 'Jan')} ${weekStart.getUTCDate()} – ${weekEnd.getUTCDate()}, ${weekEnd.getUTCFullYear()}`;
	}
	return `${goFormat(weekStart, 'Jan 2')} – ${goFormat(weekEnd, 'Jan 2, 2006')}`;
}

function buildEarningsWeekdays(weekStart: Date, now: Date): EarningsDayVM[] {
	const today = isoDay(now);
	const days: EarningsDayVM[] = [];
	for (let i = 0; i < EARNINGS_WEEKDAYS; i++) {
		const day = addDays(weekStart, i);
		days.push({
			label: goFormat(day, 'Mon'),
			dateLabel: goFormat(day, 'Jan 2'),
			isoDate: isoDay(day),
			isToday: isoDay(day) === today,
			rows: []
		});
	}
	return days;
}

const optionalCompactCurrency = (v: number | null | undefined) =>
	v === null || v === undefined ? '-' : formatCompactCurrency(v);

/** The date part of the calendar's "YYYY-MM-DD" (or a timestamp read in UTC). */
const eventDay = (raw: string) => /^\d{4}-\d{2}-\d{2}/.exec(raw)?.[0] ?? '';

function fillEarningsWeekdays(
	days: EarningsDayVM[],
	events: S['EarningsResponse'][],
	mine: Set<string>,
	names: Map<string, string>
) {
	const column = new Map(days.map((d, i) => [d.isoDate, i]));
	const sorted = [...events].sort((a, b) => {
		const da = eventDay(a.date);
		const db = eventDay(b.date);
		if (da === db) return a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0;
		return da < db ? -1 : 1;
	});
	for (const ev of sorted) {
		const index = column.get(eventDay(ev.date));
		if (index === undefined) continue;
		const symbol = ev.symbol.trim().toUpperCase();
		if (!symbol) continue;
		days[index].rows.push({
			symbol,
			company: names.get(symbol) ?? '',
			detailURL: '/portfolio/' + symbol + '/earnings',
			epsEstimate: optionalCompactCurrency(ev.epsEstimated),
			revenueEstimate: optionalCompactCurrency(ev.revenueEstimated),
			isMine: mine.has(symbol)
		});
	}
}

/** loadFollowedSymbols: holdings ∪ watchlist, uppercased. Failures just shrink the set. */
async function loadFollowedSymbols(event: RequestEvent): Promise<Set<string>> {
	const out = new Set<string>();
	const add = (symbol: string) => {
		const s = (symbol ?? '').trim().toUpperCase();
		if (s) out.add(s);
	};
	const [stocks, watchlist] = await Promise.all([
		getJSON<{ symbol: string }[]>(event, '/v1/stocks'),
		getJSON<{ symbol: string }[]>(event, '/v1/watchlist')
	]);
	if (stocks.data) stocks.data.forEach((s) => add(s.symbol));
	else console.warn('markets earnings holdings fetch failed', stocks.status);
	if (watchlist.data) watchlist.data.forEach((w) => add(w.symbol));
	else console.warn('markets earnings watchlist fetch failed', watchlist.status);
	return out;
}

/** loadFollowedCompanyNames: profile names for followed symbols reporting this week (capped, 8 at a time). */
async function loadFollowedCompanyNames(
	event: RequestEvent,
	events: S['EarningsResponse'][],
	mine: Set<string>
): Promise<Map<string, string>> {
	const wanted: string[] = [];
	const seen = new Set<string>();
	for (const ev of events) {
		const symbol = ev.symbol.trim().toUpperCase();
		if (!mine.has(symbol) || seen.has(symbol)) continue;
		seen.add(symbol);
		wanted.push(symbol);
		if (wanted.length === EARNINGS_NAME_LOOKUPS) break;
	}
	const names = new Map<string, string>();
	for (let i = 0; i < wanted.length; i += 8) {
		await Promise.all(
			wanted.slice(i, i + 8).map(async (symbol) => {
				const res = await getJSON<{ name?: string | null }>(
					event,
					'/v1/market/profile/' + encodeURIComponent(symbol)
				);
				if (res.failed) console.warn('markets earnings company name fetch failed', symbol);
				const name = (res.data?.name ?? '').trim();
				if (name) names.set(symbol, name);
			})
		);
	}
	return names;
}

export async function loadMarketsEarnings(
	event: RequestEvent,
	now = new Date()
): Promise<EarningsCalendarVM> {
	const weekStart = parseEarningsWeek(event.url.searchParams.get('week'), now);
	const weekEnd = addDays(weekStart, EARNINGS_WEEKDAYS - 1);
	const scope = parseEarningsScope(event.url.searchParams.get('scope'));
	const vm: EarningsCalendarVM = {
		weekStart: isoDay(weekStart),
		weekLabel: earningsWeekLabel(weekStart, weekEnd),
		scope,
		prevHref: marketsEarningsHref(addDays(weekStart, -7), scope),
		nextHref: marketsEarningsHref(addDays(weekStart, 7), scope),
		thisWeekHref: marketsEarningsHref(mondayOf(now), scope),
		allHref: marketsEarningsHref(weekStart, 'all'),
		mineHref: marketsEarningsHref(weekStart, 'mine'),
		days: buildEarningsWeekdays(weekStart, now),
		rowCount: 0,
		loadError: false
	};

	const [calendar, mine] = await Promise.all([
		getJSON<S['EarningsResponse'][]>(event, '/v1/market/earnings-calendar', {
			from: isoDay(weekStart),
			to: isoDay(weekEnd)
		}),
		loadFollowedSymbols(event)
	]);
	let events: S['EarningsResponse'][] = [];
	if (calendar.data) events = calendar.data;
	else {
		vm.loadError = true;
		console.warn('markets earnings calendar fetch failed', vm.weekStart, calendar.status);
	}
	if (scope === 'mine') events = events.filter((ev) => mine.has(ev.symbol.trim().toUpperCase()));
	const names = await loadFollowedCompanyNames(event, events, mine);
	fillEarningsWeekdays(vm.days, events, mine, names);
	vm.rowCount = vm.days.reduce((n, d) => n + d.rows.length, 0);
	return vm;
}

// ---------------------------------------------------------------------------
// Congress feed

const MARKETS_CONGRESS_ROWS = 100;

const congressChamberLabel = (chamber: string) => (chamber === 'senate' ? 'Senate' : 'House');

function congressTypeLabel(kind: string): string {
	switch (kind) {
		case 'purchase':
			return 'Purchase';
		case 'sale':
			return 'Sale';
		case 'exchange':
			return 'Exchange';
		default:
			return 'Other';
	}
}

/** formatISODate: a YYYY-MM-DD string as "Jan 2, 2006"; anything unparseable is "—". */
function formatISODate(value: string | null | undefined): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value ?? '').trim());
	if (!m) return '—';
	const t = utcDay(+m[1], +m[2] - 1, +m[3]);
	if (t.getUTCMonth() !== +m[2] - 1 || t.getUTCDate() !== +m[3]) return '—';
	return goFormat(t, 'Jan 2, 2006');
}

/** market_signals_data.go mapCongressTrades (the trades only). */
function mapCongressTrades(trades: S['CongressTrade'][], maxRows: number): CongressTradeVM[] {
	const out: CongressTradeVM[] = [];
	for (const trade of trades) {
		if (out.length === maxRows) break;
		const symbol = (trade.symbol ?? '').trim().toUpperCase();
		const amount = (trade.amountRange ?? '').trim();
		out.push({
			politician: trade.politician,
			chamber: congressChamberLabel(trade.chamber),
			type: congressTypeLabel(trade.type),
			amountRange: amount || '—',
			// transactionDate is a `format: date`; Go formats the parsed value.
			transactionDate: formatISODate(trade.transactionDate.slice(0, 10)),
			disclosureDate: formatISODate(trade.disclosureDate),
			symbol,
			symbolHref: symbol ? '/portfolio/' + symbol : ''
		});
	}
	return out;
}

export async function loadMarketsCongress(
	event: RequestEvent
): Promise<Omit<CongressFeedVM, 'pilotsEnabled'>> {
	const res = await getJSON<S['CongressTradesResponse']>(event, '/v1/market/congress/recent', {
		limit: MARKETS_CONGRESS_ROWS
	});
	if (!res.data) {
		console.warn('recent congress trades fetch failed', res.status);
		return { trades: [], loadError: true };
	}
	return {
		trades: mapCongressTrades(res.data.trades ?? [], MARKETS_CONGRESS_ROWS),
		loadError: false
	};
}

// ---------------------------------------------------------------------------
// Sentiment board

const TRENDING_BOARD_LIMIT = 8;

function mapTrendingRows(
	entries: S['TrendingSentimentEntry'][] | null | undefined
): SentimentRowVM[] {
	return (entries ?? []).map((entry) => {
		const delta = formatSentimentDelta(entry.delta1d);
		return {
			symbol: entry.symbol,
			detailURL: '/portfolio/' + entry.symbol.toLowerCase(),
			badge: buildSentimentBadge(entry.label, entry.score, null, entry.postCount),
			postCount: sentimentPostCountLabel(entry.postCount),
			volumeLabel: formatVolumeZ(entry.volumeZ),
			deltaLabel: delta.label,
			hasDelta: delta.ok,
			deltaUp: delta.up
		};
	});
}

export async function loadSentimentBoard(event: RequestEvent): Promise<SentimentBoardVM> {
	const vm: SentimentBoardVM = {
		asOf: '',
		hasData: false,
		emptyReason: 'Sentiment data is not available right now.',
		mostDiscussed: [],
		bullish: [],
		bearish: [],
		biggestSwings: []
	};
	const res = await getJSON<S['MarketTrendingResponse']>(event, '/v1/insights/sentiment/trending', {
		limit: TRENDING_BOARD_LIMIT
	});
	if (!res.data) {
		console.warn('load trending sentiment', res.status);
		return vm;
	}
	const board = res.data;
	if (!board.asOfDate) {
		vm.emptyReason = 'No sentiment has been collected yet. The daily run has not produced results.';
		return vm;
	}
	vm.hasData = true;
	vm.asOf = board.asOfDate;
	vm.mostDiscussed = mapTrendingRows(board.mostDiscussed);
	vm.bullish = mapTrendingRows(board.bullish);
	vm.bearish = mapTrendingRows(board.bearish);
	vm.biggestSwings = mapTrendingRows(board.biggestSwings);
	return vm;
}
