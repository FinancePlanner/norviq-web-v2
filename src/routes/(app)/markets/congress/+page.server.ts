import type { PageServerLoad } from './$types';
import { loadMarketsCongress } from '#lib/features/insights/markets/load.server.js';
import { pilotsEnabled } from '#lib/features/settings-admin/pilots/gate.server.js';

// handlers.MarketsCongress: ungated public-record feed; links to /pilots only
// while the backend has pilots on (pilotgate.Enabled).
export const load: PageServerLoad = async (event) => {
	const [feed, pilots] = await Promise.all([loadMarketsCongress(event), pilotsEnabled(event)]);
	return { vm: { ...feed, pilotsEnabled: pilots } };
};
