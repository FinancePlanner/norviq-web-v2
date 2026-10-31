import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { parseSlugCode } from '#lib/features/public/articles/articles.js';
import {
	afterActionLocation,
	deleteArticle,
	requireArticles
} from '#lib/features/public/articles/articles.server.js';

// POST /articles/{code}/delete → ArticlesHandler.Delete
export const POST: RequestHandler = async (event) => {
	await requireArticles(event);
	const code = parseSlugCode(event.params.code ?? '');
	if (!code) error(404, 'Not Found');
	try {
		await deleteArticle(event, code);
	} catch (err) {
		console.warn('article delete failed', code, err);
		redirect(303, await afterActionLocation(event, code, 'action_fail'));
	}
	redirect(303, '/articles?notice=deleted');
};
