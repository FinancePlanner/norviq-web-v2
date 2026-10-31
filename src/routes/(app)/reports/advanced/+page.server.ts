import type { Actions, PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import {
	createRun,
	createSchedule,
	createTemplate,
	loadAdvancedReports
} from '#lib/features/insights/reports/advanced.server.js';

// server.go wraps every /reports/advanced route in requireAdvancedReports
// (RequireFeature advanced_report_runs, "Advanced reports").
const gate = (event: Parameters<PageServerLoad>[0] | Parameters<Actions[string]>[0]) =>
	requireFeature(event, Feature.AdvancedReportRuns, 'Advanced reports');

export const load: PageServerLoad = async (event) => {
	await gate(event);
	const { isPro } = await event.parent();
	return { vm: await loadAdvancedReports(event, isPro) };
};

// Go posted to /reports/advanced/{templates,runs,schedules}; each redirects
// back here with ?notice / ?error exactly as before.
export const actions: Actions = {
	templates: async (event) => {
		await gate(event);
		await createTemplate(event);
	},
	runs: async (event) => {
		await gate(event);
		await createRun(event);
	},
	schedules: async (event) => {
		await gate(event);
		await createSchedule(event);
	}
};
