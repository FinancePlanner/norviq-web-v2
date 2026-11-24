// Port of norviq-web internal/handlers/reports_data.go (LoadReportsViewModel
// and its card mappers) plus the private helpers it borrows from
// dashboard_data.go, expenses_data.go and portfolio_subpages_data.go.

import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { allocationColor } from '#lib/charts/index.js';
import { formatCurrency, formatFloat, formatPercentValue } from '#lib/format.js';
import { normalizeReportTab } from '#lib/nav.js';
import type { T as Translate } from '#lib/i18n/index.js';
import { money, percentPoints, signedMoney, signedPercent, type AppLocale } from '#lib/money.js';
import { getJSON } from '#lib/features/dashboard/fetch.server.js';
import { loadBudgetCurrency } from '#lib/features/dashboard/budget-currency.server.js';
import { loadAccountCurrency } from '#lib/features/portfolio/account-currency.server.js';
import { goFormat, parseTime } from '#lib/features/dashboard/shared.js';
import { resolvePillar } from '#lib/features/dashboard/pillars.js';
import { mapFinancialHealth, mapInsightCards } from '#lib/features/dashboard/insights/mappers.js';
import {
	changeBasis,
	civilDateLabel,
	isStale,
	performancePointSeries,
	rangeChange
} from '#lib/features/portfolio/holdings/change.js';
import type {
	AllocationCardVM,
	AllocationRowVM,
	BudgetPillarRowVM,
	BudgetTrackingCardVM,
	CashFlowCardVM,
	HouseholdSplitCardVM,
	InsightsCardVM,
	LineSeries,
	NetWorthCardVM,
	PerformanceCardVM,
	PieSeries,
	QuickStatsCardVM,
	ReportsPageVM,
	SavingsRateCardVM,
	SpendingCardVM,
	StatVM
} from './types.js';

type S = components['schemas'];
type Overview = S['ReportsOverviewResponse'];
type Performance = S['PortfolioPerformanceResponse'];

// ---------------------------------------------------------------------------
// Borrowed helpers (private in their Go files and in the other v2 features)

/** dashboard_data.go monthOverMonthChange. */
function monthOverMonthChange(values: number[]): { pct: number; positive: boolean } | null {
	if (values.length < 2) return null;
	const prev = values[values.length - 2];
	const last = values[values.length - 1];
	if (prev <= 0) return null;
	const pct = (last - prev) / prev;
	return { pct, positive: pct >= 0 };
}

const monthTime = (raw: string) => parseTime(raw)?.getTime() ?? 0;
const monthLabel = (raw: string) => goFormat(parseTime(raw) ?? new Date(0), 'Jan');

/** The last 12 rows, oldest first. */
function lastTwelveByMonth<T extends { monthStart: string }>(rows: T[]): T[] {
	const sorted = [...rows].sort((a, b) => monthTime(a.monthStart) - monthTime(b.monthStart));
	return sorted.slice(Math.max(0, sorted.length - 12));
}

/** dashboard_data.go spendingSeries. */
function spendingSeries(summaries: S['BudgetMonthSummaryResponse'][] | undefined): LineSeries {
	if (!summaries?.length) return { labels: [], values: [] };
	const window = lastTwelveByMonth(summaries);
	return {
		labels: window.map((r) => monthLabel(r.monthStart)),
		values: window.map((r) => Math.max(0, r.actual))
	};
}

/** expenses_data.go pillarProgressState. */
function pillarProgressState(pct: number): string {
	if (pct > 100) return 'over';
	if (pct > 80) return 'warning';
	return 'on-track';
}

const ALLOCATION_CHART_TOP_N = 8;

/** portfolio_subpages_data.go formatOverweight. */
function formatOverweight(delta: number, fmt?: ReportsFmt): string {
	if (Math.abs(delta) < 0.05) return 'Equal weight';
	if (fmt) return `${signedPercent(delta / 100, fmt.locale)} vs equal`;
	const sign = delta < 0 ? '' : '+';
	return `${sign}${formatFloat(delta, 1)}% vs equal`;
}

/** portfolio_subpages_data.go mapSectorAllocations (rows + the pie input). */
function mapSectorAllocations(
	items: S['SectorAllocationDTO'][] | undefined,
	fmt?: ReportsFmt
): [AllocationRowVM[], PieSeries | null] {
	if (!items?.length) return [[], null];
	const sorted = [...items].sort((a, b) => b.weightPercent - a.weightPercent);
	const equalWeight = 100 / sorted.length;
	let labels = sorted.map((r) => r.sector);
	let weights = sorted.map((r) => r.weightPercent);
	if (labels.length > ALLOCATION_CHART_TOP_N) {
		const other = weights.slice(ALLOCATION_CHART_TOP_N).reduce((t, w) => t + w, 0);
		labels = [...labels.slice(0, ALLOCATION_CHART_TOP_N), 'Other'];
		weights = [...weights.slice(0, ALLOCATION_CHART_TOP_N), other];
	}
	const rows = sorted.map((row, i) => ({
		label: row.sector,
		value: fmt ? money(row.value, fmt.currency, fmt.locale) : formatCurrency(row.value),
		percent: fmt
			? percentPoints(row.weightPercent, fmt.locale)
			: formatPercentValue(row.weightPercent),
		overweight: formatOverweight(row.weightPercent - equalWeight, fmt),
		color: allocationColor(i)
	}));
	return [rows, labels.length ? { labels, weights } : null];
}

