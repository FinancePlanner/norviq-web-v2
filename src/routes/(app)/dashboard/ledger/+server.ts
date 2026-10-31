import { json, type RequestHandler } from '@sveltejs/kit';
import * as timerange from '#lib/timerange.js';
import { loadLedgerViewModel } from '#lib/features/dashboard/command-center/load.server.js';

// GET /dashboard/ledger — AppHandler.DashboardLedger. JSON (LedgerVM) for the
// LedgerPanel chips instead of the LedgerBody fragment.
export const GET: RequestHandler = async (event) => {
	const q = event.url.searchParams;
	const vm = await loadLedgerViewModel(
		event,
		timerange.parse(q.get('range')),
		q.get('domain') ?? ''
	);
	return json(vm, { headers: { 'Cache-Control': 'private, no-store' } });
};
