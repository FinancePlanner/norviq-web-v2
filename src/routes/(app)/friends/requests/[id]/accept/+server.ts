import type { RequestHandler } from './$types';
import { friendRequestAction } from '#lib/features/social/friends/request-action.server.js';

// POST /friends/requests/{id}/accept (handlers.FriendRequestAccept)
export const POST: RequestHandler = (event) =>
	friendRequestAction(event, 'POST', '/accept', "You're now friends.", 'Could not accept the request.');
