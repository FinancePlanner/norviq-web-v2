// handlers/stock_detail_data.go (LoadStockDetailViewModel),
// stock_detail_market_depth.go and stock_detail_tabs_data.go
// (loadStockDetailTabData and the per-tab loaders).

import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import {
	changeClass,
	formatCompactCurrency,
	formatCompactNumber,
	formatCurrency,
	formatSignedPercent
} from '#lib/format.js';
import { stockTabFeature } from '#lib/nav.js';
import {
	buildSentimentBadge,
	sentimentBadgeClass,
	sentimentPostCountLabel
} from '#lib/components/norviq/sentiment.js';
import { goFormat } from '#lib/features/dashboard/shared.js';
import { formatShares } from '#lib/features/portfolio/market.server.js';
import { loadEarningsVisualizerViewModel } from '#lib/features/portfolio/earningsviz/visualizer.server.js';
import { loadAnalysisTab } from './analysis/load.server.js';
import { emptyAnalysisTab } from './analysis/types.js';
import { loadChartBuilderTab } from './builder/load.server.js';
import { mapGradesConsensus, type GradesConsensusResponse } from './consensus.js';
import { emptyConsensus, type StatementRowVM } from './types.js';
import type { DetailViewModel, EarningsTabVM, SentimentTabVM, TargetRowVM } from './detail.js';
import { earningsRowVerdict, headlineEarningsStreak } from './earnings.js';
import {
	derefString,
	formatOptionalCompactCurrency,
	formatOptionalCurrency,
	formatOptionalNumber,
	formatOptionalRatioPercent,
	formatOptionalSignedPercent,
	goDate,
	isoDate,
	labelTitle,
	optionalString,
	positionSymbolInitial
} from './format.js';
import {
	emptyCongress,
	emptyInsider,
	emptyInstitutional,
	insiderWindowTabDays,
	loadCongressTrades,
	loadInsiderActivity,
	loadInstitutionalOwnership,
	loadTechnicals,
	ownershipTabCongressRows,
	ownershipTabHolders,
	ownershipTabInsiderRows
} from './market-signals.server.js';

type S = components['schemas'];
const enc = encodeURIComponent;

/** Go's `resp.JSON200 != nil` read: the body on a 2xx, null on any failure. */
async function get<T>(
	event: RequestEvent,
	path: string,
	query?: Record<string, string | number>,
	what = path
): Promise<T | null> {
	try {
		return (await apiJSON<T>(event, 'GET', path, undefined, query ? { query } : {})) ?? null;
	} catch (err) {
		if (!isAPIError(err)) console.warn(`stock ${what} fetch failed`, err);
		return null;
	}
}

export function emptyDetailViewModel(symbol: string, tab: string): DetailViewModel {
	return {
		symbol,
		activeTab: tab,
		hasLoadError: false,
		errorMessage: '',
		positionID: '',
		hasPosition: false,
		isPro: false,
		companyName: '',
		companyMeta: '',
		positionLine: '',
		currentPrice: '',
		changePercent: '',
		changeClass: '',
		positionValue: '',
		costBasis: '',
		symbolInitial: positionSymbolInitial(symbol),
		return3M: '',
		return3MClass: '',
		return6M: '',
		return6MClass: '',
		returnYTD: '',
		returnYTDClass: '',
		shares: '',
		buyPrice: '',
		buyDate: '',
		category: '',
		notes: '',
		hasProfile: false,
		exchange: '',
		industry: '',
		country: '',
		ipo: '',
		currency: '',
		estimateCurrency: '',
		marketCap: '',
		sharesOutstanding: '',
		website: '',
		hasValuation: false,
		bearRange: '',
		baseRange: '',
		bullRange: '',
		valuationRationale: '',
		valuationTargetDate: '',
		targets: [],
		consensus: emptyConsensus(),
		basicFinancials: { hasData: false, error: '', metrics: [] },
		chart: { hasData: false, error: '', labels: [], values: [] },
		chartBuilder: { groups: [], error: '' },
		statements: {
			hasData: false,
			error: '',
			balanceSheet: [],
			cashFlow: [],
			ratioRows: [],
			balancePeriod: '',
			cashFlowPeriod: '',
			ratiosPeriod: ''
		},
		analysis: emptyAnalysisTab(),
		forecast: { hasData: false, scenarios: [], chart: null },
		compare: { hasData: false, peers: [], selectedPeer: '', rows: [], chart: null },
		news: { hasData: false, articles: [] },
		sentiment: emptySentiment(),
		earnings: { hasData: false, error: '', streakHeadline: '', streakTone: '', events: [] },
		earningsVisualizer: null,
		ownership: {
			hasData: false,
			insider: emptyInsider(),
			institutional: emptyInstitutional(),
			congress: emptyCongress()
		},
		technicals: { present: false }
	};
}

