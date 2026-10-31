import type { RequestHandler } from './$types';
import { friendRequestAction } from '#lib/features/social/friends/request-action.server.js';

// POST /friends/requests/{id}/decline (handlers.FriendRequestDecline)
export const POST: RequestHandler = (event) =>
	friendRequestAction(
		event,
		'POST',
		'/decline',
		'Request declined.',
		'Could not decline the request.'
	);
