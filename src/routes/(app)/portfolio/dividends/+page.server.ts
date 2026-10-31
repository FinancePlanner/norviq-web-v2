import type { PageServerLoad } from './$types';
import {
	emptyDividendsViewModel,
	loadDividendsViewModel
} from '#lib/features/portfolio/analytics/subpages.server.js';

// GET /portfolio/dividends (handlers.PortfolioDividends).
export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	return { isPro, vm: isPro ? await loadDividendsViewModel(event) : emptyDividendsViewModel() };
};
