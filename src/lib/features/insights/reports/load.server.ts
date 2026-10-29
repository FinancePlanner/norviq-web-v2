// Port of norviq-web internal/handlers/reports_data.go (LoadReportsViewModel
// and its card mappers) plus the private helpers it borrows from
// dashboard_data.go, expenses_data.go and portfolio_subpages_data.go.

import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { allocationColor } from '#lib/charts/index.js';
import { formatCurrency, formatFloat, formatPercentValue, formatSignedCurrency } from '#lib/format.js';
import { normalizeReportTab } from '#lib/nav.js';
import { getJSON } from '#lib/features/dashboard/fetch.server.js';
import { goFormat, parseTime } from '#lib/features/dashboard/shared.js';
import { resolvePillar } from '#lib/features/dashboard/pillars.js';
import { mapFinancialHealth, mapInsightCards } from '#lib/features/dashboard/insights/mappers.js';
import { formatChangeLabel, performancePointSeries, primaryChange } from '#lib/features/portfolio/holdings/change.js';
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
	return { labels: window.map((r) => monthLabel(r.monthStart)), values: window.map((r) => Math.max(0, r.actual)) };
}

/** expenses_data.go pillarProgressState. */
function pillarProgressState(pct: number): string {
	if (pct > 100) return 'over';
	if (pct > 80) return 'warning';
	return 'on-track';
}

const ALLOCATION_CHART_TOP_N = 8;

/** portfolio_subpages_data.go formatOverweight. */
function formatOverweight(delta: number): string {
	if (Math.abs(delta) < 0.05) return 'Equal weight';
	const sign = delta < 0 ? '' : '+';
	return `${sign}${formatFloat(delta, 1)}% vs equal`;
}

/** portfolio_subpages_data.go mapSectorAllocations (rows + the pie input). */
function mapSectorAllocations(items: S['SectorAllocationDTO'][] | undefined): [AllocationRowVM[], PieSeries | null] {
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
		value: formatCurrency(row.value),
		percent: formatPercentValue(row.weightPercent),
		overweight: formatOverweight(row.weightPercent - equalWeight),
		color: allocationColor(i)
	}));
	return [rows, labels.length ? { labels, weights } : null];
}

/** reports_data.go mapSectorAllocationsForReports. Also used by the deep dive. */
export function mapSectorAllocationsForReports(items: S['SectorAllocationDTO'][] | undefined): [AllocationRowVM[], PieSeries | null] {
	return mapSectorAllocations(items);
}

const signedPct = (pct: number, unit: string) => `${pct >= 0 ? '+' : ''}${formatFloat(pct * 100, 1)}${unit}`;

// ---------------------------------------------------------------------------
// Card mappers

function mapNetWorth(overview: Overview | null, performance: Performance | null): NetWorthCardVM {
	const vm: NetWorthCardVM = { available: false, totalValue: '', changeLabel: '', changePositive: false, chart: null };
	if (overview && overview.portfolioStatistics.totalMarketValue > 0) {
		vm.available = true;
		vm.totalValue = formatCurrency(overview.portfolioStatistics.totalMarketValue);
	}
	if (performance && performance.points?.length > 0) {
		vm.available = true;
		const series = performancePointSeries(performance.points);
		if (vm.totalValue === '' && series.values.length > 0) vm.totalValue = formatCurrency(series.values[series.values.length - 1]);
		const change = formatChangeLabel(primaryChange(performance.changes));
		if (change.ok) {
			vm.changeLabel = change.label;
			vm.changePositive = change.positive;
		}
		vm.chart = series;
	}
	return vm;
}

function mapQuickStats(overview: Overview | null, statistics: S['StatisticsDTO'] | null): QuickStatsCardVM {
	const stats: StatVM[] = [];
	if (overview) {
		const p = overview.portfolioStatistics;
		if (p.totalPositions > 0 || p.totalMarketValue > 0) {
			stats.push(
				{ label: 'Positions', value: String(p.totalPositions) },
				{ label: 'Market value', value: formatCurrency(p.totalMarketValue) },
				{ label: 'Cost basis', value: formatCurrency(p.totalCostBasis) },
				{ label: 'Unrealized P/L', value: formatSignedCurrency(p.totalUnrealizedPnl) },
				{ label: 'Realized P/L', value: formatSignedCurrency(p.totalRealizedPnl) }
			);
		}
	}
	if (statistics) {
		if (statistics.watchlist.totalSymbols > 0) stats.push({ label: 'Watchlist', value: `${statistics.watchlist.totalSymbols} symbols` });
		if (statistics.looklist.totalIdeas > 0) stats.push({ label: 'Research ideas', value: `${statistics.looklist.activeIdeas} active` });
		const change = statistics.market.benchmarkChange1D;
		if (change !== null && change !== undefined && statistics.market.benchmarkSymbol) {
			const sign = change < 0 ? '' : '+';
			stats.push({ label: statistics.market.benchmarkSymbol + ' (1D)', value: `${sign}${formatFloat(change, 2)}%` });
		}
	}
	if (stats.length === 0) return { available: false, error: 'Quick stats unavailable.', stats: [] };
	return { available: true, error: '', stats };
}

function mapInsights(insights: S['DashboardInsightsResponse'] | null): InsightsCardVM {
	if (!insights) return { available: false, financialHealth: null, insightCards: [] };
	return { available: true, financialHealth: mapFinancialHealth(insights.financialHealth), insightCards: mapInsightCards(insights) };
}

