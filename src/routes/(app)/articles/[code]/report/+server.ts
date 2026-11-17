import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { parseSlugCode } from '#lib/features/public/articles/articles.js';
import {
	afterActionLocation,
	reportArticle,
	requireArticles
} from '#lib/features/public/articles/articles.server.js';
import { formValue } from '#lib/form-value.js';

// POST /articles/{code}/report → ArticlesHandler.Report
export const POST: RequestHandler = async (event) => {
	await requireArticles(event);
	const code = parseSlugCode(event.params.code ?? '');
	if (!code) error(404, 'Not Found');
	let reason = '';
	let note = '';
	try {
		const form = await event.request.formData();
		reason = formValue(form, 'reason');
		note = formValue(form, 'note').trim();
	} catch {
		/* the backend refuses an empty reason */
	}
	let notice = 'reported';
	try {
		await reportArticle(event, code, reason, note);
	} catch (err) {
		console.warn('article report failed', code, err);
		notice = 'report_fail';
	}
	redirect(303, await afterActionLocation(event, code, notice));
};
