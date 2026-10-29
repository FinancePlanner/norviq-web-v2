import type { PageServerLoad } from './$types';
import { activityPageLimit, loadActivityPage } from '#lib/features/dashboard/activity/load.server.js';

// GET /dashboard/activity (handlers.DashboardActivity). `?limit=` is honoured
// on the full page as in Go (activityPageLimitFromRequest).
export const load: PageServerLoad = async (event) => {
	const limit = activityPageLimit(event.url.searchParams.get('limit'));
	return { vm: await loadActivityPage(event, limit) };
};
