import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireActivityFeed } from '#lib/features/social/gates.server.js';
import { loadFeed } from '#lib/features/social/friends/feed.server.js';

// GET /friends/feed?cursor= with Accept: application/json — Go's htmx
// load-more (FeedPartial): the next rows plus the next cursor. Browser
// navigations (Accept: text/html) get +page.svelte instead.
export const GET: RequestHandler = async (event) => {
	await requireActivityFeed(event);
	return json(await loadFeed(event, true));
};
