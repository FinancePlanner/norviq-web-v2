// GET /dashboard/insights (handlers.DashboardInsights →
// LoadInsightsPageViewModel) and LoadFocusPoints, the reload every focus-point
// action ends with.

import type { RequestEvent } from '@sveltejs/kit';
import { getJSON } from '../fetch.server.js';
import type { FocusPointVM, InsightsPageViewModel } from '../types.js';
import { mapFinancialHealth, mapFocusPoints, mapInsightCards, type DashboardInsights, type Goal } from './mappers.js';

export async function loadInsightsPage(event: RequestEvent): Promise<Omit<InsightsPageViewModel, 'isPro'>> {
	const [insights, goals] = await Promise.all([
		getJSON<DashboardInsights>(event, '/v1/dashboard/insights'),
		getJSON<Goal[]>(event, '/v1/goals')
	]);

	const insightsError = insights.data == null;
	const goalsError = goals.data == null;
	if (insightsError) console.warn('insights page fetch failed', insights.status);
	if (goalsError) console.warn('insights goals fetch failed', goals.status);

	return {
		financialHealth: mapFinancialHealth(insights.data?.financialHealth ?? null),
		insightCards: insights.data ? mapInsightCards(insights.data) : [],
		focusPoints: mapFocusPoints(goals.data ?? []),
		insightsError,
		goalsError
	};
}

/** LoadFocusPoints: any failure is just "no points". */
export async function loadFocusPoints(event: RequestEvent): Promise<FocusPointVM[]> {
	const goals = await getJSON<Goal[]>(event, '/v1/goals');
	return mapFocusPoints(goals.data ?? []);
}
