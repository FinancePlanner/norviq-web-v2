import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { formatCurrency, formatFloat, formatPercentValue as formatPercent, formatSignedCurrency, formatSignedPercent } from '#lib/format.js';
import { loadEarningsVisualizerViewModel } from '../earningsviz/visualizer.server.js';
import { emptyVisualizer } from '../earningsviz/types.js';
import { civilDate, formatISODate, formatJan2, labelTitle, MONTH_NAMES, monthAbbrev, tryJSON } from './fetch.server.js';
import type {
	DividendsViewModel,
	EarningsDayVM,
	EarningsEventVM,
	EarningsViewModel,
	NewsArticleVM,
	NewsViewModel,
	SectorGainsRowVM,
	SectorGainsViewModel
} from './types.js';

// Port of handlers/portfolio_subpages_data.go LoadSectorGainsViewModel,
// LoadEarningsViewModel, LoadDividendsViewModel and LoadNewsViewModel. The Go
// server runs in UTC, so "today" and the calendar month are UTC here too.

type S = components['schemas'];

export async function loadSectorGainsViewModel(event: RequestEvent): Promise<SectorGainsViewModel> {
	const vm: SectorGainsViewModel = {
		subtitle: 'Unrealized P/L grouped by sector',
		totalUnrealizedPnl: '',
		totalMarketValue: '',
		rows: [],
		chart: null,
		hasData: false,
		loadError: false
	};
	const res = await tryJSON<S['SectorGainsResponse']>(event, 'GET', '/v1/statistics/stocks/sector-gains');
	if (!res.data) {
		vm.loadError = true;
		return vm;
	}
	const payload = res.data;
	vm.totalUnrealizedPnl = formatSignedCurrency(payload.totalUnrealizedPnl);
	vm.totalMarketValue = formatCurrency(payload.totalMarketValue);

	const sectors = payload.sectors ?? [];
	vm.rows = sectors.map(
		(sector): SectorGainsRowVM => ({
			sector: sector.sector,
			marketValue: formatCurrency(sector.marketValue),
			costBasis: formatCurrency(sector.costBasis),
			unrealizedPnl: formatSignedCurrency(sector.unrealizedPnl),
			unrealizedPnlPercent: formatSignedPercent(sector.unrealizedPnlPercent),
			weightPercent: formatPercent(sector.weightPercent),
			positive: sector.unrealizedPnl >= 0
		})
	);
	vm.hasData = vm.rows.length > 0;
	if (vm.hasData) {
		vm.chart = { labels: sectors.map((s) => s.sector), values: sectors.map((s) => s.unrealizedPnl) };
		vm.subtitle = `${vm.rows.length} sectors · unrealized P/L by sector`;
	}
	return vm;
}

export function emptyEarningsViewModel(now = new Date()): EarningsViewModel {
	return {
		monthLabel: `${MONTH_NAMES[now.getUTCMonth()]} ${now.getUTCFullYear()}`,
		calendarDays: [],
		upcoming: [],
		loadError: false,
		visualizer: emptyVisualizer()
	};
}

export async function loadEarningsViewModel(event: RequestEvent, selectedSymbol: string, selectedFiling: string): Promise<EarningsViewModel> {
	const now = new Date();
	const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
	const vm = emptyEarningsViewModel(now);

	const [calendarRes, stocksRes] = await Promise.all([
		tryJSON<S['EarningsResponse'][]>(event, 'GET', '/v1/market/earnings-calendar', undefined, {
			query: { from: formatISODate(monthStart), to: formatISODate(monthEnd) }
		}),
		tryJSON<S['StockListItem'][]>(event, 'GET', '/v1/stocks')
	]);
	vm.loadError = calendarRes.failed;
	const events = calendarRes.data ?? [];
	let holdings: Set<string> | null = null;
	if (stocksRes.data) holdings = new Set(stocksRes.data.map((s) => s.symbol.toUpperCase()));

	const eventsByDay = new Map<number, S['EarningsResponse'][]>();
	for (const ev of events) {
		const d = civilDate(ev.date);
		if (!d || d.getUTCMonth() !== monthStart.getUTCMonth() || d.getUTCFullYear() !== monthStart.getUTCFullYear()) continue;
		const day = d.getUTCDate();
		eventsByDay.set(day, [...(eventsByDay.get(day) ?? []), ev]);
	}

	vm.calendarDays = buildEarningsCalendar(monthStart, monthEnd, now, eventsByDay);
	vm.upcoming = mapUpcomingEarnings(events, holdings, now);
	let visualizerSymbol = selectedSymbol.trim().toUpperCase();
	if (visualizerSymbol === '' && vm.upcoming.length > 0) visualizerSymbol = vm.upcoming[0].symbol;
	vm.visualizer = await loadEarningsVisualizerViewModel(event, visualizerSymbol, selectedFiling, '/portfolio/earnings');
	return vm;
}