function emptySentiment(): SentimentTabVM {
	return {
		hasData: false,
		symbol: '',
		aggregateLabel: '',
		postCount: 0,
		posts: [],
		badge: { hasReading: false, label: '' },
		hasDaily: false,
		asOf: '',
		sourceLabel: '',
		themes: [],
		summary: '',
		history: null
	};
}

export type StockListItem = S['StockListItem'];

/** findPortfolioStock: a transport failure is an error; a non-200 answer is "not held". */
export async function findPortfolioStock(
	event: RequestEvent,
	symbol: string
): Promise<{ item: StockListItem | null; error: unknown }> {
	try {
		const items = await apiJSON<StockListItem[]>(event, 'GET', '/v1/stocks');
		const item = (items ?? []).find((i) => i.symbol.trim().toUpperCase() === symbol) ?? null;
		return { item, error: null };
	} catch (err) {
		if (isAPIError(err)) return { item: null, error: null };
		return { item: null, error: err };
	}
}

function formatPriceRange(r: S['PriceRange']): string {
	return `${formatCurrency(r.low)} - ${formatCurrency(r.high)}`;
}

function joinMeta(...parts: string[]): string {
	return parts
		.map((p) => p.trim())
		.filter((p) => p !== '' && p !== '-')
		.join(' • ');
}

function coalesceOptional(...values: (string | null | undefined)[]): string {
	for (const v of values) {
		const t = (v ?? '').trim();
		if (t) return t;
	}
	return '';
}

