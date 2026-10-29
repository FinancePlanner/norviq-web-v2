import type { PageServerLoad } from './$types';
import { loadMarketsEarnings } from '#lib/features/insights/markets/load.server.js';

// handlers.MarketsEarnings: ungated on purpose (the market-wide calendar, not
// the Pro /portfolio/earnings visualizer).
export const load: PageServerLoad = async (event) => ({ vm: await loadMarketsEarnings(event) });