function buildEarningsCalendar(monthStart: Date, monthEnd: Date, today: Date, eventsByDay: Map<number, S['EarningsResponse'][]>): EarningsDayVM[] {
	const pad = (): EarningsDayVM => ({ day: 0, inMonth: false, hasEvents: false, isToday: false, eventCount: 0, symbols: [] });
	const cells: EarningsDayVM[] = [];
	for (let i = 0; i < monthStart.getUTCDay(); i++) cells.push(pad());
	const sameMonth = today.getUTCFullYear() === monthStart.getUTCFullYear() && today.getUTCMonth() === monthStart.getUTCMonth();
	for (let day = 1; day <= monthEnd.getUTCDate(); day++) {
		const dayEvents = eventsByDay.get(day) ?? [];
		const symbols = dayEvents
			.slice(0, 2)
			.map((ev) => ev.symbol)
			.filter((s) => s !== '');
		cells.push({
			day,
			inMonth: true,
			hasEvents: dayEvents.length > 0,
			isToday: sameMonth && today.getUTCDate() === day,
			eventCount: dayEvents.length,
			symbols
		});
	}
	return cells;
}

function mapUpcomingEarnings(events: S['EarningsResponse'][], holdings: Set<string> | null, now: Date): EarningsEventVM[] {
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const dated = events.map((ev) => ({ ev, date: civilDate(ev.date) })).filter((x): x is { ev: S['EarningsResponse']; date: Date } => x.date !== null);
	dated.sort((a, b) => a.date.getTime() - b.date.getTime());

	const out: EarningsEventVM[] = [];
	for (const { ev, date } of dated) {
		if (date.getTime() < today) continue;
		const row: EarningsEventVM = {
			symbol: ev.symbol,
			date: formatJan2(date),
			epsEstimate: '',
			hasPortfolio: holdings?.has(ev.symbol.toUpperCase()) ?? false,
			detailURL: '/portfolio/' + ev.symbol.toLowerCase() + '/earnings'
		};
		if (ev.epsEstimated !== null && ev.epsEstimated !== undefined) row.epsEstimate = '$' + formatFloat(ev.epsEstimated, 2);
		out.push(row);
		if (out.length >= 12) break;
	}
	return out;
}

export function emptyDividendsViewModel(): DividendsViewModel {
	return { annualProjectedIncome: '', upcoming: [], monthlyChart: null, loadError: false };
}

export async function loadDividendsViewModel(event: RequestEvent): Promise<DividendsViewModel> {
	const vm = emptyDividendsViewModel();
	const res = await tryJSON<S['PortfolioDividendsResponse']>(event, 'GET', '/v1/portfolio/dividends');
	if (res.failed) {
		vm.loadError = true;
		return vm;
	}
	if (!res.data) return vm;

	const goJan2 = (raw: string) => {
		const d = civilDate(raw);
		return d ? formatJan2(d) : raw;
	};
	vm.annualProjectedIncome = formatCurrency(res.data.annualProjectedIncome);
	vm.upcoming = (res.data.upcomingDividends ?? []).map((div) => ({
		symbol: div.symbol,
		exDividendDate: goJan2(div.exDividendDate),
		paymentDate: goJan2(div.paymentDate),
		amountPerShare: formatCurrency(div.amountPerShare),
		projectedTotal: formatCurrency(div.projectedTotal)
	}));

	const labels: string[] = [];
	const values: number[] = [];
	for (const month of res.data.monthlyBreakdown ?? []) {
		// time.Parse("2006-01", …): exactly YYYY-MM with a valid month.
		const m = /^(\d{4})-(\d{2})$/.exec(month.month);
		labels.push(m && +m[2] >= 1 && +m[2] <= 12 ? monthAbbrev(+m[2] - 1) : month.month);
		values.push(month.amount);
	}
	if (labels.length > 0) vm.monthlyChart = { labels, values };
	return vm;
}

const NEWS_FILTERS = new Set(['holdings', 'watchlist', 'sectors', 'market', 'saved']);

