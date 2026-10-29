import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	BriefNotFound,
	BriefUnavailable,
	MISSING_CACHE_CONTROL,
	PAGE_CACHE_CONTROL,
	briefPath,
	findBrief,
	langQuery,
	pageVM,
	parsePermalink,
	urlLang
} from '#lib/features/public/brief/brief.server.js';

// GET /brief/{date}/{slot} — Go MarketBriefHandler.Page (market_brief_page.go).
// The page's language is its URL's ?lang=, so it overrides the request locale
// (t() in components and <html lang>).
export const load: PageServerLoad = async (event) => {
	const lang = urlLang(event.url);
	event.locals.locale = lang;
	const key = parsePermalink(event.params.date, event.params.slot);
	const notFound = () => {
		event.setHeaders({ 'Cache-Control': MISSING_CACHE_CONTROL });
		error(404, 'market brief not found');
	};
	if (!key) notFound();
	const signedIn = !!event.locals.session.accessToken;
	let brief;
	try {
		brief = await findBrief(event, { lang, slot: key!.slot, date: key!.date });
	} catch (err) {
		if (err instanceof BriefNotFound) notFound();
		if (err instanceof BriefUnavailable) {
			event.setHeaders({ 'Retry-After': '60' });
			error(503, 'Temporarily unavailable');
		}
		throw err;
	}
	const vm = pageVM(lang, brief!, signedIn);
	// Latest is linked only when this is not it. A failed lookup of the latest
	// just leaves the link off.
	try {
		const latest = await findBrief(event, { lang, slot: '', date: '' });
		if (latest.slot !== key!.slot || latest.tradingDateISO !== key!.date) {
			vm.latestURL = briefPath(latest.tradingDateISO, latest.slot) + langQuery(lang);
		}
	} catch {
		// no Latest link
	}
	// Shared caches may hold the page for five minutes; a member's copy is never shared.
	event.setHeaders({ 'Cache-Control': signedIn ? 'private, no-store' : PAGE_CACHE_CONTROL });
	return { locale: lang, vm };
};
