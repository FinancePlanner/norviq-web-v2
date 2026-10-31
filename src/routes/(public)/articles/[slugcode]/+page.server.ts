import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { articlePath, parseSlugCode } from '#lib/features/public/articles/articles.js';
import {
	ARTICLE_PAGE_CACHE_CONTROL,
	ARTICLE_SLUG_REDIRECT_CACHE_CONTROL,
	SIGNED_IN_CACHE_CONTROL,
	credentialRejected,
	detailFailed,
	detailVM,
	getArticle,
	noticeFrom,
	pageCacheControl,
	redirectToArticle,
	requireArticles,
	signedIn,
	viewerIsAdmin
} from '#lib/features/public/articles/articles.server.js';
import type { ArticleDetail } from '#lib/features/public/articles/types.js';

// GET /articles/{slugcode} → ArticlesHandler.Detail. Go renders both the
// anonymous and the signed-in page in templates.PublicLayout (no app shell),
// so both live here in (public). A signed-in reader gets a personal,
// uncached page; an expired or revoked session falls through to the
// anonymous one instead of failing. A stale or made-up slug is redirected to
// the canonical path.
export const load: PageServerLoad = async (event) => {
	await requireArticles(event);
	const segment = event.params.slugcode;
	const code = parseSlugCode(segment);
	if (!code) error(404, 'Not Found');

	if (signedIn(event)) {
		let detail: ArticleDetail | null = null;
		let failure: unknown = null;
		try {
			detail = await getArticle(event, code, 'session');
		} catch (err) {
			failure = err;
		}
		if (!credentialRejected(failure)) {
			if (!detail) detailFailed(event.url.pathname, failure);
			const canonical = articlePath(detail.article.slug, detail.article.code);
			if ('/articles/' + segment !== canonical)
				redirectToArticle(event, canonical, ARTICLE_SLUG_REDIRECT_CACHE_CONTROL);
			const [vm, isAdmin] = await Promise.all([
				detailVM(event, detail, true),
				viewerIsAdmin(event)
			]);
			vm.isAdmin = isAdmin;
			vm.notice = noticeFrom(event);
			event.setHeaders({ 'cache-control': SIGNED_IN_CACHE_CONTROL });
			return { vm };
		}
		console.info('article reader credential rejected; serving the anonymous page', code, failure);
	}

	let detail: ArticleDetail;
	try {
		detail = await getArticle(event, code, 'public');
	} catch (err) {
		detailFailed(event.url.pathname, err);
	}
	const canonical = articlePath(detail.article.slug, detail.article.code);
	if ('/articles/' + segment !== canonical)
		redirectToArticle(event, canonical, ARTICLE_SLUG_REDIRECT_CACHE_CONTROL);
	const vm = await detailVM(event, detail, false);
	event.setHeaders({ 'cache-control': pageCacheControl(event, ARTICLE_PAGE_CACHE_CONTROL) });
	return { vm };
};
