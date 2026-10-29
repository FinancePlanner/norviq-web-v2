// Port of norviq-web internal/handlers/stock_detail_analysis_data.go
// (buildAnalysisTabVM and its mappers) plus the mapBasicFinancials helpers it
// borrows from stock_detail_market_depth.go. Pure functions, no I/O.
import type { components } from '#lib/api/schema.js';
import type { GrowthSparklinePoint } from '#lib/charts/growth-sparkline.js';
import { formatCurrency, formatFloat, formatSignedPercent } from '#lib/format.js';
import { mapGradesConsensus } from '../consensus.js';
import {
	formatOptionalCompactCurrency,
	formatOptionalCurrency,
	formatOptionalNumber,
	formatOptionalRatioPercent
} from '../format.js';
import type { StatementRowVM } from '../types.js';
import {
	emptyAnalysisTab,
	emptyDCFBand,
	type AnalysisEstimateRowVM,
	type AnalysisMetricVM,
	type AnalysisSectionVM,
	type AnalysisTabVM,
	type DCFBandVM,
	type DCFCardVM,
	type GrowthSparklineVM
} from './types.js';

type Schemas = components['schemas'];
export type StockAnalysisMetricsResponse = Schemas['StockAnalysisMetricsResponse'];
export type RatiosTTMResponse = Schemas['RatiosTTMResponse'];
export type FinancialGrowthResponse = Schemas['FinancialGrowthResponse'];
export type AnalystEstimatesResponse = Schemas['AnalystEstimatesResponse'];
export type BasicFinancialsResponse = Schemas['BasicFinancialsResponse'];
export type BasicFinancialSeriesPoint = Schemas['BasicFinancialSeriesPoint'];
export type GradesConsensusResponse = Schemas['GradesConsensusResponse'];

type Num = number | null | undefined;

/** metricKind (Go iota). */
const MetricKind = {
	Multiple: 0,
	Percent: 1,
	Currency: 2,
	CompactCurrency: 3,
	Plain: 4,
	Turnover: 5
} as const;
type MetricKind = (typeof MetricKind)[keyof typeof MetricKind];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** openapi_types.Date ("2006-01-02") formatted as "2006". */
const dateYear = (d: string) => d.slice(0, 4);
/** openapi_types.Date formatted as "Jan 2006". */
const dateMonthYear = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

export function buildAnalysisTabVM(
	analysis: StockAnalysisMetricsResponse | null,
	ratiosTTM: RatiosTTMResponse | null,
	growthRows: FinancialGrowthResponse[] | null,
	estimates: AnalystEstimatesResponse[] | null,
	financials: BasicFinancialsResponse | null,
	consensus: GradesConsensusResponse[] | null
): AnalysisTabVM {
	const tab = emptyAnalysisTab();

	if (analysis) {
		tab.kpis = analysisKPIs(analysis);
		tab.dcf = mapAnalysisDCF(analysis);
		tab.dcfBand = mapDCFBand(analysis);
		tab.sections.push(...analysisCoreSections(analysis));
	}

	if (ratiosTTM) {
		tab.sections.push(...ratiosTTMSections(ratiosTTM));
	}

	if (financials) {
		const section = basicFinancialsSection(financials);
		if (section.metrics.length > 0) tab.sections.push(section);
	}

	if (growthRows) {
		const section = financialGrowthSection(growthRows);
		if (section.metrics.length > 0) tab.sections.push(section);
	}

	if (estimates) {
		tab.estimates = mapAnalystEstimateRows(estimates);
		if (tab.estimates.length > 0) {
			tab.sections.push(
				section('estimates', 'Forward estimates', 'Consensus revenue, EPS, and EBITDA ranges by fiscal period')
			);
		}
	}

	if (consensus) {
		tab.consensus = mapGradesConsensus(consensus);
	}

	tab.hasData =
		tab.kpis.length > 0 ||
		tab.sections.length > 0 ||
		tab.dcf.hasData ||
		tab.consensus.hasData ||
		tab.estimates.length > 0;

	return tab;
}

function section(id: string, title: string, subtitle: string): AnalysisSectionVM {
	return { id, title, subtitle, metrics: [], growthSparklines: [] };
}