export async function loadStockDetailViewModel(
	event: RequestEvent,
	rawSymbol: string,
	tab: string,
	comparePeer: string,
	earningsFiling: string,
	isPro: boolean
): Promise<DetailViewModel> {
	const symbol = rawSymbol.trim().toUpperCase();
	const vm = emptyDetailViewModel(symbol, tab);
	if (symbol === '') {
		vm.hasLoadError = true;
		vm.errorMessage = 'Stock detail is unavailable right now.';
		return vm;
	}

	const { item: position, error } = await findPortfolioStock(event, symbol);
	if (error) {
		vm.hasLoadError = true;
		vm.errorMessage = "We couldn't load this holding. Check your connection and try again.";
		return vm;
	}
	if (position) {
		vm.hasPosition = true;
		vm.positionID = position.id.toLowerCase();
		vm.shares = formatShares(position.shares) + ' shares';
		vm.buyPrice = formatCurrency(position.buyPrice);
		vm.buyDate = goDate(position.buyDate);
		vm.category = labelTitle(String(position.category));
		vm.costBasis = formatCurrency(position.shares * position.buyPrice);
		vm.positionLine = `Purchased ${goDate(position.buyDate)} • ${formatShares(position.shares)} shares`;
		const notes = (position.notes ?? '').trim();
		if (notes) vm.notes = notes;
	}

	const s = enc(symbol);
	const [market, profile, valuation, periodReturns, targets] = await Promise.all([
		get<S['StockDetailsResponse']>(event, '/v1/market/details', { symbol }, 'market details'),
		get<S['CompanyProfileResponse']>(
			event,
			`/v1/market/profile/${s}`,
			undefined,
			'company profile'
		),
		get<S['StockValuationRequest']>(
			event,
			`/v1/stocks/symbol/${s}/valuation`,
			undefined,
			'valuation'
		),
		get<S['StockPeriodReturnsResponse']>(
			event,
			`/v1/market/returns/${s}`,
			undefined,
			'period returns'
		),
		get<S['ScenarioTargetResponse'][]>(event, '/v1/targets', undefined, 'targets')
	]);

	const targetRows: TargetRowVM[] = [];
	for (const target of targets ?? []) {
		if (target.symbol.trim().toUpperCase() !== symbol) continue;
		targetRows.push({
			scenario: labelTitle(target.scenario),
			targetPrice: formatCurrency(target.targetPrice),
			rawPrice: target.targetPrice,
			targetDate: target.targetDate ? goDate(target.targetDate) : '',
			delta: '',
			deltaClass: ''
		});
	}

	if (periodReturns) {
		[vm.return3M, vm.return3MClass] = formatOptionalSignedPercent(periodReturns.threeMonth);
		[vm.return6M, vm.return6MClass] = formatOptionalSignedPercent(periodReturns.sixMonth);
		[vm.returnYTD, vm.returnYTDClass] = formatOptionalSignedPercent(periodReturns.yearToDate);
	}

	await loadStockOverviewMarketDepth(event, vm);

	if (market) {
		vm.currentPrice = formatCurrency(market.latestPrice);
		vm.changePercent = formatSignedPercent(market.changePercent);
		vm.changeClass = changeClass(market.changePercent);
		if (position) vm.positionValue = formatCurrency(position.shares * market.latestPrice);
		if (vm.companyName === '' && market.company !== '') vm.companyName = market.company;
		const cur = market.latestPrice;
		for (const row of targetRows) {
			if (row.rawPrice > 0 && cur > 0) {
				const pct = ((row.rawPrice - cur) / cur) * 100;
				// Go int() truncates toward zero.
				if (pct > 0.5) {
					row.delta = `+${Math.trunc(pct + 0.5)}%`;
					row.deltaClass = 'positive';
				} else if (pct < -0.5) {
					row.delta = `${Math.trunc(pct - 0.5)}%`;
					row.deltaClass = 'negative';
				} else {
					row.delta = 'flat';
					row.deltaClass = 'neutral';
				}
			}
		}
	} else {
		vm.currentPrice = 'Pending';
		vm.changePercent = '-';
		if (vm.hasPosition) vm.positionValue = 'Pending';
	}
	vm.targets = targetRows;

	if (profile) {
		vm.hasProfile = true;
		vm.companyName = coalesceOptional(profile.name, profile.ticker);
		vm.exchange = optionalString(profile.exchange);
		vm.industry = optionalString(profile.finnhubIndustry);
		vm.country = optionalString(profile.country);
		vm.currency = optionalString(profile.currency);
		vm.estimateCurrency = optionalString(profile.estimateCurrency);
		vm.website = optionalString(profile.weburl);
		vm.ipo = profile.ipo ? goDate(profile.ipo) : '-';
		if (profile.marketCapitalization != null)
			vm.marketCap = formatCurrency(profile.marketCapitalization * 1_000_000);
		if (profile.shareOutstanding != null)
			vm.sharesOutstanding = formatCompactNumber(profile.shareOutstanding * 1_000_000);
		vm.companyMeta = joinMeta(vm.exchange, vm.industry, vm.country);
	}
	if (vm.companyName === '') vm.companyName = symbol;

	if (valuation) {
		vm.hasValuation = true;
		vm.bearRange = formatPriceRange(valuation.bearCase);
		vm.baseRange = formatPriceRange(valuation.baseCase);
		vm.bullRange = formatPriceRange(valuation.bullCase);
		if (valuation.rationale != null) vm.valuationRationale = valuation.rationale.trim();
		if (valuation.targetDate) vm.valuationTargetDate = goDate(valuation.targetDate);
	}

	await loadStockDetailTabData(event, vm, comparePeer, earningsFiling, isPro);
	return vm;
}

// ---------------------------------------------------------------------------
// stock_detail_market_depth.go

async function loadStockOverviewMarketDepth(event: RequestEvent, vm: DetailViewModel) {
	const s = enc(vm.symbol);
	const [consensus, financials] = await Promise.all([
		get<GradesConsensusResponse[]>(
			event,
			`/v1/market/grades-consensus/${s}`,
			undefined,
			'grades consensus'
		),
		get<S['BasicFinancialsResponse']>(
			event,
			`/v1/market/basic-financials/${s}`,
			undefined,
			'basic financials'
		)
	]);
	if (consensus && consensus.length > 0) vm.consensus = mapGradesConsensus(consensus);
	else vm.consensus.error = 'Could not load analyst consensus.';
	if (financials) vm.basicFinancials = mapBasicFinancials(financials);
	else vm.basicFinancials.error = 'Could not load basic financials.';
}

type Metric = Record<string, unknown> | null | undefined;
type Series = Record<string, Record<string, { period: string; v: number }[]>> | null | undefined;

function metricNumber(metric: Metric, key: string): number | null {
	if (!metric) return null;
	const raw = metric[key];
	if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
	return raw;
}

function metricPercentFraction(metric: Metric, key: string): number | null {
	const v = metricNumber(metric, key);
	return v == null ? null : v / 100;
}

