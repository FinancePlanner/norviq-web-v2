import type { PageServerLoad } from './$types';
import { emptyEarningsViewModel, loadEarningsViewModel } from '#lib/features/portfolio/analytics/subpages.server.js';

// GET /portfolio/earnings (handlers.PortfolioEarnings). Go rendered a zero
// view model (no month label, no calendar) for free users.
export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	const q = event.url.searchParams;
	const vm = isPro ? await loadEarningsViewModel(event, q.get('symbol') ?? '', q.get('filing') ?? '') : { ...emptyEarningsViewModel(), monthLabel: '' };
	return { isPro, vm };
};