/** reports_data.go mapSectorAllocationsForReports. Also used by the deep dive. */
export function mapSectorAllocationsForReports(
	items: S['SectorAllocationDTO'][] | undefined,
	fmt?: ReportsFmt
): [AllocationRowVM[], PieSeries | null] {
	return mapSectorAllocations(items, fmt);
}

/**
 * How Reports prints money (DS 2.0 money contract): portfolio figures in the
 * account currency, spend and cash flow in the month's budget currency, both
 * in the app locale. null currencies print " —", never "$".
 */
export interface ReportsFmt {
	currency: string | null;
	spendCurrency: string | null;
	locale: AppLocale;
	t: Translate;
}

/** "+3.2% vs last month" in the locale. */
const vsLastMonth = (fraction: number, fmt: ReportsFmt) =>
	`${signedPercent(fraction, fmt.locale)} ${fmt.t('vs last month')}`;

// ---------------------------------------------------------------------------
// Card mappers

/**
 * The change shown on a Reports card, measured over the fetched series (as
 * Overview does), labelled with its honest basis, and hidden when the series
 * is stale. The backend's `changes` could call a fortnight-old series' span
 * "vs previous close" (spec § 2.0 A2).
 */
function seriesChange(
	performance: Performance,
	fmt: ReportsFmt,
	now: Date
): { label: string; positive: boolean; asOfCaption: string | null } {
	const none = { label: '', positive: false, asOfCaption: null };
	const points = performance.points ?? [];
	if (points.length === 0) return none;
	const last = points.reduce((a, b) => (b.date > a.date ? b : a));
	if (isStale(last.date, now))
		return {
			...none,
			asOfCaption: fmt.t('Prices as of %@', civilDateLabel(last.date, fmt.locale))
		};
	const change = rangeChange(points);
	if (!change) return none;
	const basis = changeBasis(performance.range ?? '1M', change.fromDate, now, fmt.t, fmt.locale);
	return {
		label: `${signedPercent(change.fraction, fmt.locale)} ${basis}`,
		positive: change.fraction > 0,
		asOfCaption: null
	};
}

export function mapNetWorth(
	overview: Overview | null,
	performance: Performance | null,
	fmt: ReportsFmt,
	now = new Date()
): NetWorthCardVM {
	const vm: NetWorthCardVM = {
		available: false,
		totalValue: '',
		changeLabel: '',
		changePositive: false,
		asOfCaption: null,
		chart: null
	};
	if (overview && overview.portfolioStatistics.totalMarketValue > 0) {
		vm.available = true;
		vm.totalValue = money(overview.portfolioStatistics.totalMarketValue, fmt.currency, fmt.locale);
	}
	if (performance && performance.points?.length > 0) {
		vm.available = true;
		const series = performancePointSeries(performance.points);
		if (vm.totalValue === '' && series.values.length > 0)
			vm.totalValue = money(series.values[series.values.length - 1], fmt.currency, fmt.locale);
		const change = seriesChange(performance, fmt, now);
		vm.changeLabel = change.label;
		vm.changePositive = change.positive;
		vm.asOfCaption = change.asOfCaption;
		vm.chart = series;
	}
	return vm;
}

export function mapQuickStats(
	overview: Overview | null,
	statistics: S['StatisticsDTO'] | null,
	fmt: ReportsFmt
): QuickStatsCardVM {
	const cash = (v: number) => money(v, fmt.currency, fmt.locale);
	const signed = (v: number) => signedMoney(v, fmt.currency, fmt.locale);
	const stats: StatVM[] = [];
	if (overview) {
		const p = overview.portfolioStatistics;
		if (p.totalPositions > 0 || p.totalMarketValue > 0) {
			stats.push(
				{ label: 'Positions', value: String(p.totalPositions) },
				{ label: 'Market value', value: cash(p.totalMarketValue) },
				{ label: 'Cost basis', value: cash(p.totalCostBasis) },
				{ label: 'Unrealized P/L', value: signed(p.totalUnrealizedPnl) },
				{ label: 'Realized P/L', value: signed(p.totalRealizedPnl) }
			);
		}
	}
	if (statistics) {
		if (statistics.watchlist.totalSymbols > 0)
			stats.push({ label: 'Watchlist', value: `${statistics.watchlist.totalSymbols} symbols` });
		if (statistics.looklist.totalIdeas > 0)
			stats.push({ label: 'Research ideas', value: `${statistics.looklist.activeIdeas} active` });
		const change = statistics.market.benchmarkChange1D;
		if (change !== null && change !== undefined && statistics.market.benchmarkSymbol) {
			stats.push({
				label: statistics.market.benchmarkSymbol + ' (1D)',
				value: signedPercent(change / 100, fmt.locale, 2)
			});
		}
	}
	if (stats.length === 0) return { available: false, error: 'Quick stats unavailable.', stats: [] };
	return { available: true, error: '', stats };
}

