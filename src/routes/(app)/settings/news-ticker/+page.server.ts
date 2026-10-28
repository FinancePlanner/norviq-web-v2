import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	addNewsTickerFeed,
	deleteNewsTickerFeed,
	loadNewsTickerSettingsVM,
	updateNewsTickerSettings
} from '#lib/features/settings-admin/news-ticker/news-ticker.server.js';

// Port of norviq-web Settings case "news-ticker" and the
// SettingsNewsTicker{Toggle,AddFeed,RemoveFeed} handlers.

export const load: PageServerLoad = async (event) => loadNewsTickerSettingsVM(event);

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
function backToPage(): never {
	redirect(303, '/settings/news-ticker');
}

// Go's newsTickerFeedback: htmx callers got the message fragment, plain form
// posts a redirect back to the page. The switch was htmx; the add/remove
// forms are plain posts, so their outcome messages were never shown. That
// oddity is kept: the message is only logged here.
function plainPostFeedback(errMsg: string, okMsg: string): never {
	if (errMsg) console.info('news ticker feed:', errMsg);
	else if (okMsg) console.debug('news ticker feed:', okMsg);
	backToPage();
}

export const actions: Actions = {
	// POST /settings/news-ticker/toggle (hx-post on change; HX-Refresh on success).
	toggle: async (event) => {
		const form = await event.request.formData();
		// An unchecked switch sends nothing, which reads as "off".
		const enabled = String(form.get('enabled') ?? '').trim() === 'true';
		try {
			await updateNewsTickerSettings(event, enabled);
		} catch (err) {
			console.warn('update news ticker settings', err);
			return fail(502, { errorMessage: 'Could not update the ticker. Try again.' });
		}
		backToPage();
	},

	// POST /settings/news-ticker/feeds
	addFeed: async (event) => {
		const raw = String((await event.request.formData()).get('url') ?? '').trim();
		if (raw === '') plainPostFeedback('Enter a site or feed address.', '');
		let status: number;
		try {
			status = await addNewsTickerFeed(event, raw);
		} catch (err) {
			console.warn('add news ticker feed', err);
			plainPostFeedback('Could not add that feed. Try again.', '');
		}
		switch (status) {
			case 200:
				plainPostFeedback('', 'Feed added.');
				break;
			case 400:
				plainPostFeedback('That address cannot be used as a feed.', '');
				break;
			case 409:
				plainPostFeedback('You already follow that feed, or you are at the limit.', '');
				break;
			case 422:
				plainPostFeedback('No feed found at that address.', '');
				break;
			default:
				plainPostFeedback('Could not add that feed. Try again.', '');
		}
	},

	// POST /settings/news-ticker/feeds/{id}/delete
	removeFeed: async (event) => {
		const id = String((await event.request.formData()).get('id') ?? '').trim();
		if (!UUID_RE.test(id)) plainPostFeedback('Invalid feed.', '');
		let status = 0;
		try {
			status = await deleteNewsTickerFeed(event, id);
		} catch (err) {
			console.warn('remove news ticker feed', err);
		}
		if (status !== 204 && status !== 404) plainPostFeedback('Could not remove that feed. Try again.', '');
		plainPostFeedback('', 'Feed removed.');
	}
};
