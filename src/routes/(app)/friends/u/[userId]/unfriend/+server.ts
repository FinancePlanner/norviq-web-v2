import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSocial } from '#lib/features/social/gates.server.js';
import { uuidParam } from '#lib/features/settings-admin/social/social.server.js';
import {
	respondRedirect,
	socialDo,
	socialErrorMessage
} from '#lib/features/social/friends/friends.server.js';

// POST /friends/u/{userId}/unfriend (handlers.FriendRemove)
export const POST: RequestHandler = async (event) => {
	await requireSocial(event);
	const userID = uuidParam(event.params.userId);
	if (!userID) error(400, 'Invalid user');
	try {
		await socialDo(event, 'DELETE', '/v1/social/friends/' + userID);
	} catch (err) {
		return respondRedirect(
			event,
			'/friends/u/' + userID,
			'',
			socialErrorMessage(err, 'Could not remove this friend.')
		);
	}
	return respondRedirect(event, '/friends', 'Friend removed.', '');
};
