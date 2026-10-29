import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { normalizeTicker } from '#lib/features/public/articles/articles.js';
import { loadFeed, requireArticles } from '#lib/features/public/articles/articles.server.js';

// GET /articles/ticker/{symbol} → ArticlesHandler.TickerFeed
export const load: PageServerLoad = async (event) => {
	await requireArticles(event);
	const ticker = normalizeTicker(event.params.symbol);
	if (!ticker) error(404, 'Not Found');
	const vm = await loadFeed(
		event,
		{ ticker },
		{
			heading: '$' + ticker + ' articles',
			metaDescription: 'Investor articles and theses on $' + ticker + '.'
		},
		'/articles/ticker/' + ticker
	);
	return { vm };
};
