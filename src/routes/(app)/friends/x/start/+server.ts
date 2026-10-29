import type { RequestHandler } from './$types';
import { requireXImport } from '#lib/features/social/gates.server.js';
import { startImport, XImport } from '#lib/features/social/friends/import.server.js';

// POST /friends/x/start (handlers.FriendsXStart)
export const POST: RequestHandler = async (event) => {
	await requireXImport(event);
	return startImport(event, XImport);
};
