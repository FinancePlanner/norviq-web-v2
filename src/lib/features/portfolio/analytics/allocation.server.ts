import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { allocationColor } from '#lib/charts/index.js';
import { formatCurrency, formatFloat, formatPercentValue as formatPercent, formatSignedCurrency } from '#lib/format.js';
import { tryJSON } from './fetch.server.js';
import type { AllocationMetricVM, AllocationSliceVM, AllocationTipVM, AllocationViewModel, PieInput, PortfolioListRowVM } from './types.js';

// Port of handlers/portfolio_subpages_data.go LoadAllocationViewModel and its
// helpers. loadPortfolioListFormVM (portfolio_lists.go) is not needed: the
// edit form is filled from the list rows this already loads.

type S = components['schemas'];
type StockAllocation = S['StockAllocationDTO'];
type SectorAllocation = S['SectorAllocationDTO'];

const ALLOCATION_CHART_TOP_N = 8;

const uuidLower = (id: string) => (id ?? '').toLowerCase();

export function emptyAllocationViewModel(): AllocationViewModel {
	return {
		totalValue: '',
		subtitle: '',
		summaryMetrics: [],
		tips: [],
		costMeta: [],
		costRows: [],
		costTopRows: [],
		costOtherCount: 0,
		costOtherValue: '',
		costOtherWeight: '',
		costChart: null,
		sectorMeta: [],
		sectorRows: [],
		sectorChart: null,
		portfolioLists: [],
		hasCostData: false,
		hasSectorData: false,
		hasLists: false,
		loadError: false
	};
}

export async function loadAllocationViewModel(event: RequestEvent, includeSectorStatistics: boolean): Promise<AllocationViewModel> {
	const vm = emptyAllocationViewModel();

	const [summaryRes, listsRes, sectorRes] = await Promise.all([
		tryJSON<S['PortfolioSummaryResponse']>(event, 'GET', '/v1/portfolio/summary'),
		tryJSON<S['PortfolioListResponse'][]>(event, 'GET', '/v1/portfolio/lists'),
		includeSectorStatistics ? tryJSON<S['StatisticsDTO']>(event, 'GET', '/v1/statistics/stocks/sector-allocation') : Promise.resolve(null)
	]);
	if (summaryRes.failed || listsRes.failed || sectorRes?.failed) vm.loadError = true;
	const summary = summaryRes.data;
	const portfolioLists = listsRes.data ?? [];
	const sectorStats = sectorRes?.data ?? null;

	if (summary) {
		vm.totalValue = formatCurrency(summary.totalValue);
		if (summary.allocation.length > 0) {
			vm.subtitle = `${summary.allocation.length} allocation entries · ${vm.totalValue} total value`;
		}
		[vm.costRows, vm.costChart] = mapSummaryAllocations(summary.allocation, summary.totalValue, 'cost-allocation-chart');
		[vm.costTopRows, vm.costOtherCount, vm.costOtherValue, vm.costOtherWeight] = visibleAllocationRows(vm.costRows);
		vm.hasCostData = vm.costRows.length > 0;
	}

	if (sectorStats) {
		const sectors = sectorStats.importedStocks.sectorAllocations;
		[vm.sectorRows, vm.sectorChart] = mapSectorAllocations(sectors, 'sector-allocation-chart');
		vm.hasSectorData = vm.sectorRows.length > 0;
		if (vm.totalValue === '' && sectorStats.importedStocks.totalMarketValue > 0) {
			vm.totalValue = formatCurrency(sectorStats.importedStocks.totalMarketValue);
		}
	}

	if (summary || sectorStats) {
		const imported = importedStatsFromPortfolioSummary(summary);
		if (!summary && sectorStats) {
			imported.totalMarketValue = sectorStats.importedStocks.totalMarketValue;
			imported.totalPositions = sectorStats.importedStocks.totalPositions;
		}
		if (sectorStats) imported.sectorAllocations = sectorStats.importedStocks.sectorAllocations;
		const diag = buildAllocationDiagnostics(imported);
		vm.summaryMetrics = diag.summary;
		vm.costMeta = diag.costMeta;
		vm.sectorMeta = diag.sectorMeta;
		vm.tips = diag.tips;
	}

	if (portfolioLists.length > 0) {
		vm.portfolioLists = await loadPortfolioListSummaries(event, portfolioLists);
		vm.hasLists = vm.portfolioLists.length > 0;
	}
	return vm;
}

