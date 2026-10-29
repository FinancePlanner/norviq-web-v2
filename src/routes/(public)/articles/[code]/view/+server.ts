import { error, type RequestHandler } from '@sveltejs/kit';
import { APIError } from '#lib/server/api.js';
import { parseSlugCode } from '#lib/features/public/articles/articles.js';
import {
	ARTICLE_VIEW_BODY_LIMIT,
	enforceBodyLimit,
	recordArticleView,
	requireArticles,
	visitorKey
} from '#lib/features/public/articles/articles.server.js';

// POST /articles/{code}/view → ArticlesHandler.View: the read beacon. Anonymous
// pages are CDN-cached, so the browser counts the read; the visitor key is a
// daily-salted hash, never the raw IP.
export const POST: RequestHandler = async (event) => {
	enforceBodyLimit(event, ARTICLE_VIEW_BODY_LIMIT);
	await requireArticles(event);
	const code = parseSlugCode(event.params.code ?? '');
	if (!code) error(404, 'Not Found');
	try {
		await recordArticleView(event, code, await visitorKey(event));
		return new Response(null, { status: 204 });
	} catch (err) {
		if (err instanceof APIError && err.status === 404) error(404, 'Not Found');
		console.debug('record article view failed', code, err);
		error(502, 'Articles are temporarily unavailable');
	}
};
