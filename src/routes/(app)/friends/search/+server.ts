import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSocial } from '#lib/features/social/gates.server.js';
import { isFetch, searchUsers } from '#lib/features/social/friends/friends.server.js';

// GET /friends/search (handlers.FriendsSearch): the debounced partial, as
// JSON for the /friends page's search box. A plain request goes to /friends?q=.
export const GET: RequestHandler = async (event) => {
	await requireSocial(event);
	const query = (event.url.searchParams.get('q') ?? '').trim();
	if (!isFetch(event)) redirect(303, '/friends?' + new URLSearchParams({ q: query }));
	return json(await searchUsers(event, query));
};