type Field = [label: string, value: Num, kind: MetricKind];

function analysisKPIs(m: StockAnalysisMetricsResponse): AnalysisMetricVM[] {
	const candidates: Field[] = [
		['TTM P/E', m.ttmPE, MetricKind.Multiple],
		['Forward P/E', m.forwardPE, MetricKind.Multiple],
		['2Y forward P/E', m.twoYearForwardPE, MetricKind.Multiple],
		['TTM PEG', m.ttmPEGRatio, MetricKind.Multiple],
		['Gross margin', m.grossMargin, MetricKind.Percent],
		['Net margin', m.netMargin, MetricKind.Percent]
	];
	const out: AnalysisMetricVM[] = [];
	for (const [label, value, kind] of candidates) appendAnalysisMetric(out, label, value, kind);
	return out;
}

function analysisCoreSections(m: StockAnalysisMetricsResponse): AnalysisSectionVM[] {
	const valuation = section('valuation', 'Valuation', 'Multiples, market structure, and discount rate inputs');
	const profitability = section('profitability', 'Profitability', 'Margin profile and earnings power');
	const growth = section('growth', 'Growth', 'Historical and forward growth rates');
	const forecast = section('dcf-inputs', 'DCF inputs', 'Terminal assumptions and exit multiples');

	const valuationFields: Field[] = [
		['Current price', m.currentPrice, MetricKind.Currency],
		['Market cap', m.marketCap, MetricKind.CompactCurrency],
		['Shares outstanding', m.sharesOutstanding, MetricKind.CompactCurrency],
		['Net debt', m.netDebt, MetricKind.CompactCurrency],
		['TTM P/E', m.ttmPE, MetricKind.Multiple],
		['Forward P/E', m.forwardPE, MetricKind.Multiple],
		['2Y forward P/E', m.twoYearForwardPE, MetricKind.Multiple],
		['TTM PEG', m.ttmPEGRatio, MetricKind.Multiple],
		['Exit P/E low', m.exitPELow, MetricKind.Multiple],
		['Exit P/E high', m.exitPEHigh, MetricKind.Multiple],
		['WACC', m.wacc, MetricKind.Percent]
	];
	const profitFields: Field[] = [
		['Gross margin', m.grossMargin, MetricKind.Percent],
		['Net margin', m.netMargin, MetricKind.Percent],
		['Terminal margin', m.terminalMargin, MetricKind.Percent]
	];
	const growthFields: [string, Num][] = [
		['TTM revenue growth', m.ttmRevenueGrowth],
		['TTM EPS growth', m.ttmEPSGrowth],
		['Last year revenue growth', m.lastYearRevenueGrowth],
		['Last year EPS growth', m.lastYearEPSGrowth],
		['Current quarter revenue vs PY', m.currentQuarterRevenueGrowthVsPreviousYear],
		['Current quarter EPS vs PY', m.currentQuarterEPSGrowthVsPreviousYear],
		['Current year expected revenue growth', m.currentYearExpectedRevenueGrowth],
		['Current year expected EPS growth', m.currentYearExpectedEPSGrowth],
		['Next year revenue growth', m.nextYearRevenueGrowth],
		['Next year EPS growth', m.nextYearEPSGrowth],
		['2Y stack expected revenue growth', m.twoYearStackExpectedRevenueGrowth],
		['2Y stack expected EPS growth', m.twoYearStackExpectedEPSGrowth],
		['TTM vs NTM revenue growth', m.ttmVsNTMRevenueGrowth],
		['TTM vs NTM EPS growth', m.ttmVsNTMEPSGrowth]
	];
	const dcfFields: Field[] = [
		['Terminal growth rate', m.terminalGrowthRate, MetricKind.Percent],
		['Terminal margin', m.terminalMargin, MetricKind.Percent],
		['DCF bear', m.dcfBearPrice, MetricKind.Currency],
		['DCF base', m.dcfBasePrice, MetricKind.Currency],
		['DCF bull', m.dcfBullPrice, MetricKind.Currency],
		['Base year', m.baseYear, MetricKind.Plain]
	];

	for (const [label, value, kind] of valuationFields) appendAnalysisMetric(valuation.metrics, label, value, kind);
	for (const [label, value, kind] of profitFields) appendAnalysisMetric(profitability.metrics, label, value, kind);
	for (const [label, value] of growthFields) {
		if (value == null) continue;
		appendGrowthMetric(growth.metrics, label, value);
	}
	for (const [label, value, kind] of dcfFields) appendAnalysisMetric(forecast.metrics, label, value, kind);

	return [valuation, profitability, growth, forecast].filter((s) => s.metrics.length > 0);
}