function mapPerformance(performance: Performance | null): PerformanceCardVM {
	if (!performance || !performance.points?.length) {
		return { available: false, error: 'Performance data unavailable.', changeLabel: '', changePositive: false, chart: null };
	}
	const vm: PerformanceCardVM = { available: true, error: '', changeLabel: '', changePositive: false, chart: performancePointSeries(performance.points) };
	const change = formatChangeLabel(primaryChange(performance.changes));
	if (change.ok) {
		vm.changeLabel = change.label;
		vm.changePositive = change.positive;
	}
	return vm;
}

function mapAllocation(overview: Overview | null): AllocationCardVM {
	const empty: AllocationCardVM = { available: false, chart: null, rows: [] };
	if (!overview) return empty;
	const [rows, chart] = mapSectorAllocationsForReports(overview.portfolioStatistics.sectorAllocations);
	if (rows.length === 0 && !chart) return empty;
	return { available: true, chart, rows };
}

function mapSpending(overview: Overview | null): SpendingCardVM {
	const vm: SpendingCardVM = { available: false, latestMonth: '', changeLabel: '', changePositive: false, chart: null };
	if (!overview) return vm;
	const series = spendingSeries(overview.monthlySummaries);
	if (series.labels.length === 0) return vm;
	vm.available = true;
	if (overview.latestMonthSummary) vm.latestMonth = formatCurrency(overview.latestMonthSummary.actual);
	const change = monthOverMonthChange(series.values);
	if (change) {
		vm.changePositive = change.positive;
		vm.changeLabel = signedPct(change.pct, '% vs last month');
	}
	vm.chart = series;
	return vm;
}

function mapBudgetTracking(overview: Overview | null): BudgetTrackingCardVM {
	if (!overview || !overview.latestPillarSummaries?.length) return { available: false, rows: [] };
	const rows = overview.latestPillarSummaries.map((row): BudgetPillarRowVM => {
		const def = resolvePillar(row.pillar);
		const vmRow: BudgetPillarRowVM = {
			label: def.label,
			icon: def.icon,
			colorVar: def.colorVar,
			target: formatCurrency(row.targetAmount),
			planned: formatCurrency(row.plannedAmount),
			actual: formatCurrency(row.actualAmount),
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

function mapSavingsRate(overview: Overview | null): SavingsRateCardVM {
	const vm: SavingsRateCardVM = { available: false, latestRate: '', changeLabel: '', changePositive: false, chart: null };
	if (!overview || !overview.cashFlow?.length) return vm;
	const window = lastTwelveByMonth(overview.cashFlow);
	const labels = window.map((r) => monthLabel(r.monthStart));
	const values = window.map((r) => Math.max(0, r.savingsRate));
	if (labels.length === 0) return vm;
	vm.available = true;
	vm.latestRate = formatFloat(values[values.length - 1], 0) + '%';
	const change = monthOverMonthChange(values);
	if (change) {
		vm.changePositive = change.positive;
		vm.changeLabel = signedPct(change.pct, ' pts vs last month');
	}
	vm.chart = { labels, values };
	return vm;
}

function mapHouseholdSplit(overview: Overview | null): HouseholdSplitCardVM {
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
		myActual: formatCurrency(summary.myActual),
		partnerActual: formatCurrency(summary.partnerActual),
		myPlanned: formatCurrency(summary.myPlanned),
		partnerPlanned: formatCurrency(summary.partnerPlanned),
		mySharePct: totalActual > 0 ? (summary.myActual / totalActual) * 100 : 0
	};
}

function mapCashFlow(overview: Overview | null): CashFlowCardVM {
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
	vm.latestNet = formatSignedCurrency(latest.net);
	vm.latestIncome = formatCurrency(latest.income);
	vm.latestExpenses = formatCurrency(latest.expenses);
	const change = monthOverMonthChange(values);
	if (change) {
		vm.changePositive = change.positive;
		vm.changeLabel = signedPct(change.pct, '% vs last month');
	}
	vm.chart = { labels, values };
	return vm;
}

// ---------------------------------------------------------------------------

export async function loadReportsViewModel(event: RequestEvent, tab: string, activePath: string, isPro: boolean): Promise<ReportsPageVM> {
	// Four independent reads; a failure of one only blanks its cards.
	const [overview, insights, performance, statistics] = await Promise.all([
		getJSON<Overview>(event, '/v1/reports/overview'),
		getJSON<S['DashboardInsightsResponse']>(event, '/v1/dashboard/insights'),
		getJSON<Performance>(event, '/v1/portfolio/performance'),
		getJSON<S['StatisticsDTO']>(event, '/v1/statistics/overview')
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
	const vm: ReportsPageVM = {
		tab: normalizeReportTab(tab),
		activePath,
		isPro,
		reportsAvailable: true,
		hasLoadError: false,
		errorMessage: '',
		netWorth: mapNetWorth(o, p),
		quickStats: mapQuickStats(o, statistics.data),
		insights: mapInsights(insights.data),
		performance: mapPerformance(p),
		allocation: mapAllocation(o),
		spending: mapSpending(o),
		budgetTracking: mapBudgetTracking(o),
		savingsRate: mapSavingsRate(o),
		householdSplit: mapHouseholdSplit(o),
		cashFlow: mapCashFlow(o)
	};
	if (!o && !insights.data && !p && !statistics.data) {
		vm.hasLoadError = true;
		vm.errorMessage = 'Could not load report data. Try again in a moment.';
	}
	return vm;
}