function seriesLatestValue(series: Series, metricKey: string, frequency: string): number | null {
	const points = series?.[frequency]?.[metricKey];
	if (!points || points.length === 0) return null;
	const sorted = [...points].sort((a, b) =>
		a.period > b.period ? -1 : a.period < b.period ? 1 : 0
	);
	return sorted[0].v;
}

function resolvedPERatio(metric: Metric): number | null {
	for (const key of [
		'peTTM',
		'peBasicExclExtraTTM',
		'peExclExtraTTM',
		'peAnnual',
		'peNormalizedAnnual',
		'forwardPE'
	]) {
		const v = metricNumber(metric, key);
		if (v != null) return v;
	}
	return null;
}

function resolvedNetMargin(metric: Metric, series: Series): number | null {
	return (
		metricPercentFraction(metric, 'netProfitMarginTTM') ??
		metricPercentFraction(metric, 'netProfitMarginAnnual') ??
		seriesLatestValue(series, 'netMargin', 'quarterly') ??
		seriesLatestValue(series, 'netMargin', 'annual')
	);
}

function resolvedCurrentRatio(metric: Metric, series: Series): number | null {
	return (
		metricNumber(metric, 'currentRatioQuarterly') ??
		metricNumber(metric, 'currentRatioAnnual') ??
		seriesLatestValue(series, 'currentRatio', 'quarterly') ??
		seriesLatestValue(series, 'currentRatio', 'annual')
	);
}

export function mapBasicFinancials(
	data: S['BasicFinancialsResponse']
): DetailViewModel['basicFinancials'] {
	const metric = data.metric as Metric;
	const series = data.series as unknown as Series;
	const rows: StatementRowVM[] = [];
	const pe = resolvedPERatio(metric);
	if (pe != null) rows.push({ label: 'P/E ratio', value: formatOptionalNumber(pe) });
	const margin = resolvedNetMargin(metric, series);
	if (margin != null) rows.push({ label: 'Net margin', value: formatOptionalRatioPercent(margin) });
	const ratio = resolvedCurrentRatio(metric, series);
	if (ratio != null) rows.push({ label: 'Current ratio', value: formatOptionalNumber(ratio) });
	const beta = metricNumber(metric, 'beta');
	if (beta != null) rows.push({ label: 'Beta', value: formatOptionalNumber(beta) });
	const high = metricNumber(metric, '52WeekHigh');
	if (high != null) rows.push({ label: '52W high', value: formatOptionalCurrency(high) });
	const low = metricNumber(metric, '52WeekLow');
	if (low != null) rows.push({ label: '52W low', value: formatOptionalCurrency(low) });
	for (const spec of [
		{ key: 'salesPerShare', label: 'Sales/share' },
		{ key: 'currentRatio', label: 'Current ratio (annual)' },
		{ key: 'netMargin', label: 'Net margin (annual)' }
	]) {
		const value = seriesLatestValue(series, spec.key, 'annual');
		if (value != null) rows.push({ label: spec.label, value: formatOptionalNumber(value) });
	}
	if (rows.length === 0) return { hasData: false, error: '', metrics: [] };
	return { hasData: true, error: '', metrics: rows };
}

// ---------------------------------------------------------------------------
// stock_detail_tabs_data.go

async function loadStockDetailTabData(
	event: RequestEvent,
	vm: DetailViewModel,
	comparePeer: string,
	earningsFiling: string,
	isPro: boolean
) {
	const tab = vm.activeTab.trim().toLowerCase();
	// Skip the fetch for a tab the user cannot see. This skip is the
	// enforcement: the ownership feeds are session-auth only on the backend.
	if (stockTabFeature(tab) !== '' && !isPro) return;
	switch (tab) {
		case '':
		case 'overview':
			try {
				vm.technicals = await loadTechnicals(event, vm.symbol);
			} catch (err) {
				console.warn('stock technicals fetch failed', vm.symbol, err);
			}
			return;
		case 'chart':
			return loadStockChartTab(event, vm);
		case 'builder':
			vm.chartBuilder = await loadChartBuilderTab(event, vm.symbol);
			return;
		case 'statements':
			return loadStockStatementsTab(event, vm);
		case 'analysis':
			vm.analysis = await loadAnalysisTab(event, vm.symbol);
			return;
		case 'forecast':
			return loadStockForecastTab(event, vm);
		case 'compare':
			return loadStockCompareTab(event, vm, comparePeer);
		case 'news':
			return loadStockNewsTab(event, vm);
		case 'sentiment':
			return loadStockSentimentTab(event, vm);
		case 'earnings':
			return loadStockEarningsTab(event, vm, earningsFiling);
		case 'ownership':
			return loadStockOwnershipTab(event, vm);
	}
}