function ratiosTTMSections(r: RatiosTTMResponse): AnalysisSectionVM[] {
	const groups: { id: string; title: string; subtitle: string; fields: Field[] }[] = [
		{
			id: 'ttm-valuation',
			title: 'TTM valuation',
			subtitle: 'Trailing twelve-month market multiples',
			fields: [
				['P/E (TTM)', r.priceToEarningsRatioTTM, MetricKind.Multiple],
				['P/S (TTM)', r.priceToSalesRatioTTM, MetricKind.Multiple],
				['P/B (TTM)', r.priceToBookRatioTTM, MetricKind.Multiple],
				['P/FCF (TTM)', r.priceToFreeCashFlowRatioTTM, MetricKind.Multiple],
				['P/OCF (TTM)', r.priceToOperatingCashFlowRatioTTM, MetricKind.Multiple],
				['PEG (TTM)', r.priceToEarningsGrowthRatioTTM, MetricKind.Multiple],
				['Forward PEG (TTM)', r.forwardPriceToEarningsGrowthRatioTTM, MetricKind.Multiple],
				['EV multiple (TTM)', r.enterpriseValueMultipleTTM, MetricKind.Multiple],
				['Enterprise value (TTM)', r.enterpriseValueTTM, MetricKind.CompactCurrency],
				['Dividend yield (TTM)', r.dividendYieldTTM, MetricKind.Percent],
				['Dividend payout (TTM)', r.dividendPayoutRatioTTM, MetricKind.Percent]
			]
		},
		{
			id: 'ttm-margins',
			title: 'TTM margins',
			subtitle: 'Profitability on a trailing basis',
			fields: [
				['Gross margin (TTM)', r.grossProfitMarginTTM, MetricKind.Percent],
				['Operating margin (TTM)', r.operatingProfitMarginTTM, MetricKind.Percent],
				['EBIT margin (TTM)', r.ebitMarginTTM, MetricKind.Percent],
				['EBITDA margin (TTM)', r.ebitdaMarginTTM, MetricKind.Percent],
				['Pretax margin (TTM)', r.pretaxProfitMarginTTM, MetricKind.Percent],
				['Net margin (TTM)', r.netProfitMarginTTM, MetricKind.Percent],
				['Bottom-line margin (TTM)', r.bottomLineProfitMarginTTM, MetricKind.Percent],
				['Continuous ops margin (TTM)', r.continuousOperationsProfitMarginTTM, MetricKind.Percent]
			]
		},
		{
			id: 'ttm-liquidity',
			title: 'Liquidity & leverage',
			subtitle: 'Balance-sheet strength and coverage',
			fields: [
				['Current ratio (TTM)', r.currentRatioTTM, MetricKind.Plain],
				['Quick ratio (TTM)', r.quickRatioTTM, MetricKind.Plain],
				['Cash ratio (TTM)', r.cashRatioTTM, MetricKind.Plain],
				['Debt / equity (TTM)', r.debtToEquityRatioTTM, MetricKind.Plain],
				['Debt / capital (TTM)', r.debtToCapitalRatioTTM, MetricKind.Plain],
				['Debt / assets (TTM)', r.debtToAssetsRatioTTM, MetricKind.Plain],
				['Financial leverage (TTM)', r.financialLeverageRatioTTM, MetricKind.Plain],
				['Interest coverage (TTM)', r.interestCoverageRatioTTM, MetricKind.Plain],
				['Debt service coverage (TTM)', r.debtServiceCoverageRatioTTM, MetricKind.Plain],
				['Solvency ratio (TTM)', r.solvencyRatioTTM, MetricKind.Plain]
			]
		},
		{
			id: 'ttm-efficiency',
			title: 'Efficiency & per share',
			subtitle: 'Capital turns and per-share economics',
			fields: [
				['Asset turnover (TTM)', r.assetTurnoverTTM, MetricKind.Turnover],
				['Inventory turnover (TTM)', r.inventoryTurnoverTTM, MetricKind.Turnover],
				['Receivables turnover (TTM)', r.receivablesTurnoverTTM, MetricKind.Turnover],
				['Payables turnover (TTM)', r.payablesTurnoverTTM, MetricKind.Turnover],
				['Fixed asset turnover (TTM)', r.fixedAssetTurnoverTTM, MetricKind.Turnover],
				['Working capital turnover (TTM)', r.workingCapitalTurnoverRatioTTM, MetricKind.Turnover],
				['Revenue / share (TTM)', r.revenuePerShareTTM, MetricKind.Currency],
				['Net income / share (TTM)', r.netIncomePerShareTTM, MetricKind.Currency],
				['FCF / share (TTM)', r.freeCashFlowPerShareTTM, MetricKind.Currency],
				['OCF / share (TTM)', r.operatingCashFlowPerShareTTM, MetricKind.Currency],
				['Book value / share (TTM)', r.bookValuePerShareTTM, MetricKind.Currency],
				['Cash / share (TTM)', r.cashPerShareTTM, MetricKind.Currency],
				['CapEx / share (TTM)', r.capexPerShareTTM, MetricKind.Currency]
			]
		},
		{
			id: 'ttm-coverage',
			title: 'Cash coverage',
			subtitle: 'Dividend, CapEx, and operating cash coverage',
			fields: [
				['FCF / OCF ratio (TTM)', r.freeCashFlowOperatingCashFlowRatioTTM, MetricKind.Plain],
				['OCF / sales (TTM)', r.operatingCashFlowSalesRatioTTM, MetricKind.Percent],
				['OCF coverage (TTM)', r.operatingCashFlowCoverageRatioTTM, MetricKind.Plain],
				['CapEx coverage (TTM)', r.capitalExpenditureCoverageRatioTTM, MetricKind.Plain],
				['Dividend + CapEx coverage (TTM)', r.dividendPaidAndCapexCoverageRatioTTM, MetricKind.Plain],
				['Short-term OCF coverage (TTM)', r.shortTermOperatingCashFlowCoverageRatioTTM, MetricKind.Plain],
				['Effective tax rate (TTM)', r.effectiveTaxRateTTM, MetricKind.Percent]
			]
		}
	];

	const out: AnalysisSectionVM[] = [];
	for (const g of groups) {
		const s = section(g.id, g.title, g.subtitle);
		for (const [label, value, kind] of g.fields) appendAnalysisMetric(s.metrics, label, value, kind);
		if (s.metrics.length > 0) out.push(s);
	}
	return out;
}

