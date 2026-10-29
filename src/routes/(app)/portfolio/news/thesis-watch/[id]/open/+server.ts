import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { isUUID } from '#lib/features/portfolio/analytics/allocation.server.js';

// GET /portfolio/news/thesis-watch/{id}/open (handlers.PortfolioThesisWatchOpen):
// mark the story read, then redirect to the validated external article URL.
export const GET: RequestHandler = async (event) => {
	const storyID = event.params.id.trim();
	if (!isUUID(storyID)) error(400, 'Invalid story ID');
	const target = (event.url.searchParams.get('url') ?? '').trim();
	let parsed: URL | null = null;
	try {
		parsed = new URL(target);
	} catch {
		parsed = null;
	}
	if (!parsed || parsed.host === '' || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) error(400, 'Invalid article URL');

	try {
		await apiJSON(event, 'POST', `/v1/news/thesis-watch/${storyID.toLowerCase()}/view`);
	} catch (err) {
		console.warn('mark thesis watch story read failed', storyID, err);
	}
	redirect(303, target, { external: true });
};