async function loadStockSentimentTab(event: RequestEvent, vm: DetailViewModel) {
	const data = await get<S['TickerSentimentResponse']>(
		event,
		`/v1/insights/tickers/${enc(vm.symbol)}/sentiment`,
		{ days: 14, limit: 20 },
		'ticker sentiment'
	);
	if (!data) return;
	const aggregate = data.aggregate as { label: string; postCount: number };
	const tab: SentimentTabVM = {
		...emptySentiment(),
		symbol: data.symbol,
		aggregateLabel: aggregate.label,
		postCount: aggregate.postCount
	};
	for (const post of data.posts as {
		author?: string | null;
		authorHandle?: string | null;
		text: string;
		url?: string | null;
		sentimentLabel: string;
	}[]) {
		tab.posts.push({
			author: derefString(post.author),
			handle: derefString(post.authorHandle),
			text: post.text.trim(),
			url: derefString(post.url),
			sentimentLabel: post.sentimentLabel
		});
	}
	tab.hasData = tab.posts.length > 0;
	await attachDailySentiment(event, tab);
	vm.sentiment = tab;
}

async function attachDailySentiment(event: RequestEvent, tab: SentimentTabVM) {
	const batch = await get<S['SymbolSentimentBatchResponse']>(
		event,
		'/v1/insights/sentiment/symbols',
		{ symbols: tab.symbol },
		'sentiment batch'
	);
	if (!batch) return;
	const reading = (batch.symbols as Record<string, S['SymbolSentiment']> | undefined)?.[
		tab.symbol.toUpperCase()
	];
	if (!reading) return;

	tab.hasDaily = true;
	tab.hasData = true;
	tab.asOf = reading.asOfDate;
	tab.badge = buildSentimentBadge(reading.label, reading.score, reading.delta1d, reading.postCount);
	tab.sourceLabel = describeSentimentSources(reading.sourceCounts);
	const themes = reading.themes as
		| {
				summary?: string | null;
				themes: { label: string; stance: string; evidenceCount: number }[];
		  }
		| null
		| undefined;
	if (themes) {
		tab.summary = derefString(themes.summary);
		for (const theme of themes.themes ?? []) {
			tab.themes.push({
				label: theme.label,
				stance: theme.stance,
				stanceCSS: sentimentBadgeClass(theme.stance),
				evidence: sentimentPostCountLabel(theme.evidenceCount)
			});
		}
	}

	// History is Pro-gated upstream; a 402 simply leaves the chart out.
	const history = await get<S['SymbolSentiment'][]>(
		event,
		`/v1/insights/sentiment/history/${enc(tab.symbol)}`,
		{ limit: 30 },
		'sentiment history'
	);
	if (!history) return;
	const points: number[] = [];
	const labels: string[] = [];
	for (const row of history) {
		if (row.score == null) continue;
		points.push(row.score * 100);
		labels.push(row.asOfDate);
	}
	if (points.length >= 2) tab.history = { labels, points };
}

function describeSentimentSources(counts: S['SentimentSourceCounts']): string {
	const entries = [
		{ label: 'X', count: counts.x },
		{ label: 'Reddit', count: counts.reddit },
		{ label: 'StockTwits', count: counts.stocktwits },
		{ label: 'news', count: counts.news },
		{ label: 'Investing.com', count: counts.investing },
		{ label: 'Seeking Alpha', count: counts.seekingAlpha }
	];
	// sort.Slice is not stable; ties keep input order here.
	entries.sort((a, b) => b.count - a.count);
	return entries
		.filter((e) => e.count !== 0)
		.map((e) => `${e.count} from ${e.label}`)
		.join(' · ');
}

async function loadStockChartTab(event: RequestEvent, vm: DetailViewModel) {
	let bars: S['StockHistory'][] | null;
	try {
		bars = await apiJSON<S['StockHistory'][]>(event, 'GET', '/v1/market/history', undefined, {
			query: { symbol: vm.symbol }
		});
	} catch (err) {
		if (!isAPIError(err)) {
			vm.chart.error = 'Could not load price history.';
			console.warn('stock chart fetch failed', vm.symbol, err);
			return;
		}
		bars = null;
	}
	if (!bars || bars.length === 0) {
		vm.chart.error = 'No price history available for this period.';
		return;
	}
	vm.chart = {
		hasData: true,
		error: '',
		labels: bars.map((b) => goFormat(new Date(b.date), 'Jan 2')),
		values: bars.map((b) => b.close)
	};
}