function basicFinancialsSection(data: BasicFinancialsResponse): AnalysisSectionVM {
	const s = section('market-snapshot', 'Market snapshot', 'Live ratio snapshot from market data providers');
	for (const row of mapBasicFinancialsRows(data)) {
		s.metrics.push({ label: row.label, value: row.value, hint: '', tone: '' });
	}
	return s;
}

function financialGrowthSection(rows: FinancialGrowthResponse[]): AnalysisSectionVM {
	// Newest first ("2006-01-02" strings sort chronologically).
	const sorted = [...rows].sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
	const latest = sorted[0];

	const s = section('financial-growth', 'Financial growth', `YoY and multi-year growth · ${dateMonthYear(latest.date)}`);
	s.growthSparklines = mapFinancialGrowthSparklines(sorted);

	const periodFields: [string, Num][] = [
		['Revenue growth', latest.revenueGrowth],
		['Gross profit growth', latest.grossProfitGrowth],
		['Operating income growth', latest.operatingIncomeGrowth],
		['EBIT growth', latest.ebitgrowth],
		['EBITDA growth', latest.ebitdaGrowth],
		['Net income growth', latest.netIncomeGrowth],
		['EPS growth', latest.epsgrowth],
		['EPS diluted growth', latest.epsdilutedGrowth],
		['Operating cash flow growth', latest.operatingCashFlowGrowth],
		['Free cash flow growth', latest.freeCashFlowGrowth],
		['Asset growth', latest.assetGrowth],
		['Debt growth', latest.debtGrowth],
		['Book value / share growth', latest.bookValueperShareGrowth]
	];
	const cagrFields: [string, Num][] = [
		['3Y revenue growth / share', latest.threeYRevenueGrowthPerShare],
		['5Y revenue growth / share', latest.fiveYRevenueGrowthPerShare],
		['10Y revenue growth / share', latest.tenYRevenueGrowthPerShare],
		['3Y EPS growth / share', latest.threeYNetIncomeGrowthPerShare],
		['5Y EPS growth / share', latest.fiveYNetIncomeGrowthPerShare],
		['10Y EPS growth / share', latest.tenYNetIncomeGrowthPerShare],
		['3Y OCF growth / share', latest.threeYOperatingCFGrowthPerShare],
		['5Y OCF growth / share', latest.fiveYOperatingCFGrowthPerShare],
		['3Y equity growth / share', latest.threeYShareholdersEquityGrowthPerShare],
		['5Y equity growth / share', latest.fiveYShareholdersEquityGrowthPerShare]
	];

	for (const [label, value] of periodFields) appendGrowthMetric(s.metrics, label, value);
	for (const [label, value] of cagrFields) appendGrowthMetric(s.metrics, label, value);
	return s;
}

