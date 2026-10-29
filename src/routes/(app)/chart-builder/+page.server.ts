import type { PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { loadAssetSearchResults } from '#lib/features/dashboard/panels/load.server.js';

// GET /chart-builder (handlers.ChartBuilderStandalone): the search-first entry
// point, behind RequireFeature(MarketFundamentals, "Stock fundamentals").
// Results link to the stock's builder tab (portfolio domain).
export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.MarketFundamentals, 'Stock fundamentals');
	const query = (event.url.searchParams.get('q') ?? '').trim();
	const results =
		query === ''
			? []
			: (await loadAssetSearchResults(event, query, false)).map((r) => ({
					symbol: r.symbol,
					name: r.name,
					exchange: r.exchange,
					href: '/portfolio/' + r.symbol.toLowerCase() + '/builder'
				}));
	return { query, results };
};
