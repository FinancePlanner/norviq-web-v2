// GET /dashboard/activity (handlers.DashboardActivity →
// LoadActivityPageViewModel). Three independent fetches; each failure only
// flags its own panel.

import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { getJSON } from '../fetch.server.js';
import { mapFinancialHealth, type DashboardInsights } from '../insights/mappers.js';
import type { ActivityPageViewModel } from '../types.js';
import {
	activityPageDefaultLimit,
	activityPageMaxLimit,
	mapActivities,
	mapRecentSpend,
	type Expense,
	type UserActivity
} from './mappers.js';

type PortfolioSummary = components['schemas']['PortfolioSummaryResponse'];

/** activityPageLimitFromRequest: missing/invalid → 20, clamped to [20, 100]. */
export function activityPageLimit(raw: string | null): number {
	const value = (raw ?? '').trim();
	if (!value || !/^[+-]?\d+$/.test(value)) return activityPageDefaultLimit;
	const n = Number.parseInt(value, 10);
	if (n < activityPageDefaultLimit) return activityPageDefaultLimit;
	if (n > activityPageMaxLimit) return activityPageMaxLimit;
	return n;
}

export async function loadActivityPage(
	event: RequestEvent,
	limit: number
): Promise<ActivityPageViewModel> {
	limit = Math.min(Math.max(limit, activityPageDefaultLimit), activityPageMaxLimit);

	const [activities, expenses, insights, summary] = await Promise.all([
		getJSON<UserActivity[]>(event, '/v1/activities', { limit }),
		getJSON<Expense[]>(event, '/v1/expenses'),
		getJSON<DashboardInsights>(event, '/v1/dashboard/insights'),
		// Activity carries no currency: amounts use the account's base currency.
		getJSON<PortfolioSummary>(event, '/v1/portfolio/summary')
	]);

	// Go: `err != nil || resp.JSON200 == nil` → the panel's error flag.
	const activitiesError = activities.data == null;
	const recentSpendError = expenses.data == null;
	const financialHealthErr = insights.data == null;
	if (activitiesError) console.warn('activity page activities fetch failed', activities.status);
	if (recentSpendError) console.warn('activity page expenses fetch failed', expenses.status);
	if (financialHealthErr) console.warn('activity page insights fetch failed', insights.status);

	const items = activities.data ?? [];
	const fmt = {
		currency: summary.data?.baseCurrency?.trim() || null,
		locale: event.locals.locale,
		now: new Date()
	};
	return {
		activities: mapActivities(items, fmt),
		recentSpend: mapRecentSpend(expenses.data ?? [], fmt),
		currency: fmt.currency,
		financialHealth: mapFinancialHealth(insights.data?.financialHealth ?? null),
		activitiesError,
		recentSpendError,
		financialHealthErr,
		activityLimit: limit,
		hasMoreActivities: items.length >= limit && limit < activityPageMaxLimit
	};
}
