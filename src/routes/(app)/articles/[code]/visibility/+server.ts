import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { parseSlugCode } from '#lib/features/public/articles/articles.js';
import { afterActionLocation, requireArticles, setArticleVisibility } from '#lib/features/public/articles/articles.server.js';

// POST /articles/{code}/visibility → ArticlesHandler.Visibility (moderators).
// A non-admin's 403 gets the failure notice, never a success one.
export const POST: RequestHandler = async (event) => {
	await requireArticles(event);
	const code = parseSlugCode(event.params.code ?? '');
	if (!code) error(404, 'Not Found');
	let hidden = false;
	try {
		hidden = (await event.request.formData()).get('hidden') === 'true';
	} catch {
		/* not hidden */
	}
	let notice = hidden ? 'hidden' : 'unhidden';
	try {
		await setArticleVisibility(event, code, hidden);
	} catch (err) {
		console.warn('article visibility change failed', code, err);
		notice = 'action_fail';
	}
	redirect(303, await afterActionLocation(event, code, notice));
};
