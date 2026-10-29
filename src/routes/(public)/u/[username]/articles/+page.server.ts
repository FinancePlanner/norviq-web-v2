import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { articleUsernamePattern } from '#lib/features/public/articles/articles.js';
import { loadFeed, requireArticles } from '#lib/features/public/articles/articles.server.js';

// GET /u/{username}/articles → ArticlesHandler.AuthorFeed
export const load: PageServerLoad = async (event) => {
	await requireArticles(event);
	const username = event.params.username;
	if (!articleUsernamePattern.test(username)) error(404, 'Not Found');
	const vm = await loadFeed(
		event,
		{ author: username },
		{
			heading: 'Articles by @' + username,
			metaDescription: 'Stock articles written by @' + username + ' on Norviq.'
		},
		'/u/' + username + '/articles'
	);
	return { vm };
};
