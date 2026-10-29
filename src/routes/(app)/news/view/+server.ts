import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { parseUUID } from '#lib/features/dashboard/goals/form.server.js';
import { externalNewsRedirectURL } from '#lib/features/dashboard/news-view.js';
import type { components } from '#lib/api/schema.js';

type NewsViewRequest = components['schemas']['NewsViewRequest'];

// GET /news/view → NewsArticleView (norviq-web internal/handlers/news_view.go).
// Records the view when a headline is given, then 302s to the canonicalised
// external article. A bad or non-http(s) url goes to /portfolio/news instead.
// An endpoint, not a page: there is nothing to render, and the client router
// falls back to a full navigation for it.
export const GET: RequestHandler = async (event) => {
	const q = event.url.searchParams;
	const destination = externalNewsRedirectURL((q.get('url') ?? '').trim());
	if (destination === null) redirect(303, '/portfolio/news');

	const headline = (q.get('headline') ?? '').trim();
	if (headline !== '') {
		const body: NewsViewRequest = { headline, url: destination };
		const id = parseUUID((q.get('id') ?? '').trim());
		if (id) body.newsId = id;
		const symbol = (q.get('symbol') ?? '').trim();
		if (symbol !== '') body.symbol = symbol.toUpperCase();
		try {
			await apiJSON(event, 'POST', '/v1/news/view', body);
		} catch (err) {
			console.warn('record news view failed', { error: String(err) });
		}
	}

	redirect(302, destination, { external: true });
};
