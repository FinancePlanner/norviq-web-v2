import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { components } from '#lib/api/schema.js';
import { apiJSON } from '#lib/server/api.js';
import { isUUID } from '#lib/features/portfolio/analytics/allocation.server.js';
import { loadNewsViewModel } from '#lib/features/portfolio/analytics/subpages.server.js';

// GET /portfolio/news (handlers.PortfolioNews) plus the saved-article and
// Thesis Watch fragments/mutations (portfolio_news_saved.go,
// portfolio_thesis_watch.go):
//   GET    /portfolio/news/article[/{id}]                  → NewsArticlePanel, filled from the saved list
//   POST   /portfolio/news/article                         → ?/createArticle
//   PUT    /portfolio/news/article/{id}                    → ?/updateArticle&id=
//   DELETE /portfolio/news/article/{id}                    → ?/deleteArticle&id=&filter=
//   POST   /portfolio/news/thesis-watch/{id}/feedback      → ?/feedback&id=
// GET /portfolio/news/open and /portfolio/news/thesis-watch/{id}/open are +server.ts redirects.

type S = components['schemas'];

export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	const vm = await loadNewsViewModel(event, event.url.searchParams.get('filter') ?? '');
	return { isPro, vm };
};

/** handlers.newsPageURL */
function newsPageURL(filterRaw: string): string {
	const filter = filterRaw.trim().toLowerCase();
	return filter === 'portfolio' || filter === 'saved'
		? '/portfolio/news?filter=' + filter
		: '/portfolio/news';
}

const FIELDS = ['symbol', 'headline', 'source', 'url', 'summary', 'published_at'] as const;

/** submitNewsArticle + buildNewsItemRequest; failures re-render the panel with the error (renderNewsArticleError). */
async function submitNewsArticle(event: RequestEvent, articleID: string) {
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		return fail(400, { articleID, articleError: 'Invalid form submission.', values: {} });
	}
	const values: Record<string, string> = {};
	for (const key of FIELDS) values[key] = String(form.get(key) ?? '').trim();
	const failWith = (status: number, articleError: string) =>
		fail(status, { articleID, articleError, values });

	const symbol = values.symbol.toUpperCase();
	if (symbol === '') return failWith(400, 'Symbol is required.');
	if (values.headline === '') return failWith(400, 'Headline is required.');
	const body: S['NewsItemRequest'] = { symbol, headline: values.headline };
	if (values.source !== '') body.source = values.source;
	if (values.url !== '') body.url = values.url;
	if (values.summary !== '') body.summary = values.summary;
	if (values.published_at !== '') body.publishedAt = values.published_at;

	if (articleID === '') {
		try {
			await apiJSON<S['NewsItemResponse']>(event, 'POST', '/v1/news', body);
		} catch {
			return failWith(502, 'Could not save article.');
		}
	} else {
		if (!isUUID(articleID)) return failWith(400, 'Invalid article.');
		try {
			await apiJSON<S['NewsItemResponse']>(
				event,
				'PUT',
				`/v1/news/${articleID.toLowerCase()}`,
				body
			);
		} catch {
			return failWith(502, 'Could not update article.');
		}
	}
	redirect(303, newsPageURL('saved'));
}

const THESIS_WATCH_SIGNALS = new Set([
	'relevant',
	'not_relevant',
	'supports',
	'challenges',
	'neutral',
	'clear'
]);

export const actions: Actions = {
	/** PortfolioNewsArticleCreate */
	createArticle: (event) => submitNewsArticle(event, ''),

	/** PortfolioNewsArticleUpdate */
	updateArticle: async (event) => {
		const articleID = (event.url.searchParams.get('id') ?? '').trim();
		if (articleID === '')
			return fail(400, { articleID, articleError: 'Missing article', values: {} });
		return submitNewsArticle(event, articleID);
	},

	/** PortfolioNewsArticleDelete: Go swapped the card out; the redirect reloads the list without it. */
	deleteArticle: async (event) => {
		const articleID = (event.url.searchParams.get('id') ?? '').trim();
		if (!isUUID(articleID)) return fail(400, { deleteError: 'Invalid article' });
		try {
			await apiJSON(event, 'DELETE', `/v1/news/${articleID.toLowerCase()}`);
		} catch {
			return fail(502, { deleteError: 'Could not remove article' });
		}
		redirect(303, newsPageURL(event.url.searchParams.get('filter') ?? ''));
	},

	/** PortfolioThesisWatchFeedback */
	feedback: async (event) => {
		const storyID = (event.url.searchParams.get('id') ?? '').trim();
		if (!isUUID(storyID)) return fail(400, { feedbackError: 'Invalid story ID' });
		const form = await event.request.formData().catch(() => null);
		if (!form) return fail(400, { feedbackError: 'Invalid feedback' });
		const signal = String(form.get('signal') ?? '').trim();
		if (!THESIS_WATCH_SIGNALS.has(signal))
			return fail(400, { feedbackError: 'Invalid feedback signal' });
		try {
			await apiJSON(event, 'POST', `/v1/news/thesis-watch/${storyID.toLowerCase()}/feedback`, {
				signal
			} as S['ThesisWatchFeedbackRequest']);
		} catch (err) {
			console.warn('thesis watch feedback failed', storyID, err);
			return fail(502, { feedbackError: 'Could not save feedback' });
		}
		return { feedback: signal, storyID };
	}
};
