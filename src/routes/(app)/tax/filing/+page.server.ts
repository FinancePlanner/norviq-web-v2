import type { PageServerLoad } from './$types';
import { loadFilingPage } from '#lib/features/money/tax/tax.server.js';

// Go: appHandler.TaxFiling (GET /tax/filing). The generate forms post to
// /tax?/reports (Go: hx-post="/tax/reports").
export const load: PageServerLoad = async (event) => {
	const { isPro } = await event.parent();
	return { vm: await loadFilingPage(event, isPro) };
};
