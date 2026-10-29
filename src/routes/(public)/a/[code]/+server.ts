import { error, type RequestHandler } from '@sveltejs/kit';
import { articlePath, parseSlugCode } from '#lib/features/public/articles/articles.js';
import {
	ARTICLE_SHORT_LINK_CACHE_CONTROL,
	detailFailed,
	getArticle,
	requireArticles
} from '#lib/features/public/articles/articles.server.js';

// GET /a/{code} → ArticlesHandler.ShortLink: a 301 to the canonical article
// path (query kept), looked up with the public token.
export const GET: RequestHandler = async (event) => {
	await requireArticles(event);
	const code = parseSlugCode(event.params.code ?? '');
	if (!code) error(404, 'Not Found');
	let to: string;
	try {
		const detail = await getArticle(event, code, 'public');
		to = articlePath(detail.article.slug, detail.article.code);
	} catch (err) {
		detailFailed(event.url.pathname, err);
	}
	if (event.url.search.length > 1) to += event.url.search;
	return new Response(null, {
		status: 301,
		headers: { Location: to, 'Cache-Control': ARTICLE_SHORT_LINK_CACHE_CONTROL }
	});
};