function mapInsights(
	insights: S['DashboardInsightsResponse'] | null,
	fmt: ReportsFmt
): InsightsCardVM {
	if (!insights) return { available: false, financialHealth: null, insightCards: [] };
	return {
		available: true,
		financialHealth: mapFinancialHealth(insights.financialHealth),
		insightCards: mapInsightCards(insights, fmt)
	};
}

export function mapPerformance(
	performance: Performance | null,
	fmt: ReportsFmt,
	now = new Date()
): PerformanceCardVM {
	if (!performance || !performance.points?.length) {
		return {
			available: false,
			error: 'Performance data unavailable.',
			changeLabel: '',
			changePositive: false,
			asOfCaption: null,
			chart: null
		};
	}
	const change = seriesChange(performance, fmt, now);
	return {
		available: true,
		error: '',
		changeLabel: change.label,
		changePositive: change.positive,
		asOfCaption: change.asOfCaption,
		chart: performancePointSeries(performance.points)
	};
}

function mapAllocation(overview: Overview | null, fmt: ReportsFmt): AllocationCardVM {
	const empty: AllocationCardVM = { available: false, chart: null, rows: [] };
	if (!overview) return empty;
	const [rows, chart] = mapSectorAllocationsForReports(
		overview.portfolioStatistics.sectorAllocations,
		fmt
	);
	if (rows.length === 0 && !chart) return empty;
	return { available: true, chart, rows };
}

export function mapSpending(overview: Overview | null, fmt: ReportsFmt): SpendingCardVM {
	const vm: SpendingCardVM = {
		available: false,
		latestMonth: '',
		changeLabel: '',
		changePositive: false,
		chart: null
	};
	if (!overview) return vm;
	const series = spendingSeries(overview.monthlySummaries);
	if (series.labels.length === 0) return vm;
	vm.available = true;
	if (overview.latestMonthSummary)
		vm.latestMonth = money(overview.latestMonthSummary.actual, fmt.spendCurrency, fmt.locale);
	const change = monthOverMonthChange(series.values);
	if (change) {
		vm.changePositive = change.positive;
		vm.changeLabel = vsLastMonth(change.pct, fmt);
	}
	vm.chart = series;
	return vm;
}

function mapBudgetTracking(overview: Overview | null, fmt: ReportsFmt): BudgetTrackingCardVM {
	if (!overview || !overview.latestPillarSummaries?.length) return { available: false, rows: [] };
	const cash = (v: number) => money(v, fmt.spendCurrency, fmt.locale);
	const rows = overview.latestPillarSummaries.map((row): BudgetPillarRowVM => {
		const def = resolvePillar(row.pillar);
		const vmRow: BudgetPillarRowVM = {
			label: def.label,
			icon: def.icon,
			colorVar: def.colorVar,
			target: cash(row.targetAmount),
			planned: cash(row.plannedAmount),
			actual: cash(row.actualAmount),
			percent: 0,
			state: '',
			hasTarget: false
		};
		// Progress against the goal, matching the planner card and iOS.
		if (row.targetAmount > 0) {
			const raw = (row.actualAmount / row.targetAmount) * 100;
			vmRow.hasTarget = true;
			vmRow.percent = Math.min(100, raw);
			vmRow.state = pillarProgressState(raw);
		}
		return vmRow;
	});
	return { available: rows.length > 0, rows };
}

function mapSavingsRate(overview: Overview | null, fmt: ReportsFmt): SavingsRateCardVM {
	const vm: SavingsRateCardVM = {
		available: false,
		latestRate: '',
		changeLabel: '',
		changePositive: false,
		chart: null
	};
	if (!overview || !overview.cashFlow?.length) return vm;
	const window = lastTwelveByMonth(overview.cashFlow);
	const labels = window.map((r) => monthLabel(r.monthStart));
	const values = window.map((r) => Math.max(0, r.savingsRate));
	if (labels.length === 0) return vm;
	vm.available = true;
	vm.latestRate = percentPoints(values[values.length - 1], fmt.locale);
	const change = monthOverMonthChange(values);
	if (change) {
		vm.changePositive = change.positive;
		vm.changeLabel = vsLastMonth(change.pct, fmt);
	}
	vm.chart = { labels, values };
	return vm;
}

