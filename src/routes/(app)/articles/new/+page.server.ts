import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { articlePath } from '#lib/features/public/articles/articles.js';
import {
	ARTICLE_FORM_MAX_BYTES,
	SIGNED_IN_CACHE_CONTROL,
	articleWriteRequest,
	boardsErrorText,
	composeGate,
	composeVM,
	createArticle,
	enforceBodyLimit,
	idempotencyKeyPattern,
	newIdempotencyKey,
	readComposeForm,
	requireArticles,
	withPreview
} from '#lib/features/public/articles/articles.server.js';

// GET/POST /articles/new → ArticlesHandler.NewForm / Create. Rendered in the
// app shell (Go renderShell, active "/articles").
const newVM = () => composeVM('Write an article', '/articles/new', 'Publish');

export const load: PageServerLoad = async (event) => {
	await requireArticles(event);
	const vm = newVM();
	vm.form.idempotencyKey = newIdempotencyKey();
	await composeGate(event, vm);
	event.setHeaders({ 'cache-control': SIGNED_IN_CACHE_CONTROL });
	return { vm: withPreview(vm) };
};

export const actions: Actions = {
	default: async (event) => {
		enforceBodyLimit(event, ARTICLE_FORM_MAX_BYTES);
		await requireArticles(event);
		const vm = newVM();
		const { form, err, raw } = await readComposeForm(event);
		// The key travels with the form, through a failed attempt too, so a
		// resubmission of this composer reuses it. A missing or foreign one is
		// replaced for next time and not sent now.
		let key = raw?.get('idempotency_key');
		if (typeof key !== 'string' || !idempotencyKeyPattern.test(key)) {
			key = '';
			form.idempotencyKey = newIdempotencyKey();
		} else {
			form.idempotencyKey = key;
		}
		vm.form = form;
		if (err) {
			vm.error = boardsErrorText(err);
			return fail(422, { vm: withPreview(vm) });
		}
		let to: string;
		try {
			const detail = await createArticle(
				event,
				{ ...articleWriteRequest(form), source: 'web' },
				key
			);
			to = articlePath(detail.article.slug, detail.article.code) + '?notice=published';
		} catch (e) {
			vm.error = boardsErrorText(e);
			return fail(422, { vm: withPreview(vm) });
		}
		redirect(303, to);
	}
};
