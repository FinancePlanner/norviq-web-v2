import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireSocial } from '#lib/features/social/gates.server.js';
import { redirectWith, uuidParam } from '#lib/features/settings-admin/social/social.server.js';
import {
	achievementsDo,
	isNotFound,
	socialErrorMessage
} from '#lib/features/social/friends/friends.server.js';
import type { SocialProfile } from '#lib/features/social/friends/types.js';

// Port of handlers.FriendProfile. A backend 404 (missing, or hidden from the
// viewer) is a plain not-found; any other failure goes back to /friends.
export const load: PageServerLoad = async (event) => {
	await requireSocial(event);
	const userID = uuidParam(event.params.userId);
	if (!userID) error(404, 'Not Found');
	let profile: SocialProfile;
	try {
		profile = await achievementsDo<SocialProfile>(event, 'GET', '/v1/social/users/' + userID);
	} catch (err) {
		if (isNotFound(err)) error(404, 'Not Found');
		redirectWith('/friends', '', socialErrorMessage(err, 'Could not load that profile.'));
	}
	return {
		profile,
		notice: event.url.searchParams.get('notice') ?? '',
		errorMessage: event.url.searchParams.get('error') ?? ''
	};
};
