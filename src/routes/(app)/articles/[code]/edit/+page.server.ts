import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { APIError } from '#lib/server/api.js';
import { articlePath, parseSlugCode } from '#lib/features/public/articles/articles.js';
import {
	ARTICLE_FORM_MAX_BYTES,
	SIGNED_IN_CACHE_CONTROL,
	articleWriteRequest,
	boardsErrorText,
	composeVM,
	emptyForm,
	enforceBodyLimit,
	getArticle,
	readComposeForm,
	requireArticles,
	updateArticle,
	withPreview
} from '#lib/features/public/articles/articles.server.js';
import type { ArticleDetail } from '#lib/features/public/articles/types.js';

// GET/POST /articles/{code}/edit → ArticlesHandler.EditForm / Update. Only
// the author sees the form; anyone else gets a 404.
const editVM = (code: string) => composeVM('Edit article', '/articles/' + code + '/edit', 'Save');

export const load: PageServerLoad = async (event) => {
	await requireArticles(event);
	const code = parseSlugCode(event.params.code);
	if (!code) error(404, 'Not Found');
	let detail: ArticleDetail;
	try {
		detail = await getArticle(event, code, 'session');
	} catch (err) {
		if (err instanceof APIError && err.status === 404) error(404, 'Not Found');
		console.error('load article for edit', code, err);
		error(502, 'Articles are temporarily unavailable');
	}
	if (!detail.viewerIsAuthor) error(404, 'Not Found');
	const a = detail.article;
	const form = emptyForm();
	form.title = a.title;
	form.tickers = (a.tickers ?? []).join(', ');
	form.body = detail.bodyMarkdown;
	form.disclosure = detail.disclosure;
	(a.bulletPoints ?? []).slice(0, 3).forEach((b, i) => (form.bullets[i] = b));
	form.coverImageID = a.coverImageId ?? '';
	event.setHeaders({ 'cache-control': SIGNED_IN_CACHE_CONTROL });
	return {
		vm: withPreview(composeVM('Edit article', '/articles/' + code + '/edit', 'Save', form))
	};
};

export const actions: Actions = {
	default: async (event) => {
		enforceBodyLimit(event, ARTICLE_FORM_MAX_BYTES);
		await requireArticles(event);
		const code = parseSlugCode(event.params.code);
		if (!code) error(404, 'Not Found');
		const vm = editVM(code);
		const { form, err } = await readComposeForm(event);
		vm.form = form;
		if (!err) {
			let to = '';
			try {
				const detail = await updateArticle(event, code, articleWriteRequest(form));
				to = articlePath(detail.article.slug, detail.article.code) + '?notice=updated';
			} catch (e) {
				vm.error = boardsErrorText(e);
				return fail(422, { vm: withPreview(vm) });
			}
			redirect(303, to);
		}
		vm.error = boardsErrorText(err);
		return fail(422, { vm: withPreview(vm) });
	}
};
