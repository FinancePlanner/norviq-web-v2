import type { PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';

// handlers.ReportsDeepDiveIndex (requireStatistics).
export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.Statistics, 'Statistics');
	return {};
};
