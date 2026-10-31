import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	DIGEST_UNSUBSCRIBE_CACHE_CONTROL,
	digestUnsubscribeTokenPattern,
	unsubscribeDigest
} from '#lib/features/public/digest/digest.server.js';

// GET /digest/unsubscribe?token= — Go DigestUnsubscribePage. Only shows a
// confirm button: link scanners and previews follow GETs, so the GET must
// never unsubscribe. (One-click unsubscribe from the mail client goes to the
// backend directly via List-Unsubscribe.)
export const load: PageServerLoad = ({ url, request, setHeaders }) => {
	setHeaders({ 'Cache-Control': DIGEST_UNSUBSCRIBE_CACHE_CONTROL });
	// The form posts to /digest/unsubscribe without the query; the action
	// validates its own token.
	if (request.method === 'POST') return { token: '' };
	const token = url.searchParams.get('token') ?? '';
	if (!digestUnsubscribeTokenPattern.test(token)) error(404, 'Not Found');
	return { token };
};

// POST /digest/unsubscribe — Go DigestUnsubscribeSubmit.
export const actions: Actions = {
	default: async (event) => {
		const token = String((await event.request.formData()).get('token') ?? '');
		if (!digestUnsubscribeTokenPattern.test(token)) error(404, 'Not Found');
		try {
			await unsubscribeDigest(event, token);
		} catch (err) {
			console.error('digest unsubscribe', err);
			return fail(502, {
				token,
				error: "We couldn't unsubscribe you just now. Please try again.",
				done: false
			});
		}
		return { done: true, token: '', error: '' };
	}
};
