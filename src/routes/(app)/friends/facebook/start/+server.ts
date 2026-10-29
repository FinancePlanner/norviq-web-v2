import type { RequestHandler } from './$types';
import { requireFacebookImport } from '#lib/features/social/gates.server.js';
import { FacebookImport, startImport } from '#lib/features/social/friends/import.server.js';

// POST /friends/facebook/start (handlers.FriendsFacebookStart)
export const POST: RequestHandler = async (event) => {
	await requireFacebookImport(event);
	return startImport(event, FacebookImport);
};