function mapFinancialGrowthSparklines(rows: FinancialGrowthResponse[]): GrowthSparklineVM[] {
	if (rows.length < 2) return [];

	// Oldest first.
	const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

	const series: [string, (r: FinancialGrowthResponse) => Num][] = [
		['Revenue growth', (r) => r.revenueGrowth],
		['EPS growth', (r) => r.epsgrowth],
		['Net income growth', (r) => r.netIncomeGrowth]
	];

	const out: GrowthSparklineVM[] = [];
	for (const [label, value] of series) {
		const points: GrowthSparklinePoint[] = [];
		for (const row of sorted) {
			const raw = value(row);
			if (raw == null) continue;
			points.push({ label: dateYear(row.date), value: normalizeGrowthPercent(raw) });
		}
		if (points.length < 2) continue;

		const latest = points[points.length - 1].value;
		out.push({
			label,
			latest: formatSignedPercent(latest),
			tone: growthTone(latest),
			yearStart: points[0].label,
			yearEnd: points[points.length - 1].label,
			points
		});
	}
	return out;
}

function mapAnalystEstimateRows(rows: AnalystEstimatesResponse[]): AnalysisEstimateRowVM[] {
	const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
	return sorted.map((row) => ({
		period: dateYear(row.date),
		revenue: formatOptionalCompactCurrency(row.revenueAvg),
		eps: formatOptionalNumber(row.epsAvg),
		ebitda: formatOptionalCompactCurrency(row.ebitdaAvg),
		netIncome: formatOptionalCompactCurrency(row.netIncomeAvg),
		analystsEPS: row.numAnalystsEps != null && row.numAnalystsEps > 0 ? String(row.numAnalystsEps) : '-'
	}));
}

function mapAnalysisDCF(m: StockAnalysisMetricsResponse): DCFCardVM {
	return {
		hasData: m.dcfBearPrice != null || m.dcfBasePrice != null || m.dcfBullPrice != null,
		bear: formatOptionalCurrency(m.dcfBearPrice),
		base: formatOptionalCurrency(m.dcfBasePrice),
		bull: formatOptionalCurrency(m.dcfBullPrice),
		current: formatOptionalCurrency(m.currentPrice)
	};
}

function mapDCFBand(m: StockAnalysisMetricsResponse): DCFBandVM {
	const bear = m.dcfBearPrice;
	const base = m.dcfBasePrice;
	const bull = m.dcfBullPrice;
	const current = m.currentPrice;
	if (bear == null || base == null || bull == null || current == null) return emptyDCFBand();
	if (bull <= bear) return emptyDCFBand();

	let marker = ((current - bear) / (bull - bear)) * 100;
	marker = Math.max(0, Math.min(100, marker));

	const vm: DCFBandVM = {
		...emptyDCFBand(),
		hasData: true,
		bearLabel: formatCurrency(bear),
		baseLabel: formatCurrency(base),
		bullLabel: formatCurrency(bull),
		currentLabel: formatCurrency(current),
		markerPct: marker
	};
	if (current < base) {
		vm.downsideLabel = `${formatFloat(((base - current) / base) * 100, 1)}% below base`;
	} else if (current > base) {
		vm.upsideLabel = `+${formatFloat(((current - base) / base) * 100, 1)}% above base`;
	} else {
		vm.upsideLabel = 'At base case';
	}
	return vm;
}

