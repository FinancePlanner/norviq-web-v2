import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isValidReportTab } from '#lib/nav.js';
import { loadReportsPage } from '#lib/features/insights/reports/page.server.js';

// handlers.Reports for /reports/{tab}.
export const load: PageServerLoad = async (event) => {
	if (!isValidReportTab(event.params.tab)) error(404, 'Not Found');
	const { isPro } = await event.parent();
	return loadReportsPage(event, event.params.tab, isPro);
};
