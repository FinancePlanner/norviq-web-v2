import type { PageServerLoad } from './$types';
import { requireSocial } from '#lib/features/social/gates.server.js';
import { socialDo, socialErrorMessage } from '#lib/features/social/friends/friends.server.js';
import type { SocialInviteLink } from '#lib/features/social/friends/types.js';

// Port of handlers.FriendsInvite: the backend hands back the current link
// when one is live, so loading the page twice does not mint two.
export const load: PageServerLoad = async (event) => {
	await requireSocial(event);
	try {
		const link = await socialDo<SocialInviteLink>(event, 'POST', '/v1/social/invites', {});
		return { link, errorMessage: '' };
	} catch (err) {
		return { link: null, errorMessage: socialErrorMessage(err, 'Could not create your invite link.') };
	}
};