interface ImportedStats {
	totalCostBasis: number;
	totalMarketValue: number;
	totalPositions: number;
	totalRealizedPnl: number;
	totalUnrealizedPnl: number;
	stockAllocations: StockAllocation[];
	sectorAllocations: SectorAllocation[];
}

function importedStatsFromPortfolioSummary(summary: S['PortfolioSummaryResponse'] | null): ImportedStats {
	const imported: ImportedStats = {
		totalCostBasis: 0,
		totalMarketValue: 0,
		totalPositions: 0,
		totalRealizedPnl: 0,
		totalUnrealizedPnl: 0,
		stockAllocations: [],
		sectorAllocations: []
	};
	if (!summary) return imported;
	imported.totalCostBasis = summary.totalCost;
	imported.totalMarketValue = summary.totalValue;
	imported.totalPositions = summary.allocation.length;
	imported.totalRealizedPnl = summary.realizedPnl;
	imported.totalUnrealizedPnl = summary.unrealizedPnl;

	let total = summary.totalValue;
	if (total <= 0) for (const item of summary.allocation) total += item.value;
	if (total <= 0) return imported;
	imported.stockAllocations = summary.allocation.map((item) => ({
		symbol: item.symbol,
		value: item.value,
		weightPercent: (item.value / total) * 100
	}));
	return imported;
}

/** sort.Slice is not stable; a stable descending sort matches it on the inputs that matter. */
const byWeightDesc = <T extends { weightPercent: number }>(items: T[]) => [...items].sort((a, b) => b.weightPercent - a.weightPercent);

function buildAllocationDiagnostics(imported: ImportedStats) {
	const stocks = byWeightDesc(imported.stockAllocations);
	const sectors = byWeightDesc(imported.sectorAllocations);

	const [largestHoldingLabel, largestHoldingWeight] = stocks.length ? [stocks[0].symbol.trim(), stocks[0].weightPercent] : ['', 0];
	const [largestSectorLabel, largestSectorWeight] = sectors.length ? [sectors[0].sector.trim(), sectors[0].weightPercent] : ['', 0];
	const topThreeWeight = stocks.slice(0, 3).reduce((t, r) => t + r.weightPercent, 0);
	const returnOnCost = imported.totalCostBasis > 0 ? (imported.totalUnrealizedPnl / imported.totalCostBasis) * 100 : 0;

	const m = (label: string, value: string, tone: string, delta = ''): AllocationMetricVM => ({ label, value, delta, tone });

	const summary: AllocationMetricVM[] = [
		m('Market value', formatCurrency(imported.totalMarketValue), 'neutral'),
		m('Cost basis', formatCurrency(imported.totalCostBasis), 'neutral'),
		m('Unrealized P/L', formatSignedCurrency(imported.totalUnrealizedPnl), pnlTone(imported.totalUnrealizedPnl), formatPercent(returnOnCost)),
		m('Positions', String(imported.totalPositions), 'neutral'),
		m('Sectors', String(sectors.length), 'neutral')
	];
	if (largestHoldingLabel) {
		summary.push(m('Largest holding', largestHoldingLabel, concentrationTone(largestHoldingWeight, 25), formatPercent(largestHoldingWeight)));
	}
	if (largestSectorLabel) {
		summary.push(m('Largest sector', largestSectorLabel, concentrationTone(largestSectorWeight, 35), formatPercent(largestSectorWeight)));
	}

	let costMeta: AllocationMetricVM[] = [];
	if (stocks.length > 0) {
		costMeta = [m('Top 3 weight', formatPercent(topThreeWeight), concentrationTone(topThreeWeight, 60)), m('Holdings counted', String(stocks.length), 'neutral')];
		if (largestHoldingLabel) {
			costMeta.unshift(m('Largest holding', largestHoldingLabel, concentrationTone(largestHoldingWeight, 25), formatPercent(largestHoldingWeight)));
		}
	}

	let sectorMeta: AllocationMetricVM[] = [];
	if (sectors.length > 0) {
		sectorMeta = [m('Sector count', String(sectors.length), sectorCountTone(sectors.length))];
		if (largestSectorLabel) {
			sectorMeta.unshift(m('Largest sector', largestSectorLabel, concentrationTone(largestSectorWeight, 35), formatPercent(largestSectorWeight)));
		}
		sectorMeta.push(m('Equal-weight baseline', formatPercent(100 / sectors.length), 'neutral'));
	}

	const tips = buildAllocationTips(stocks, sectors, largestHoldingLabel, largestHoldingWeight, largestSectorLabel, largestSectorWeight, topThreeWeight, returnOnCost);
	return { summary, costMeta, sectorMeta, tips };
}