export async function loadNewsViewModel(event: RequestEvent, filterRaw: string): Promise<NewsViewModel> {
	let filter = filterRaw.trim().toLowerCase();
	if (!NEWS_FILTERS.has(filter)) filter = 'for_you';
	const vm: NewsViewModel = { articles: [], filter, loadError: false, isPro: false };

	if (filter === 'saved') {
		const res = await tryJSON<S['NewsItemResponse'][]>(event, 'GET', '/v1/news');
		if (res.failed) {
			vm.loadError = true;
			return vm;
		}
		vm.articles = (res.data ?? []).map(mapNewsArticleVM);
		return vm;
	}

	const res = await tryJSON<S['ThesisWatchFeedResponse']>(event, 'GET', '/v1/news/thesis-watch', undefined, { query: { scope: filter, limit: 30 } });
	if (!res.data) {
		vm.loadError = true;
		return vm;
	}
	vm.isPro = res.data.capabilities.isPro;
	vm.articles = (res.data.items ?? []).map(mapThesisWatchArticleVM);
	return vm;
}

const trimmed = (v: string | null | undefined) => (v ?? '').trim();

function mapThesisWatchArticleVM(story: S['ThesisWatchStory']): NewsArticleVM {
	let summary = '';
	if (story.summary !== undefined && story.summary !== null) summary = story.summary.trim();
	else if (story.providerSummary !== undefined && story.providerSummary !== null) summary = story.providerSummary.trim();
	return {
		id: story.id,
		headline: story.headline,
		source: trimmed(story.source) || 'Financial news',
		symbol: (story.symbols ?? []).join(' · '),
		timeAgo: formatPublishedAgo(story.publishedAt),
		url: story.url,
		summary,
		relationship: labelTitle(story.relationship),
		eventType: labelTitle(story.eventType.replaceAll('_', ' ')),
		severity: story.severity.toUpperCase(),
		whyItMatters: trimmed(story.whyItMatters),
		exposure: story.exposure ? `${formatFloat(story.exposure.weightPercent, 1)}% exposure` : '',
		thesisImpact: labelTitle(story.thesisImpact.replaceAll('_', ' ')),
		isThesisWatch: true,
		isRead: story.isRead
	};
}

function mapNewsArticleVM(article: S['NewsItemResponse']): NewsArticleVM {
	return {
		id: article.id.toLowerCase(),
		headline: article.headline,
		source: trimmed(article.source) || 'Market',
		symbol: article.symbol,
		timeAgo: formatPublishedAgo(article.publishedAt),
		url: trimmed(article.url),
		summary: trimmed(article.summary),
		relationship: '',
		eventType: '',
		severity: '',
		whyItMatters: '',
		exposure: '',
		thesisImpact: '',
		isThesisWatch: false,
		isRead: false,
		// loadNewsArticleFormVM re-read the same list item for the edit modal.
		form: {
			articleID: article.id.toLowerCase(),
			isEdit: true,
			symbol: article.symbol.toUpperCase(),
			headline: article.headline,
			source: trimmed(article.source),
			url: trimmed(article.url),
			summary: trimmed(article.summary),
			publishedAt: trimmed(article.publishedAt),
			error: ''
		}
	};
}

// time.Parse layouts tried by formatPublishedAgo: RFC 3339 (with or without
// fractional seconds) and "2006-01-02 15:04:05" (UTC).
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i;
const SQL_TIME = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

/** handlers.formatPublishedAgo */
export function formatPublishedAgo(rawInput: string, now = Date.now()): string {
	const raw = rawInput.trim();
	if (raw === '') return '';
	let m = RFC3339.exec(raw);
	let iso = raw;
	if (!m) {
		m = SQL_TIME.exec(raw);
		if (!m) return raw;
		iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
	}
	const published = Date.parse(iso);
	if (Number.isNaN(published)) return raw;

	const diff = now - published;
	const minute = 60_000;
	const hour = 60 * minute;
	if (diff < minute) return 'Just now';
	if (diff < hour) return `${Math.trunc(diff / minute)}m ago`;
	if (diff < 24 * hour) return `${Math.trunc(diff / hour)}h ago`;
	if (diff < 7 * 24 * hour) return `${Math.trunc(diff / (24 * hour))}d ago`;
	// published.Format("Jan 2") in the time's own offset: the date as written.
	return `${monthAbbrev(+m[2] - 1)} ${+m[3]}`;
}
