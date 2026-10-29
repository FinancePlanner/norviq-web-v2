import type { PageServerLoad } from './$types';
import { loadFeed, requireArticles } from '#lib/features/public/articles/articles.server.js';

// GET /articles → ArticlesHandler.Feed
export const load: PageServerLoad = async (event) => {
	await requireArticles(event);
	const vm = await loadFeed(
		event,
		{},
		{
			heading: 'Stock articles',
			subheading: 'Theses and deep dives written by Norviq investors.',
			metaDescription: 'Stock theses and deep dives written by Norviq investors.'
		},
		'/articles'
	);
	return { vm };
};
