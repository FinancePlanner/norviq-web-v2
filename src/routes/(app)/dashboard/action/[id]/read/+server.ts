import { error, json, type RequestHandler } from '@sveltejs/kit';
import { loadActionQueueViewModel, markActionRead } from '#lib/features/dashboard/command-center/load.server.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /dashboard/action/{id}/read — AppHandler.DashboardActionRead: mark one
// queue item read and answer with the refreshed queue (JSON ActionQueueVM).
// A failed mark still re-renders the queue, as in Go.
export const POST: RequestHandler = async (event) => {
	const id = event.params.id ?? '';
	if (!UUID.test(id)) error(404, 'Not found');
	await markActionRead(event, id);
	return json(await loadActionQueueViewModel(event), { headers: { 'Cache-Control': 'private, no-store' } });
};
