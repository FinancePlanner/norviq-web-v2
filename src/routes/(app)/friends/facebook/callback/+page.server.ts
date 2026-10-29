import type { PageServerLoad } from './$types';
import { requireFacebookImport } from '#lib/features/social/gates.server.js';
import { FacebookImport, popImportFlow } from '#lib/features/social/friends/import.server.js';
import { socialDo, socialErrorMessage } from '#lib/features/social/friends/friends.server.js';
import type { SocialFacebookImportMatches } from '#lib/features/social/friends/types.js';

// Port of handlers.FriendsFacebookCallback. Facebook reports a cancel as
// error=access_denied (error_reason=user_denied), which never reaches the backend.
export const load: PageServerLoad = async (event) => {
	await requireFacebookImport(event);
	const { flowID, redirectURI } = await popImportFlow(event, FacebookImport);
	const q = event.url.searchParams;
	const err = q.get('error') ?? '';
	const reason = q.get('error_reason') ?? '';
	const code = q.get('code') ?? '';
	const state = q.get('state') ?? '';
	if (err === 'access_denied' || reason === 'user_denied') {
		return { matches: null, errorMessage: 'Facebook connection was canceled. Nothing was shared.' };
	}
	if (err || reason) return { matches: null, errorMessage: 'Facebook did not finish connecting. Start again from Friends.' };
	if (!flowID || !code || !state) return { matches: null, errorMessage: 'That Facebook sign-in has expired. Start again from Friends.' };
	try {
		const m = await socialDo<SocialFacebookImportMatches>(event, 'POST', '/v1/social/discovery/facebook/exchange', {
			flowId: flowID,
			code,
			state,
			redirectURI
		});
		return { matches: { matches: m?.matches ?? [], friendsGranted: m?.friendsGranted ?? 0 }, errorMessage: '' };
	} catch (e) {
		return { matches: null, errorMessage: socialErrorMessage(e, 'Could not read your Facebook friends.') };
	}
};