function formatStatementPeriod(
	date: string,
	period?: string | null,
	fiscalYear?: string | null
): string {
	let label = goDate(date);
	if ((period ?? '').trim() !== '') label = period!.trim() + ' · ' + label;
	else if ((fiscalYear ?? '').trim() !== '') label = fiscalYear!.trim() + ' · ' + label;
	return label;
}

async function loadStockStatementsTab(event: RequestEvent, vm: DetailViewModel) {
	const s = enc(vm.symbol);
	const query = { limit: 1, period: 'annual' };
	const stmt = vm.statements;
	const [balance, cash, ratios] = await Promise.all([
		apiJSON<S['BalanceSheetStatementResponse'][]>(
			event,
			'GET',
			`/v1/market/balance-sheet-statement/${s}`,
			undefined,
			{ query }
		).catch((err) => {
			// Only a transport error set the message in Go; a non-200 just left no data.
			if (!isAPIError(err)) {
				stmt.error = 'Could not load financial statements.';
				console.warn('statements balance fetch failed', vm.symbol, err);
			}
			return null;
		}),
		get<S['CashFlowStatementResponse'][]>(event, `/v1/market/cash-flow-statement/${s}`, query),
		get<S['RatiosResponse'][]>(event, `/v1/market/ratios/${s}`, query)
	]);

	if (balance && balance.length > 0) {
		const row = balance[0];
		stmt.balancePeriod = formatStatementPeriod(row.date, row.period, row.fiscalYear);
		stmt.balanceSheet = [
			{ label: 'Total assets', value: formatOptionalCurrency(row.totalAssets) },
			{ label: 'Total liabilities', value: formatOptionalCurrency(row.totalLiabilities) },
			{ label: 'Total equity', value: formatOptionalCurrency(row.totalEquity) },
			{ label: 'Cash & equivalents', value: formatOptionalCurrency(row.cashAndCashEquivalents) },
			{ label: 'Total debt', value: formatOptionalCurrency(row.totalDebt) },
			{ label: 'Net debt', value: formatOptionalCurrency(row.netDebt) }
		];
		stmt.hasData = true;
	}
	if (cash && cash.length > 0) {
		const row = cash[0];
		stmt.cashFlowPeriod = formatStatementPeriod(row.date, row.period, row.fiscalYear);
		stmt.cashFlow = [
			{
				label: 'Operating cash flow',
				value: formatOptionalCurrency(row.netCashProvidedByOperatingActivities)
			},
			{
				label: 'Investing cash flow',
				value: formatOptionalCurrency(row.netCashProvidedByInvestingActivities)
			},
			{
				label: 'Financing cash flow',
				value: formatOptionalCurrency(row.netCashProvidedByFinancingActivities)
			},
			{ label: 'Free cash flow', value: formatOptionalCurrency(row.freeCashFlow) },
			{ label: 'Net income', value: formatOptionalCurrency(row.netIncome) },
			{ label: 'CapEx', value: formatOptionalCurrency(row.capitalExpenditure) }
		];
		stmt.hasData = true;
	}
	if (ratios && ratios.length > 0) {
		const row = ratios[0];
		stmt.ratiosPeriod = formatStatementPeriod(row.date, row.period, row.fiscalYear);
		stmt.ratioRows = [
			{ label: 'P/E ratio', value: formatOptionalNumber(row.priceToEarningsRatio) },
			{ label: 'P/B ratio', value: formatOptionalNumber(row.priceToBookRatio) },
			{ label: 'Current ratio', value: formatOptionalNumber(row.currentRatio) },
			{ label: 'Debt / equity', value: formatOptionalNumber(row.debtToEquityRatio) },
			{ label: 'Gross margin', value: formatOptionalRatioPercent(row.grossProfitMargin) },
			{ label: 'Net margin', value: formatOptionalRatioPercent(row.netProfitMargin) },
			{ label: 'P/S ratio', value: formatOptionalNumber(row.priceToSalesRatio) },
			{ label: 'Dividend yield', value: formatOptionalRatioPercent(row.dividendYield) }
		];
		stmt.hasData = true;
	}
	// Go overwrote the error with this one whenever nothing loaded.
	if (!stmt.hasData) stmt.error = 'Financial statements unavailable for this symbol.';
}

