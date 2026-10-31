import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '#lib/server/api.js';
import { formatCurrency } from '#lib/format.js';
import { resolvePillarKey } from '#lib/features/money/pillars.js';
import {
	clampPercent,
	expensesPlannerURL,
	monthDateRange,
	monthLabel,
	monthQueryString,
	parseExpensesMonth,
	shortDate
} from '#lib/features/money/category-page/month.js';

// GET /expenses/categories/{pillar} — ExpensesCategory + LoadCategoryViewModel
// (expenses_data.go). A blank pillar 404s; any other key resolves (custom
// pillars are valid), exactly like resolvePillarKey.

export interface CategoryExpenseVM {
	id: string;
	title: string;
	amount: string;
	date: string;
}

export const load: PageServerLoad = async (event) => {
	const def = resolvePillarKey(event.params.pillar);
	if (!def) error(404, 'Not found');

	const month = parseExpensesMonth(event.url.searchParams.get('month'));
	const { from, to } = monthDateRange(month);
	const client = api(event);

	const [reportRes, expensesRes] = await Promise.all([
		client
			.GET('/v1/reports/expenses', { params: { query: { from, to, granularity: 'month' } } })
			.catch(() => null),
		client.GET('/v1/expenses', { params: { query: { from, to } } }).catch(() => null)
	]);
	const summaryRows = reportRes?.response.ok ? reportRes.data : undefined;
	const summary =
		Array.isArray(summaryRows) && summaryRows.length > 0 && 'monthStart' in summaryRows[0]
			? summaryRows[0]
			: null;
	const rows = (expensesRes?.response.ok ? expensesRes.data : undefined) ?? [];

	const planned = summary?.pillarPlans?.[def.key] ?? 0;
	const spent = summary?.pillarActuals?.[def.key] ?? 0;

	const expenses: CategoryExpenseVM[] = [];
	for (const row of rows) {
		if (row.pillar.trim().toLowerCase() !== def.key.toLowerCase()) continue;
		expenses.push({
			id: row.id,
			title: row.title,
			amount: formatCurrency(row.amount),
			date: shortDate(row.occurredOn)
		});
	}

	return {
		pillarKey: def.key,
		pillarLabel: def.label,
		monthLabel: monthLabel(month),
		monthQuery: monthQueryString(month),
		backURL: expensesPlannerURL(month),
		planned: formatCurrency(planned),
		spent: formatCurrency(spent),
		remaining: formatCurrency(Math.max(0, planned - spent)),
		progressPct: planned > 0 ? clampPercent((spent / planned) * 100) : 0,
		expenses
	};
};
