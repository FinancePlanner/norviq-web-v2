import type { PageServerLoad } from './$types';
import { facebookImportOn, requireSocial, xImportOn } from '#lib/features/social/gates.server.js';
import {
	searchUsers,
	socialDo,
	socialErrorMessage
} from '#lib/features/social/friends/friends.server.js';
import type {
	SearchVM,
	SocialFriendRequests,
	SocialFriendsList,
	SocialUserSummary
} from '#lib/features/social/friends/types.js';

// Port of norviq-web handlers.Friends (internal/handlers/social.go): incoming
// requests, friends, sent requests, and the add-friend search. A ?q= renders
// results server-side for a no-JS submit.
export const load: PageServerLoad = async (event) => {
	const cfg = await requireSocial(event);
	const q = event.url.searchParams;
	let errorMessage = q.get('error') ?? '';
	let requests: SocialFriendRequests = { incoming: [], outgoing: [] };
	let friends: SocialUserSummary[] = [];
	const [reqResult, listResult] = await Promise.allSettled([
		socialDo<SocialFriendRequests>(event, 'GET', '/v1/social/friend-requests'),
		socialDo<SocialFriendsList>(event, 'GET', '/v1/social/friends')
	]);
	if (reqResult.status === 'fulfilled') {
		requests = {
			incoming: reqResult.value?.incoming ?? [],
			outgoing: reqResult.value?.outgoing ?? []
		};
	} else {
		errorMessage ||= socialErrorMessage(reqResult.reason, 'Could not load friend requests.');
	}
	if (listResult.status === 'fulfilled') {
		friends = listResult.value?.friends ?? [];
	} else {
		errorMessage ||= socialErrorMessage(listResult.reason, 'Could not load your friends.');
	}
	const query = (q.get('q') ?? '').trim();
	let search: SearchVM | null = null;
	if (query) search = await searchUsers(event, query);
	return {
		notice: q.get('notice') ?? '',
		errorMessage,
		query,
		search,
		requests,
		friends,
		xImport: xImportOn(cfg),
		facebookImport: facebookImportOn(cfg)
	};
};
