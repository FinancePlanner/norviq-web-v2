import type { PageServerLoad } from './$types';
import { loadPortfolioOptions } from '#lib/features/portfolio/holdings/holdings.server.js';

// Broker picker: GET /v1/portfolios (same list /portfolio and /portfolios read).
export const load: PageServerLoad = async (event) => {
	const portfolios = (await loadPortfolioOptions(event)) ?? [];
	const wanted = (event.url.searchParams.get('portfolio_list_id') ?? '').trim();
	const selectedId =
		portfolios.find((p) => p.id === wanted)?.id ??
		portfolios.find((p) => p.isDefault)?.id ??
		portfolios[0]?.id ??
		'';
	return { portfolios, selectedId };
};
