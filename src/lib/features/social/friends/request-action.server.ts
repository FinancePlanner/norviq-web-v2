import { error, type RequestEvent } from '@sveltejs/kit';
import { requireSocial } from '#lib/features/social/gates.server.js';
import { uuidParam } from '#lib/features/settings-admin/social/social.server.js';
import { respondRedirect, socialDo, socialErrorMessage } from './friends.server.js';

/** friendRequestAction: accept / decline / cancel one request, then back to /friends. */
export async function friendRequestAction(
	event: RequestEvent,
	method: string,
	suffix: string,
	notice: string,
	failure: string
): Promise<Response> {
	await requireSocial(event);
	const id = uuidParam(event.params.id);
	if (!id) error(400, 'Invalid request');
	try {
		await socialDo(event, method, '/v1/social/friend-requests/' + id + suffix);
	} catch (err) {
		return respondRedirect(event, '/friends', '', socialErrorMessage(err, failure));
	}
	return respondRedirect(event, '/friends', notice, '');
}
