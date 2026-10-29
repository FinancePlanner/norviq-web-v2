import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	BriefNotFound,
	BriefUnavailable,
	MISSING_CACHE_CONTROL,
	REDIRECT_CACHE_CONTROL,
	briefPath,
	findBrief,
	langQuery,
	urlLang
} from '#lib/features/public/brief/brief.server.js';

// GET /brief — Go MarketBriefHandler.Latest: a 302 to the latest brief's
// permalink in the requested language. No brief renders the 404 page
// (+error.svelte, in the URL's language).
export const load: PageServerLoad = async (event) => {
	const lang = urlLang(event.url);
	event.locals.locale = lang;
	let brief;
	try {
		brief = await findBrief(event, { lang, slot: '', date: '' });
	} catch (err) {
		if (err instanceof BriefNotFound) {
			event.setHeaders({ 'Cache-Control': MISSING_CACHE_CONTROL });
			error(404, 'market brief not found');
		}
		if (err instanceof BriefUnavailable) {
			event.setHeaders({ 'Retry-After': '60' });
			error(503, 'Temporarily unavailable');
		}
		throw err;
	}
	event.setHeaders({ 'Cache-Control': REDIRECT_CACHE_CONTROL });
	redirect(302, briefPath(brief.tradingDateISO, brief.slot) + langQuery(lang));
};
