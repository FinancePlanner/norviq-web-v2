import type { RequestHandler } from '@sveltejs/kit';
import { render } from '#lib/markdown.js';
import {
	ARTICLE_PREVIEW_BODY_LIMIT,
	ARTICLE_PREVIEW_MAX_RUNES,
	enforceBodyLimit,
	requireArticles
} from '#lib/features/public/articles/articles.server.js';

// POST /articles/preview → ArticlesHandler.Preview: the composer's live
// Markdown preview, as sanitised HTML. The body is cut at the field's
// maxlength, counted in characters.
export const POST: RequestHandler = async (event) => {
	enforceBodyLimit(event, ARTICLE_PREVIEW_BODY_LIMIT);
	await requireArticles(event);
	let body = '';
	try {
		const v = (await event.request.formData()).get('body');
		if (typeof v === 'string') body = v;
	} catch {
		/* empty preview */
	}
	const runes = Array.from(body);
	if (runes.length > ARTICLE_PREVIEW_MAX_RUNES) body = runes.slice(0, ARTICLE_PREVIEW_MAX_RUNES).join('');
	return new Response(render(body), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
