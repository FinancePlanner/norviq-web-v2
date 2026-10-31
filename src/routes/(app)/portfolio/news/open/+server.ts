import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { isUUID } from '#lib/features/portfolio/analytics/allocation.server.js';

// GET /portfolio/news/open (handlers.PortfolioNewsOpen): record the view, then
// redirect to the validated external article URL. A failed record is logged
// and the redirect still happens.
export const GET: RequestHandler = async (event) => {
	const q = event.url.searchParams;
	const target = (q.get('url') ?? '').trim();
	let parsed: URL | null = null;
	try {
		parsed = new URL(target);
	} catch {
		parsed = null;
	}
	if (
		!parsed ||
		parsed.host === '' ||
		(parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
	)
		error(400, 'Invalid article URL');

	const body: components['schemas']['NewsViewRequest'] = {
		headline: (q.get('headline') ?? '').trim() || 'Untitled article',
		url: target
	};
	const symbol = (q.get('symbol') ?? '').trim().toUpperCase();
	if (symbol !== '') body.symbol = symbol;
	const id = (q.get('id') ?? '').trim();
	if (id !== '' && isUUID(id)) body.newsId = id.toLowerCase();
	try {
		await apiJSON(event, 'POST', '/v1/news/view', body);
	} catch (err) {
		console.warn('record news view failed', err);
	}
	redirect(303, target, { external: true });
};
