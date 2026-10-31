import { json, type RequestHandler } from '@sveltejs/kit';
import { loadActionQueueViewModel } from '#lib/features/dashboard/command-center/load.server.js';

// GET /dashboard/action-queue — AppHandler.DashboardActionQueue: the NOW rail
// on its own, as JSON (ActionQueueVM).
export const GET: RequestHandler = async (event) =>
	json(await loadActionQueueViewModel(event), {
		headers: { 'Cache-Control': 'private, no-store' }
	});
