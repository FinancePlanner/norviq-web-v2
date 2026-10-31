import type { PageServerLoad } from './$types';
import * as timerange from '#lib/timerange.js';
import { loadCommandCenterViewModel } from '#lib/features/dashboard/command-center/load.server.js';
import { loadEconomyPulse, loadWhyMoved } from '#lib/features/dashboard/panels/load.server.js';

// GET /dashboard/pulse — AppHandler.DashboardPulse (PulsePage). Shares the
// command-center loader with /dashboard, as Go did. Why-moved and economy
// pulse were lazy shells: streamed here.
export const load: PageServerLoad = async (event) => {
	const { username, isPro } = await event.parent();
	const q = event.url.searchParams;
	const vm = await loadCommandCenterViewModel(
		event,
		username ?? '',
		timerange.parse(q.get('range')),
		q.get('domain') ?? ''
	);
	return {
		vm,
		whyMoved: loadWhyMoved(event, isPro),
		economyPulse: loadEconomyPulse(event)
	};
};
