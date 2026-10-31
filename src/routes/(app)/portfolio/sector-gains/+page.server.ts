import type { PageServerLoad } from './$types';
import { loadSectorGainsViewModel } from '#lib/features/portfolio/analytics/subpages.server.js';

// GET /portfolio/sector-gains (handlers.PortfolioSectorGains). Free users get
// the empty view model under the Pro overlay; Go skipped the fetch for them.
export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	const vm = isPro
		? await loadSectorGainsViewModel(event)
		: {
				subtitle: 'Unrealized P/L grouped by sector',
				totalUnrealizedPnl: '',
				totalMarketValue: '',
				rows: [],
				chart: null,
				hasData: false,
				loadError: false
			};
	return { isPro, vm };
};