type ProjectionYear = {
	year: number;
	revenue: number;
	revenueGrowth: number;
	eps: number;
	sharePriceLow: number;
	sharePriceHigh: number;
};
type ProjectionScenario = { kind: string; years: ProjectionYear[] };

async function loadStockForecastTab(event: RequestEvent, vm: DetailViewModel) {
	const insights = await get<S['StockInsightsResponse']>(
		event,
		`/v1/stocks/${enc(vm.symbol)}/insights`,
		undefined,
		'insights'
	);
	const scenarios = (insights?.projectionScenarios ?? []) as unknown as ProjectionScenario[];
	if (scenarios.length === 0) return;
	vm.forecast = {
		hasData: true,
		scenarios: scenarios.map((scenario) => ({
			kind: labelTitle(String(scenario.kind)),
			years: (scenario.years ?? []).map((year) => ({
				year: String(year.year),
				revenue: formatCompactCurrency(year.revenue),
				revenueGrowth: formatSignedPercent(year.revenueGrowth * 100),
				eps: formatCurrency(year.eps),
				sharePriceLow: formatCurrency(year.sharePriceLow),
				sharePriceHigh: formatCurrency(year.sharePriceHigh)
			}))
		})),
		chart: null
	};
	const base = scenarios.find((s) => String(s.kind) === 'base' && (s.years ?? []).length > 0);
	if (base) {
		vm.forecast.chart = {
			labels: base.years.map((y) => String(y.year)),
			values: base.years.map((y) => (y.sharePriceLow + y.sharePriceHigh) / 2)
		};
	}
}

async function loadStockCompareTab(event: RequestEvent, vm: DetailViewModel, rawPeer: string) {
	let comparePeer = rawPeer.trim().toUpperCase();
	const insights = await get<S['StockInsightsResponse']>(
		event,
		`/v1/stocks/${enc(vm.symbol)}/insights`,
		undefined,
		'insights'
	);
	const peers = (insights?.peers ?? []) as S['StockInsightPeerDTO'][];
	if (comparePeer === '' && peers.length > 0) comparePeer = peers[0].symbol.trim().toUpperCase();

	const tab = vm.compare;
	for (const peer of peers) {
		const sym = peer.symbol.trim().toUpperCase();
		tab.peers.push({ symbol: sym, companyName: peer.companyName, selected: sym === comparePeer });
	}
	tab.selectedPeer = comparePeer;
	if (comparePeer === '' || comparePeer === vm.symbol.toUpperCase()) return;

	const rows = await get<S['StockAnalysisMetricsResponse'][]>(
		event,
		'/v1/market/compare',
		{ symbols: vm.symbol + ',' + comparePeer },
		'market compare'
	);
	if (!rows || rows.length === 0) return;
	const bySymbol = new Map(rows.map((r) => [r.symbol.toUpperCase(), r]));
	const primary =
		bySymbol.get(vm.symbol.toUpperCase()) ?? ({} as Partial<S['StockAnalysisMetricsResponse']>);
	const peer = bySymbol.get(comparePeer) ?? ({} as Partial<S['StockAnalysisMetricsResponse']>);

	tab.hasData = true;
	tab.rows = [
		{
			label: 'Price',
			primary: formatOptionalCurrency(primary.currentPrice),
			peer: formatOptionalCurrency(peer.currentPrice)
		},
		{
			label: 'Market cap',
			primary: formatOptionalCurrency(primary.marketCap),
			peer: formatOptionalCurrency(peer.marketCap)
		},
		{
			label: 'TTM P/E',
			primary: formatOptionalNumber(primary.ttmPE),
			peer: formatOptionalNumber(peer.ttmPE)
		},
		{
			label: 'Forward P/E',
			primary: formatOptionalNumber(primary.forwardPE),
			peer: formatOptionalNumber(peer.forwardPE)
		},
		{
			label: 'Gross margin',
			primary: formatOptionalRatioPercent(primary.grossMargin),
			peer: formatOptionalRatioPercent(peer.grossMargin)
		},
		{
			label: 'Net margin',
			primary: formatOptionalRatioPercent(primary.netMargin),
			peer: formatOptionalRatioPercent(peer.netMargin)
		},
		{
			label: 'TTM revenue growth',
			primary: formatOptionalRatioPercent(primary.ttmRevenueGrowth),
			peer: formatOptionalRatioPercent(peer.ttmRevenueGrowth)
		},
		{
			label: 'TTM EPS growth',
			primary: formatOptionalRatioPercent(primary.ttmEPSGrowth),
			peer: formatOptionalRatioPercent(peer.ttmEPSGrowth)
		},
		{
			label: 'DCF base',
			primary: formatOptionalCurrency(primary.dcfBasePrice),
			peer: formatOptionalCurrency(peer.dcfBasePrice)
		}
	];

	// loadComparePriceChart: only the primary symbol's recent closes, as %
	// change from the first (the peer argument was unused in Go).
	const bars = await get<S['StockHistory'][]>(
		event,
		'/v1/market/history',
		{ symbol: vm.symbol },
		'market history'
	);
	const all = bars ?? [];
	const closes = all.slice(all.length > 14 ? all.length - 14 : 0).map((b) => b.close);
	if (closes.length >= 2) {
		const base = closes[0];
		tab.chart = {
			labels: closes.map((_, i) => String(i)),
			values: closes.map((c) => (base !== 0 ? (c / base - 1) * 100 : 0))
		};
	}
}

