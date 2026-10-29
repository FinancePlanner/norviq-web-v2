import type { RequestHandler } from './$types';
import { friendRequestAction } from '#lib/features/social/friends/request-action.server.js';

// POST /friends/requests/{id}/cancel (handlers.FriendRequestCancel): DELETE upstream.
export const POST: RequestHandler = (event) =>
	friendRequestAction(event, 'DELETE', '', 'Request canceled.', 'Could not cancel the request.');
