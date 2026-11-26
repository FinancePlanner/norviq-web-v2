import type { PageServerLoad } from './$types';
import { portfolioListIdOrEmpty } from '#lib/features/portfolio/import/brokers.js';
import { loadPortfolioOptions } from '#lib/features/portfolio/holdings/holdings.server.js';

// Broker picker: GET /v1/portfolios (same list /portfolio and /portfolios read).
export const load: PageServerLoad = async (event) => {
	const portfolios = (await loadPortfolioOptions(event)) ?? [];
	const wanted = (event.url.searchParams.get('portfolio_list_id') ?? '').trim();
	// Backend ids are upper-case; links may carry lower-case. If the list
	// failed to load, a valid UUID is still forwarded as-is.
	const selectedId =
		portfolios.find((p) => p.id.toLowerCase() === wanted.toLowerCase())?.id ??
		portfolios.find((p) => p.isDefault)?.id ??
		portfolios[0]?.id ??
		portfolioListIdOrEmpty(wanted);
	return { portfolios, selectedId };
};