function buildAllocationTips(
	stocks: StockAllocation[],
	sectors: SectorAllocation[],
	largestHoldingLabel: string,
	largestHoldingWeight: number,
	largestSectorLabel: string,
	largestSectorWeight: number,
	topThreeWeight: number,
	returnOnCost: number
): AllocationTipVM[] {
	if (stocks.length === 0 && sectors.length === 0) return [];
	const tips: AllocationTipVM[] = [];
	const allUnknown = largestSectorLabel.trim().toLowerCase() === 'unknown' && largestSectorWeight >= 99.5;
	if (stocks.length > 0 && sectors.length === 1 && allUnknown) {
		tips.push({
			title: 'Sector metadata missing for all holdings',
			detail: 'Every position is grouped as Unknown, so sector concentration cannot be trusted yet.',
			value: formatPercent(largestSectorWeight),
			tone: 'warning',
			action: 'Improve metadata'
		});
	}
	if (largestHoldingWeight >= 25) {
		tips.push({
			title: 'Single-name concentration',
			detail: 'Review how much portfolio outcome depends on one company before adding to that position.',
			value: `${largestHoldingLabel} at ${formatPercent(largestHoldingWeight)}`,
			tone: 'warning',
			action: 'Review concentration'
		});
	}
	if (topThreeWeight >= 60) {
		tips.push({
			title: 'Top holdings drive most exposure',
			detail: 'The three largest positions carry most of the portfolio weight. Compare that with your intended risk budget.',
			value: formatPercent(topThreeWeight),
			tone: 'warning',
			action: 'Set target weights'
		});
	}
	if (largestSectorWeight >= 35 && !allUnknown) {
		tips.push({
			title: 'Sector exposure is clustered',
			detail: 'A large sector weight can make portfolio returns move with one part of the market.',
			value: `${largestSectorLabel} at ${formatPercent(largestSectorWeight)}`,
			tone: 'warning',
			action: 'Review exposure'
		});
	}
	if (sectors.length > 0 && sectors.length < 4) {
		tips.push({
			title: 'Few sectors represented',
			detail: 'A broader sector mix can make allocation reviews easier to compare against your target portfolio.',
			value: `${sectors.length} sectors`,
			tone: 'info',
			action: 'Add sector data'
		});
	}
	if (stocks.length > 0 && sectors.length === 0) {
		tips.push({
			title: 'Sector data missing',
			detail: 'Some holdings do not have sector metadata yet, so the sector view may understate true exposure.',
			value: 'Data quality',
			tone: 'info',
			action: 'Improve metadata'
		});
	}
	if (Math.abs(returnOnCost) >= 10) {
		const loss = returnOnCost < 0;
		tips.push({
			title: loss ? 'Embedded losses to monitor' : 'Embedded gains to monitor',
			detail: loss
				? 'Meaningful unrealized losses can shift risk away from your original allocation plan.'
				: 'Meaningful unrealized gains can change position weights. Re-check allocation after large price moves.',
			value: formatPercent(returnOnCost),
			tone: loss ? 'danger' : 'success',
			action: 'Review drift'
		});
	}
	if (tips.length === 0) {
		tips.push({
			title: 'Allocation looks balanced',
			detail: 'No concentration threshold is currently flagged. Keep reviewing weights as prices and holdings change.',
			value: 'Review',
			tone: 'neutral',
			action: 'Keep monitoring'
		});
	}
	return tips;
}

function pnlTone(value: number): string {
	if (value > 0) return 'success';
	if (value < 0) return 'danger';
	return 'neutral';
}

const concentrationTone = (value: number, threshold: number) => (value >= threshold ? 'warning' : 'neutral');
const sectorCountTone = (count: number) => (count > 0 && count < 4 ? 'warning' : 'neutral');

/** handlers.formatOverweight */
function formatOverweight(delta: number): string {
	if (Math.abs(delta) < 0.05) return 'Equal weight';
	const sign = delta < 0 ? '' : '+';
	return `${sign}${formatFloat(delta, 1)}% vs equal`;
}

