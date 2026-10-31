import type { PageServerLoad } from './$types';
import { requireXImport } from '#lib/features/social/gates.server.js';
import { popImportFlow, XImport } from '#lib/features/social/friends/import.server.js';
import { socialDo, socialErrorMessage } from '#lib/features/social/friends/friends.server.js';
import type { SocialXImportMatches } from '#lib/features/social/friends/types.js';

// Port of handlers.FriendsXCallback: exchanges X's code for the followed
// accounts that are on Norviq. The flow id is popped first.
export const load: PageServerLoad = async (event) => {
	await requireXImport(event);
	const { flowID, redirectURI } = await popImportFlow(event, XImport);
	const q = event.url.searchParams;
	const code = q.get('code') ?? '';
	const state = q.get('state') ?? '';
	if (q.get('error')) return { matches: null, errorMessage: 'X import was canceled.' };
	if (!flowID || !code || !state)
		return { matches: null, errorMessage: 'That X sign-in has expired. Start again from Friends.' };
	try {
		const matches = await socialDo<SocialXImportMatches>(
			event,
			'POST',
			'/v1/social/discovery/x/exchange',
			{
				flowId: flowID,
				code,
				state,
				redirectURI
			}
		);
		return {
			matches: {
				matches: matches?.matches ?? [],
				totalFollowingScanned: matches?.totalFollowingScanned ?? 0
			},
			errorMessage: ''
		};
	} catch (err) {
		return {
			matches: null,
			errorMessage: socialErrorMessage(err, 'Could not read who you follow on X.')
		};
	}
};
