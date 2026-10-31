import type { Actions, PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { loadAIInsights } from '#lib/features/dashboard/insights/ai.server.js';
import {
	createGoal,
	deleteGoal,
	toggleGoal,
	updateGoal
} from '#lib/features/dashboard/insights/goals.server.js';
import { loadInsightsPage } from '#lib/features/dashboard/insights/load.server.js';

// GET /dashboard/insights (handlers.DashboardInsights).
//
// The Go fragment routes it pulled in are folded into this page:
//   GET    /dashboard/insights/ai               → streamed `ai` promise
//   GET    /dashboard/insights/focus-points     → FocusPointsSection (data from the actions)
//   GET    /dashboard/insights/goals/{id}/edit  → FocusPointsSection edit state
//   POST   /dashboard/insights/goals            → ?/create
//   POST   /dashboard/insights/goals/{id}/toggle→ ?/toggle
//   PATCH  /dashboard/insights/goals/{id}       → ?/update
//   DELETE /dashboard/insights/goals/{id}       → ?/delete
export const load: PageServerLoad = async (event) => {
	const pagePromise = loadInsightsPage(event);
	const { isPro, billingUnknown, features } = await event.parent();

	// DashboardAIInsightsPartial: isPro, unless the billing context is known,
	// in which case the ai_insights feature decides (RequireFeature too). When
	// it is unavailable Go answered 402 and htmx left "Loading insights…" in
	// place; the page does the same by never starting the fetch.
	const aiAvailable = billingUnknown ? isPro : !!features[Feature.AIInsights];
	const ai = isPro && aiAvailable ? loadAIInsights(event) : null;

	return { vm: { ...(await pagePromise), isPro }, ai };
};

export const actions: Actions = {
	create: async (event) => createGoal(event, await event.request.formData()),
	toggle: async (event) => toggleGoal(event, await event.request.formData()),
	update: async (event) => updateGoal(event, await event.request.formData()),
	delete: async (event) => deleteGoal(event, await event.request.formData())
};
