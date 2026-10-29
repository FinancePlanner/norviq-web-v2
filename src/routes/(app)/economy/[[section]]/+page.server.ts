import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadEconomyViewModel } from '#lib/features/insights/economy/load.server.js';
import { loadEconomyPulse } from '#lib/features/dashboard/panels/load.server.js';
import { economyTitle, normalizeMacroCountry, parseEconomySection, sectionBasePath } from '#lib/features/insights/economy/types.js';

// GET /economy and /economy/{section} — AppHandler.Economy (handlers/economy.go).
// The Go /economy/news fragment (hx-trigger="load" on the inflation hub) is a
// streamed promise rendered by EconomyNewsSection; its URL is not kept.
export const load: PageServerLoad = async (event) => {
	const section = parseEconomySection(event.params.section);
	if (!section) error(404, 'Not Found');

	const country = normalizeMacroCountry(event.url.searchParams.get('country'));
	const vm = await loadEconomyViewModel(event, section, country, event.url.pathname);

	// Go renderShell(activePath = economyActivePath(section)); only needed when it
	// differs from the URL path (e.g. /economy/inflation → /economy).
	const activePath = sectionBasePath(section);

	return {
		vm,
		title: economyTitle(section),
		...(activePath !== event.url.pathname ? { activePath } : {}),
		// The news shell only renders inside the inflation body (no error branch).
		news:
			section === 'inflation' && !vm.errorMessage
				? loadEconomyPulse(event, 8).catch((err: unknown) => {
						console.warn('load economy news', err);
						return { items: null };
					})
				: null
	};
};
