import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	deepDiveReports,
	loadDeepDiveReport
} from '#lib/features/insights/reports/deepdive.server.js';

// handlers.ReportsDeepDive{Calendar,Contribution,Currency,Notes,Sectors,
// Scorecard,Volatility,Winners} (requireStatistics). Go had one route per
// report; any other slug was a chi 404.
export const load: PageServerLoad = async (event) => {
	const def = Object.hasOwn(deepDiveReports, event.params.report)
		? deepDiveReports[event.params.report]
		: undefined;
	if (!def) error(404, 'Not Found');
	await requireFeature(event, Feature.Statistics, 'Statistics');
	return { vm: await loadDeepDiveReport(event, def) };
};