function mapHouseholdSplit(overview: Overview | null, fmt: ReportsFmt): HouseholdSplitCardVM {
	const cash = (v: number) => money(v, fmt.spendCurrency, fmt.locale);
	const empty: HouseholdSplitCardVM = {
		available: false,
		hasPartner: false,
		myActual: '',
		partnerActual: '',
		myPlanned: '',
		partnerPlanned: '',
		mySharePct: 0
	};
	const summary = overview?.latestMonthSummary;
	if (!summary) return empty;
	const totalActual = summary.myActual + summary.partnerActual;
	if (totalActual <= 0 && summary.myPlanned + summary.partnerPlanned <= 0) return empty;
	return {
		available: true,
		hasPartner: summary.partnerActual > 0 || summary.partnerPlanned > 0,
		myActual: cash(summary.myActual),
		partnerActual: cash(summary.partnerActual),
		myPlanned: cash(summary.myPlanned),
		partnerPlanned: cash(summary.partnerPlanned),
		mySharePct: totalActual > 0 ? (summary.myActual / totalActual) * 100 : 0
	};
}

export function mapCashFlow(overview: Overview | null, fmt: ReportsFmt): CashFlowCardVM {
	const vm: CashFlowCardVM = {
		available: false,
		latestNet: '',
		latestIncome: '',
		latestExpenses: '',
		changeLabel: '',
		changePositive: false,
		chart: null
	};
	if (!overview || !overview.cashFlow?.length) return vm;
	const window = lastTwelveByMonth(overview.cashFlow);
	const labels = window.map((r) => monthLabel(r.monthStart));
	const values = window.map((r) => r.net);
	const latest = window[window.length - 1];
	vm.available = true;
	vm.latestNet = signedMoney(latest.net, fmt.spendCurrency, fmt.locale);
	vm.latestIncome = money(latest.income, fmt.spendCurrency, fmt.locale);
	vm.latestExpenses = money(latest.expenses, fmt.spendCurrency, fmt.locale);
	const change = monthOverMonthChange(values);
	if (change) {
		vm.changePositive = change.positive;
		vm.changeLabel = vsLastMonth(change.pct, fmt);
	}
	vm.chart = { labels, values };
	return vm;
}

// ---------------------------------------------------------------------------

export async function loadReportsViewModel(
	event: RequestEvent,
	tab: string,
	activePath: string,
	isPro: boolean
): Promise<ReportsPageVM> {
	// Four independent reads; a failure of one only blanks its cards.
	const [overview, insights, performance, statistics, budgetCurrency, account] = await Promise.all([
		getJSON<Overview>(event, '/v1/reports/overview'),
		getJSON<S['DashboardInsightsResponse']>(event, '/v1/dashboard/insights'),
		getJSON<Performance>(event, '/v1/portfolio/performance'),
		getJSON<S['StatisticsDTO']>(event, '/v1/statistics/overview'),
		loadBudgetCurrency(event),
		// The unscoped performance answers a default "USD"; the portfolios carry the real one.
		loadAccountCurrency(event)
	]);
	for (const [name, r] of [
		['reports overview', overview],
		['reports insights', insights],
		['reports performance', performance],
		['statistics overview', statistics]
	] as const) {
		if (r.failed) console.warn(name + ' fetch failed');
	}
	const o = overview.data;
	const p = performance.data;
	const currency = account.currency;
	const fmt: ReportsFmt = {
		currency,
		spendCurrency: budgetCurrency || currency,
		locale: event.locals.locale,
		t: event.locals.t
	};
	const vm: ReportsPageVM = {
		currency,
		spendCurrency: fmt.spendCurrency,
		tab: normalizeReportTab(tab),
		activePath,
		isPro,
		reportsAvailable: true,
		hasLoadError: false,
		errorMessage: '',
		netWorth: mapNetWorth(o, p, fmt),
		quickStats: mapQuickStats(o, statistics.data, fmt),
		insights: mapInsights(insights.data, fmt),
		performance: mapPerformance(p, fmt),
		allocation: mapAllocation(o, fmt),
		spending: mapSpending(o, fmt),
		budgetTracking: mapBudgetTracking(o, fmt),
		savingsRate: mapSavingsRate(o, fmt),
		householdSplit: mapHouseholdSplit(o, fmt),
		cashFlow: mapCashFlow(o, fmt)
	};
	if (!o && !insights.data && !p && !statistics.data) {
		vm.hasLoadError = true;
		vm.errorMessage = 'Could not load report data. Try again in a moment.';
	}
	return vm;
}