function collapseAllocationTopN(labels: string[], weights: number[]): [string[], number[]] {
	if (labels.length <= ALLOCATION_CHART_TOP_N) return [labels, weights];
	const other = weights.slice(ALLOCATION_CHART_TOP_N).reduce((t, w) => t + w, 0);
	return [
		[...labels.slice(0, ALLOCATION_CHART_TOP_N), 'Other'],
		[...weights.slice(0, ALLOCATION_CHART_TOP_N), other]
	];
}

function mapSummaryAllocations(items: S['AllocationItem'][], totalValue: number, chartID: string): [AllocationSliceVM[], PieInput | null] {
	if (items.length === 0) return [[], null];
	const sorted = [...items].sort((a, b) => b.value - a.value);
	let total = totalValue;
	if (total <= 0) for (const item of sorted) total += item.value;
	if (total <= 0) return [[], null];

	const [labels, weights] = collapseAllocationTopN(
		sorted.map((r) => r.symbol),
		sorted.map((r) => (r.value / total) * 100)
	);
	const rows = sorted.map((row, i): AllocationSliceVM => {
		const weight = (row.value / total) * 100;
		return {
			label: row.symbol,
			value: formatCurrency(row.value),
			percent: formatPercent(weight),
			overweight: '',
			color: allocationColor(i),
			rawValue: row.value,
			rawPercent: weight
		};
	});
	return [rows, { chartID, labels, weights }];
}

function visibleAllocationRows(rows: AllocationSliceVM[]): [AllocationSliceVM[], number, string, string] {
	if (rows.length <= ALLOCATION_CHART_TOP_N) return [rows, 0, '', ''];
	const visible = rows.slice(0, ALLOCATION_CHART_TOP_N);
	let otherValue = 0;
	let otherWeight = 0;
	for (const row of rows.slice(ALLOCATION_CHART_TOP_N)) {
		otherValue += row.rawValue;
		otherWeight += row.rawPercent;
	}
	visible.push({
		label: 'Other',
		value: formatCurrency(otherValue),
		percent: formatPercent(otherWeight),
		overweight: '',
		color: '#64748B',
		rawValue: otherValue,
		rawPercent: otherWeight
	});
	return [visible, rows.length - ALLOCATION_CHART_TOP_N, formatCurrency(otherValue), formatPercent(otherWeight)];
}

function mapSectorAllocations(items: SectorAllocation[], chartID: string): [AllocationSliceVM[], PieInput | null] {
	if (items.length === 0) return [[], null];
	const sorted = byWeightDesc(items);
	const equalWeight = 100 / sorted.length;
	const [labels, weights] = collapseAllocationTopN(
		sorted.map((r) => r.sector),
		sorted.map((r) => r.weightPercent)
	);
	const rows = sorted.map(
		(row, i): AllocationSliceVM => ({
			label: row.sector,
			value: formatCurrency(row.value),
			percent: formatPercent(row.weightPercent),
			overweight: formatOverweight(row.weightPercent - equalWeight),
			color: allocationColor(i),
			rawValue: row.value,
			rawPercent: row.weightPercent
		})
	);
	return [rows, { chartID, labels, weights }];
}

async function loadPortfolioListSummaries(event: RequestEvent, lists: S['PortfolioListResponse'][]): Promise<PortfolioListRowVM[]> {
	const out = await Promise.all(
		lists.map(async (list): Promise<PortfolioListRowVM> => {
			const query = { portfolioListId: list.id };
			const [summary, stocks] = await Promise.all([
				tryJSON<S['PortfolioSummaryResponse']>(event, 'GET', '/v1/portfolio/summary', undefined, { query }),
				tryJSON<S['StockListItem'][]>(event, 'GET', '/v1/stocks', undefined, { query })
			]);
			const id = uuidLower(list.id);
			return {
				id,
				name: list.name,
				isDefault: list.isDefault,
				canDelete: !list.isDefault,
				positionCount: `${stocks.data?.length ?? 0} positions`,
				totalValue: summary.data ? formatCurrency(summary.data.totalValue) : '',
				holdingsURL: '/portfolio?list=' + id
			};
		})
	);
	return out.sort((a, b) => {
		if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
		const x = a.name.toLowerCase();
		const y = b.name.toLowerCase();
		return x < y ? -1 : x > y ? 1 : 0;
	});
}

export const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());
