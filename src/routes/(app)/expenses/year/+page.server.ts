import type { PageServerLoad } from './$types';
import type { components } from '#lib/api/schema.js';
import { api } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { formatCurrency, formatSignedPercent } from '#lib/format.js';
import { shortMonth } from '#lib/features/money/category-page/month.js';

// GET /expenses/year — ExpensesYear + LoadYearViewModel (expenses_data.go),
// behind requireYearOverview. The chart spec is built in the page.

type MonthRow = components['schemas']['BudgetMonthSummaryResponse'];
type YearRow = components['schemas']['BudgetYearSummaryResponse'];

export interface YearMonthVM {
	label: string;
	monthQuery: string;
	spent: string;
	planned: string;
	heatPct: number;
}

/** formatYoYDelta */
function formatYoYDelta(previous: number, current: number): string {
	if (previous <= 0 && current <= 0) return '-';
	if (previous <= 0) return formatCurrency(current);
	return formatSignedPercent(((current - previous) / previous) * 100);
}

export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.YearOverview, 'Year overview');

	let year = new Date().getFullYear();
	const raw = (event.url.searchParams.get('year') ?? '').trim();
	if (/^[+-]?\d+$/.test(raw)) {
		const y = Number.parseInt(raw, 10);
		if (y > 2000) year = y;
	}

	const client = api(event);
	const [monthRes, yearRes] = await Promise.all([
		client
			.GET('/v1/reports/expenses', {
				params: { query: { from: `${year}-01-01`, to: `${year}-12-31`, granularity: 'month' } }
			})
			.catch(() => null),
		client
			.GET('/v1/reports/expenses', {
				params: { query: { from: `${year - 1}-01-01`, to: `${year}-12-31`, granularity: 'year' } }
			})
			.catch(() => null)
	]);
	const monthRows =
		(monthRes?.response.ok ? (monthRes.data as MonthRow[] | undefined) : undefined) ?? [];
	const yearRows =
		(yearRes?.response.ok ? (yearRes.data as YearRow[] | undefined) : undefined) ?? [];

	const byMonth = new Map<number, MonthRow>();
	let maxSpent = 0;
	let totalSpent = 0;
	let totalPlanned = 0;
	for (const row of monthRows) {
		const m = Number(String(row.monthStart).slice(5, 7));
		byMonth.set(m, row);
		totalSpent += row.actual;
		totalPlanned += row.planned;
		if (row.actual > maxSpent) maxSpent = row.actual;
	}

	const months: YearMonthVM[] = [];
	const labels: string[] = [];
	const values: number[] = [];
	for (let m = 1; m <= 12; m++) {
		const label = shortMonth(m - 1);
		const row = byMonth.get(m);
		const spent = row?.actual ?? 0;
		const planned = row?.planned ?? 0;
		months.push({
			label,
			monthQuery: `${year}-${String(m).padStart(2, '0')}`,
			spent: formatCurrency(spent),
			planned: formatCurrency(planned),
			heatPct: maxSpent > 0 ? (spent / maxSpent) * 100 : 0
		});
		labels.push(label);
		values.push(spent);
	}

	const thisYear = [...yearRows].reverse().find((r) => r.year === year);
	const lastYear = [...yearRows].reverse().find((r) => r.year === year - 1);

	return {
		year,
		totalSpent: formatCurrency(totalSpent),
		totalPlanned: formatCurrency(totalPlanned),
		yoySpent: formatYoYDelta(lastYear?.actual ?? 0, thisYear?.actual ?? 0),
		yoyPlanned: formatYoYDelta(lastYear?.planned ?? 0, thisYear?.planned ?? 0),
		months,
		labels,
		values
	};
};
