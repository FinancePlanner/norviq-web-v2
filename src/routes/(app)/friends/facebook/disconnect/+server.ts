import type { RequestHandler } from './$types';
import { requireFacebookImport } from '#lib/features/social/gates.server.js';
import { respondRedirect, socialDo, socialErrorMessage } from '#lib/features/social/friends/friends.server.js';

// POST /friends/facebook/disconnect (handlers.FriendsFacebookDisconnect):
// forgets the linked Facebook account. The results page and friends privacy
// both post here; return=settings goes back to the latter.
export const POST: RequestHandler = async (event) => {
	await requireFacebookImport(event);
	const form = await event.request.formData();
	const back = String(form.get('return') ?? '') === 'settings' ? '/settings/friends-privacy' : '/friends';
	try {
		await socialDo(event, 'DELETE', '/v1/social/discovery/facebook');
	} catch (err) {
		return respondRedirect(event, back, '', socialErrorMessage(err, 'Could not disconnect Facebook.'));
	}
	return respondRedirect(event, back, 'Facebook disconnected.', '');
};
