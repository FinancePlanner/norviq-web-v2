import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLeaderboards } from '#lib/features/social/gates.server.js';
import {
	isFetch,
	respondRedirect,
	socialDo,
	socialErrorMessage
} from '#lib/features/social/friends/friends.server.js';
import type { CheckInResponse } from '#lib/features/social/friends/types.js';

// POST /xp/check-in (handlers.XPCheckIn). The server decides every point and
// whether today already counted; the card only reports what it was told.
export const POST: RequestHandler = async (event) => {
	await requireLeaderboards(event);
	let result: CheckInResponse | null = null;
	let failure = '';
	try {
		result = await socialDo<CheckInResponse>(event, 'POST', '/v1/gamification/check-in', {});
	} catch (err) {
		failure = socialErrorMessage(err, 'Could not check in. Try again.');
	}
	if (isFetch(event)) return json(result ? { result } : { error: failure });
	if (!result) return respondRedirect(event, '/xp', '', failure);
	if (result.alreadyCheckedIn)
		return respondRedirect(event, '/xp', 'Already checked in today.', '');
	return respondRedirect(event, '/xp', 'Checked in.', '');
};
