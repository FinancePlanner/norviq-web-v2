import type { PageServerLoad } from './$types';
import { loadMarketsOverview } from '#lib/features/insights/markets/load.server.js';
import { loadEconomyPulse } from '#lib/features/dashboard/panels/load.server.js';

// handlers.Markets: the page shell. Go lazy-loaded /markets/overview and
// /economy/news with hx-trigger="load"; both are streamed promises here, so the
// skeletons render first exactly as before.
export const load: PageServerLoad = (event) => ({
	overview: loadMarketsOverview(event),
	// handlers.EconomyNews → LoadMarketHeadlines(…, 8)
	headlines: loadEconomyPulse(event, 8).then((r) => r.items)
});