async function loadStockNewsTab(event: RequestEvent, vm: DetailViewModel) {
	const articles = await get<{ title: string; date: string; url: string }[]>(
		event,
		'/v1/market/news',
		{ symbol: vm.symbol, limit: 25 },
		'market news'
	);
	if (!articles) return;
	vm.news.articles = articles.map((a) => ({
		headline: (a.title ?? '').trim(),
		source: 'Market',
		symbol: vm.symbol,
		date: (a.date ?? '').trim(),
		url: (a.url ?? '').trim()
	}));
	vm.news.hasData = vm.news.articles.length > 0;
}

async function loadStockEarningsTab(
	event: RequestEvent,
	vm: DetailViewModel,
	earningsFiling: string
) {
	vm.earningsVisualizer = await loadEarningsVisualizerViewModel(
		event,
		vm.symbol,
		earningsFiling,
		'/portfolio/' + vm.symbol.toLowerCase() + '/earnings'
	);
	const events = await get<S['EarningsResponse'][]>(
		event,
		`/v1/market/earnings/${enc(vm.symbol)}`,
		{ limit: 12 },
		'earnings'
	);
	if (!events) return;
	vm.earnings = mapStockEarningsTab(events);
}

export function mapStockEarningsTab(events: S['EarningsResponse'][]): EarningsTabVM {
	const sorted = [...events].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
	const streak = headlineEarningsStreak(sorted);
	const tab: EarningsTabVM = {
		hasData: false,
		error: '',
		streakHeadline: streak.headline,
		streakTone: streak.tone,
		events: []
	};
	for (const e of sorted) {
		const [verdict, verdictTone] = earningsRowVerdict(e.beatStreak, e.missStreak);
		tab.events.push({
			date: goDate(e.date),
			dateISO: isoDate(e.date),
			epsActual: formatOptionalNumber(e.epsActual),
			epsEstimated: formatOptionalNumber(e.epsEstimated),
			revenueActual: formatOptionalCompactCurrency(e.revenueActual),
			revenueEstimated: formatOptionalCompactCurrency(e.revenueEstimated),
			hasTranscript: e.hasTranscript,
			verdict,
			verdictTone,
			surprise: e.surprisePercent != null ? formatSignedPercent(e.surprisePercent) : ''
		});
	}
	tab.hasData = tab.events.length > 0;
	return tab;
}

async function loadStockOwnershipTab(event: RequestEvent, vm: DetailViewModel) {
	const tab = vm.ownership;
	await Promise.all([
		loadInsiderActivity(event, vm.symbol, insiderWindowTabDays, ownershipTabInsiderRows)
			.then((v) => (tab.insider = v))
			.catch((err) => console.warn('stock insider activity fetch failed', vm.symbol, err)),
		loadInstitutionalOwnership(event, vm.symbol, ownershipTabHolders)
			.then((v) => (tab.institutional = v))
			.catch((err) => console.warn('stock institutional ownership fetch failed', vm.symbol, err)),
		loadCongressTrades(event, vm.symbol, ownershipTabCongressRows)
			.then((v) => (tab.congress = v))
			.catch((err) => console.warn('stock congress trades fetch failed', vm.symbol, err))
	]);
	tab.hasData = tab.insider.present || tab.institutional.present || tab.congress.present;
}
