import type { PageServerLoad } from './$types';
import * as timerange from '#lib/timerange.js';
import { loadCommandCenterViewModel } from '#lib/features/dashboard/command-center/load.server.js';
import { loadGuidedCard } from '#lib/features/auth-onboarding/guided-start/guided.server.js';
import {
	loadMCPStatus,
	loadTaxPanel,
	loadTerminalSummary
} from '#lib/features/dashboard/panels/load.server.js';

// GET /dashboard — AppHandler.Dashboard (CommandCenterPage). The lazy panels
// (Go: hx-trigger="load" shells for MCP status, terminal sizing and tax) are
// streamed promises, so they never block the first paint.
export const load: PageServerLoad = async (event) => {
	const { username, isPro } = await event.parent();
	const q = event.url.searchParams;
	const [vm, guidedStart] = await Promise.all([
		loadCommandCenterViewModel(
			event,
			username ?? '',
			timerange.parse(q.get('range')),
			q.get('domain') ?? ''
		),
		loadGuidedCard(event)
	]);
	return {
		vm,
		guidedStart,
		mcpStatus: loadMCPStatus(event, isPro),
		terminalSummary: loadTerminalSummary(event),
		taxPanel: loadTaxPanel(event)
	};
};
