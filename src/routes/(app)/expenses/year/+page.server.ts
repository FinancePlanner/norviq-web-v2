import type { PageServerLoad } from './$types';
import type { components } from '#lib/api/schema.js';
import { api } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { buildYearViewModel } from '#lib/features/money/expenses/year.js';
import { loadBudgetCurrency } from '#lib/features/dashboard/budget-currency.server.js';
import { loadAccountCurrency } from '#lib/features/portfolio/account-currency.server.js';

// GET /expenses/year — ExpensesYear + LoadYearViewModel (expenses_data.go),
// behind requireYearOverview. The chart spec is built in the page.

type MonthRow = components['schemas']['BudgetMonthSummaryResponse'];
type YearRow = components['schemas']['BudgetYearSummaryResponse'];

export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.YearOverview, 'Year overview');

	let year = new Date().getFullYear();
	const raw = (event.url.searchParams.get('year') ?? '').trim();
	if (/^[+-]?\d+$/.test(raw)) {
		const y = Number.parseInt(raw, 10);
		if (y > 2000) year = y;
	}

	const client = api(event);
	const [monthRes, yearRes, budgetCurrency, account] = await Promise.all([
		client
			.GET('/v1/reports/expenses', {
				params: { query: { from: `${year}-01-01`, to: `${year}-12-31`, granularity: 'month' } }
			})
			.catch(() => null),
		client
			.GET('/v1/reports/expenses', {
				params: { query: { from: `${year - 1}-01-01`, to: `${year}-12-31`, granularity: 'year' } }
			})
			.catch(() => null),
		loadBudgetCurrency(event),
		loadAccountCurrency(event)
	]);
	const monthRows =
		(monthRes?.response.ok ? (monthRes.data as MonthRow[] | undefined) : undefined) ?? [];
	const yearRows =
		(yearRes?.response.ok ? (yearRes.data as YearRow[] | undefined) : undefined) ?? [];
	// Spend carries no currency: this month's budget currency, else the account's.
	const fmt = { currency: budgetCurrency || account.currency, locale: event.locals.locale };
	return buildYearViewModel(monthRows, yearRows, year, fmt);
};
