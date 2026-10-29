import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { config, publicPagesEnabled } from '#lib/server/env.js';
import { loadArticlesEnabled } from '#lib/server/app-context.js';
import { sitemapXML } from '#lib/features/public/seo/seo.server.js';
import { briefSitemapPaths } from '#lib/features/public/brief/brief.server.js';

// GET /sitemap.xml — Go sitemapHandler with sitemapPaths(articles, market brief).

interface ArticlePage {
	items?: { slug: string; code: string }[] | null;
	nextCursor?: string | null;
}

// ArticlesHandler.SitemapPaths: up to 500 recent article paths, none when
// articles are off or the backend can't answer (paths so far are kept).
async function articleSitemapPaths(event: RequestEvent): Promise<string[]> {
	if (!publicPagesEnabled(config()) || !(await loadArticlesEnabled(event))) return [];
	const paths: string[] = [];
	let cursor = '';
	for (let i = 0; i < 5; i++) {
		let page: ArticlePage;
		try {
			page = await apiJSON<ArticlePage>(event, 'GET', '/v1/articles', undefined, {
				auth: 'public',
				query: { cursor: cursor || undefined, limit: 100 }
			});
		} catch {
			return paths;
		}
		for (const s of page.items ?? []) paths.push('/articles/' + s.slug + '-' + s.code);
		if (!page.nextCursor) break;
		cursor = page.nextCursor;
	}
	return paths;
}

export const GET: RequestHandler = async (event) => {
	const extra = [...(await articleSitemapPaths(event)), ...(await briefSitemapPaths(event))];
	return sitemapXML(event, extra);
};
