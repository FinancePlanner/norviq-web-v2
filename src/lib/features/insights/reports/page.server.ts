import { error, type RequestEvent } from '@sveltejs/kit';
import { isValidReportTab } from '#lib/nav.js';
import { loadReportsViewModel } from './load.server.js';

/** labelTitle: first letter upper-cased. */
const labelTitle = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');

/**
 * handlers.Reports: unknown tabs 404; "reports" is free for everyone
 * (backend proOnly=false), so there is no gate here.
 */
export async function loadReportsPage(event: RequestEvent, tab: string, isPro: boolean) {
	if (!isValidReportTab(tab)) error(404, 'Not Found');
	const tabLabel = tab ? labelTitle(tab) : 'Overview';
	const vm = await loadReportsViewModel(event, tab, event.url.pathname, isPro);
	return { vm, title: `Reports - ${tabLabel} - Norviq` };
}
