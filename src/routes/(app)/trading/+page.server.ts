import type { PageServerLoad } from './$types';
import { loadTradingDashboard } from '#lib/features/planning-tools/trading/trading.server.js';

// GET /trading (handlers.TradingDashboard). No route-level gate in Go.
export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	return { vm: await loadTradingDashboard(event, isPro) };
};
