import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSocial } from '#lib/features/social/gates.server.js';
import {
	respondRedirect,
	socialDo,
	socialErrorMessage
} from '#lib/features/social/friends/friends.server.js';
import { userTitle, type SocialInviteRedeem } from '#lib/features/social/friends/types.js';

// handlers/public_invite.go inviteCodePattern
const INVITE_CODE = /^[A-Za-z0-9_-]{4,64}$/;

// POST /friends/invite/{code}/accept (handlers.FriendsInviteAccept): redeems
// an invite from the signed-in /i/{code} page.
export const POST: RequestHandler = async (event) => {
	await requireSocial(event);
	const code = event.params.code;
	if (!INVITE_CODE.test(code)) error(404, 'Not Found');
	let result: SocialInviteRedeem;
	try {
		result = await socialDo<SocialInviteRedeem>(
			event,
			'POST',
			'/v1/social/invites/' + encodeURIComponent(code) + '/redeem',
			{}
		);
	} catch (err) {
		return respondRedirect(
			event,
			'/friends',
			'',
			socialErrorMessage(err, 'Could not accept the invite.')
		);
	}
	return respondRedirect(
		event,
		'/friends',
		'You and ' + userTitle(result.inviter) + ' are now friends.',
		''
	);
};
