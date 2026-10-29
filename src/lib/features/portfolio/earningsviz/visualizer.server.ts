import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { formatCompactCurrency, formatFloat } from '#lib/format.js';
import { emptyVisualizer, type FlowMetricVM, type VisualizerVM } from './types.js';

// Port of handlers/earnings_visualizer_data.go (LoadEarningsVisualizerViewModel).
// `auth: 'public'` covers the Go call made without a session editor.

type IncomeStatement = components['schemas']['IncomeStatementResponse'];
type Num = number | null | undefined;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** openapi_types.Date → Format("2006-01-02"). */
function dateValue(raw: string): string {
	return (raw ?? '').slice(0, 10);
}

function dateLabel(raw: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw ?? '');
	if (!m) return raw ?? '';
	return `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
}

export async function loadEarningsVisualizerViewModel(
	event: RequestEvent,
	symbolRaw: string,
	filing: string,
	action: string,
	auth: 'session' | 'public' = 'session'
): Promise<VisualizerVM> {
	const symbol = symbolRaw.trim().toUpperCase();
	const vm: VisualizerVM = { ...emptyVisualizer(), symbol, inputSymbol: symbol, action, filing: filing.trim() };
	if (!symbol) return vm;

	let statements: IncomeStatement[] | null = null;
	try {
		statements = await apiJSON<IncomeStatement[]>(event, 'GET', `/v1/market/income-statement/${encodeURIComponent(symbol)}`, undefined, {
			query: { limit: 4, period: 'quarter' },
			auth
		});
	} catch {
		statements = null;
	}
	if (!statements || statements.length === 0) {
		vm.error = 'Could not load income statement data for ' + symbol + '.';
		return vm;
	}

	let selected = statements[0];
	for (const row of statements) {
		if (dateValue(row.date) === vm.filing) {
			selected = row;
			break;
		}
	}
	vm.filing = dateValue(selected.date);
	for (const row of statements) {
		const value = dateValue(row.date);
		vm.filings.push({ label: incomeStatementFilingLabel(row), value, selected: value === vm.filing });
	}
	return mapIncomeStatementVisualizer(selected, vm);
}

export function mapIncomeStatementVisualizer(row: IncomeStatement, vm: VisualizerVM): VisualizerVM {
	const revenue = row.revenue ?? 0;
	if (revenue <= 0) {
		vm.error = 'This filing does not include revenue data.';
		return vm;
	}

	const grossProfit = firstNonZero(row.grossProfit, diff(row.revenue, row.costOfRevenue));
	const costOfRevenue = firstNonZero(row.costOfRevenue, diff(row.revenue, grossProfit));
	const operatingIncome = firstNonZero(row.operatingIncome, row.ebit);
	const operatingExpenses = firstNonZero(row.operatingExpenses, diff(grossProfit, operatingIncome));
	const netIncome = firstNonZero(row.netIncome, row.bottomLineNetIncome, row.netIncomeFromContinuingOperations);
	const tax = row.incomeTaxExpense;
	const other = firstNonZero(row.totalOtherIncomeExpensesNet, diff(operatingIncome, netIncome));

	vm.hasData = true;
	vm.currency = row.reportedCurrency?.trim() || 'USD';
	vm.filingLabel = incomeStatementFilingLabel(row);
	if (row.eps !== undefined && row.eps !== null) vm.eps = '$' + formatFloat(row.eps, 2);

	vm.revenue = flowMetric('Revenue', row.revenue, '', 'source', revenue);
	vm.grossProfit = flowMetric('Gross profit', grossProfit, marginText(grossProfit, revenue), 'positive', revenue);
	vm.costOfRevenue = flowMetric('Cost of revenue', costOfRevenue, marginText(costOfRevenue, revenue), 'negative', revenue);
	vm.operatingIncome = flowMetric('Operating income', operatingIncome, marginText(operatingIncome, revenue), 'positive', revenue);
	vm.operatingExpenses = flowMetric('Operating expenses', operatingExpenses, marginText(operatingExpenses, revenue), 'negative', revenue);
	vm.researchDev = flowMetric('R&D', row.researchAndDevelopmentExpenses, '', 'negative', revenue);
	vm.sga = flowMetric(
		'SG&A',
		firstNonZero(row.sellingGeneralAndAdministrativeExpenses, row.generalAndAdministrativeExpenses, row.sellingAndMarketingExpenses),
		'',
		'negative',
		revenue
	);
	vm.tax = flowMetric('Tax', tax, marginText(tax, revenue), 'negative', revenue);
	vm.other = flowMetric('Other', other, marginText(other, revenue), 'neutral', revenue);
	vm.netIncome = flowMetric('Net income', netIncome, marginText(netIncome, revenue), 'positive-strong', revenue);
	return vm;
}

function flowMetric(label: string, value: Num, subtext: string, tone: string, maxValue: number): FlowMetricVM {
	if (value === null || value === undefined || Math.abs(value) < 0.000001) {
		return { label, value: '', subtext: '', tone, widthPercent: '', visible: false };
	}
	const pct = Math.abs(value) / Math.max(maxValue, 1);
	const height = 56 + Math.min(180, pct * 220);
	return {
		label,
		value: formatCompactCurrency(Math.abs(value)),
		subtext,
		tone,
		widthPercent: formatFloat(height, 0) + 'px',
		visible: true
	};
}

export function incomeStatementFilingLabel(row: IncomeStatement): string {
	const parts: string[] = [];
	if (row.period?.trim()) parts.push(row.period.trim());
	if (row.fiscalYear?.trim()) parts.push('FY ' + row.fiscalYear.trim());
	if (parts.length === 0) return dateLabel(row.date);
	return parts.join(' ') + ' · ' + dateLabel(row.date);
}

function marginText(value: Num, revenue: number): string {
	if (value === null || value === undefined || revenue <= 0) return '';
	return `Margin ${formatFloat((value / revenue) * 100, 1)}%`;
}

function firstNonZero(...values: Num[]): number | undefined {
	for (const v of values) if (v !== null && v !== undefined && Math.abs(v) > 0.000001) return v;
	return undefined;
}

function diff(a: Num, b: Num): number | undefined {
	if (a === null || a === undefined || b === null || b === undefined) return undefined;
	return a - b;
}
