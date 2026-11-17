import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSocial } from '#lib/features/social/gates.server.js';
import { uuidParam } from '#lib/features/settings-admin/social/social.server.js';
import {
	isFetch,
	respondRedirect,
	socialDo,
	socialErrorMessage
} from '#lib/features/social/friends/friends.server.js';
import { Friendship } from '#lib/features/social/friends/types.js';
import { formValue } from '#lib/form-value.js';

// POST /friends/requests (handlers.FriendRequestSend): adds a friend, or
// accepts when they already asked. From FriendButton (Go: htmx) it answers
// with the button's new state; from a plain form it redirects to /friends.
export const POST: RequestHandler = async (event) => {
	await requireSocial(event);
	const form = await event.request.formData();
	const userID = uuidParam(formValue(form, 'userId'));
	if (!userID) error(400, 'Invalid user');
	const previous = formValue(form, 'status');
	let failure = '';
	try {
		await socialDo(event, 'POST', '/v1/social/friend-requests', { userId: userID });
	} catch (err) {
		failure = socialErrorMessage(err, 'Could not send the request.');
	}
	if (isFetch(event)) {
		if (failure) return Response.json({ error: failure });
		return Response.json({
			status:
				previous === Friendship.IncomingPending ? Friendship.Friends : Friendship.OutgoingPending
		});
	}
	if (failure) return respondRedirect(event, '/friends', '', failure);
	if (previous === Friendship.IncomingPending)
		return respondRedirect(event, '/friends', "You're now friends.", '');
	return respondRedirect(event, '/friends', 'Friend request sent.', '');
};
