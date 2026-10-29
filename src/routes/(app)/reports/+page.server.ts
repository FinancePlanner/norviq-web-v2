import type { PageServerLoad } from './$types';
import { loadReportsPage } from '#lib/features/insights/reports/page.server.js';

// handlers.Reports with tab "" (Overview).
export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	return loadReportsPage(event, '', isPro);
};