function appendAnalysisMetric(rows: AnalysisMetricVM[], label: string, value: Num, kind: MetricKind) {
	const metric = formatAnalysisMetric(label, value, kind);
	if (metric) rows.push(metric);
}

function appendGrowthMetric(rows: AnalysisMetricVM[], label: string, value: Num) {
	if (value == null) return;
	const normalized = normalizeGrowthPercent(value);
	rows.push({ label, value: formatSignedPercent(normalized), hint: '', tone: growthTone(normalized) });
}

function normalizeGrowthPercent(value: number): number {
	if (value > -1 && value < 1 && value !== 0) return value * 100;
	return value;
}

function formatAnalysisMetric(label: string, value: Num, kind: MetricKind): AnalysisMetricVM | null {
	if (value == null) return null;
	let formatted: string;
	switch (kind) {
		case MetricKind.Percent:
			formatted = formatOptionalRatioPercent(value);
			break;
		case MetricKind.Currency:
			formatted = formatOptionalCurrency(value);
			break;
		case MetricKind.CompactCurrency:
			formatted = formatOptionalCompactCurrency(value);
			break;
		case MetricKind.Turnover:
			formatted = formatFloat(value, 2) + 'x';
			break;
		case MetricKind.Plain:
			formatted = label.toLowerCase().includes('year') ? formatFloat(value, 0) : formatOptionalNumber(value);
			break;
		default:
			formatted = formatOptionalNumber(value);
	}
	if (formatted === '-') return null;
	return { label, value: formatted, hint: '', tone: '' };
}

function growthTone(value: number): string {
	if (value > 0.05) return 'positive';
	if (value < -0.05) return 'negative';
	return 'neutral';
}

// ---- mapBasicFinancials (stock_detail_market_depth.go) -------------------

type Metric = BasicFinancialsResponse['metric'];
type Series = BasicFinancialsResponse['series'];

/** mapBasicFinancials(data).Metrics. */
export function mapBasicFinancialsRows(data: BasicFinancialsResponse): StatementRowVM[] {
	const rows: StatementRowVM[] = [];
	const { metric, series } = data;

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

	rows.push(...latestAnnualSeriesMetrics(series));
	return rows;
}

function resolvedPERatio(metric: Metric): number | null {
	for (const key of ['peTTM', 'peBasicExclExtraTTM', 'peExclExtraTTM', 'peAnnual', 'peNormalizedAnnual', 'forwardPE']) {
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

function latestAnnualSeriesMetrics(series: Series): StatementRowVM[] {
	const specs: [key: string, label: string][] = [
		['salesPerShare', 'Sales/share'],
		['currentRatio', 'Current ratio (annual)'],
		['netMargin', 'Net margin (annual)']
	];
	const out: StatementRowVM[] = [];
	for (const [key, label] of specs) {
		const value = seriesLatestValue(series, key, 'annual');
		if (value == null) continue;
		out.push({ label, value: formatOptionalNumber(value) });
	}
	return out;
}

function seriesLatestValue(series: Series | null | undefined, metricKey: string, frequency: string): number | null {
	if (!series) return null;
	const byMetric = series[frequency];
	if (!byMetric) return null;
	const points = byMetric[metricKey];
	if (!points || points.length === 0) return null;
	// Highest period string first.
	const sorted = [...points].sort((a, b) => (a.period > b.period ? -1 : a.period < b.period ? 1 : 0));
	return sorted[0].v;
}

/** Go decodes JSON numbers in map[string]any as float64; anything else is nil. */
function metricNumber(metric: Metric | null | undefined, key: string): number | null {
	if (!metric) return null;
	const raw = metric[key];
	if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
	return raw;
}

function metricPercentFraction(metric: Metric | null | undefined, key: string): number | null {
	const v = metricNumber(metric, key);
	return v == null ? null : v / 100;
}
