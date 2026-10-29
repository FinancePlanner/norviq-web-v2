import type { PageServerLoad } from './$types';
import {
	buildOnePageRows,
	loadHoldingsViewModel,
	loadShareLink,
	ONE_PAGE_MAX_ROWS,
	shareScope
} from '#lib/features/portfolio/holdings/holdings.server.js';
import type { OnePageVM } from '#lib/features/portfolio/holdings/types.js';

// GET /portfolio/one-page — appHandler.PortfolioOnePage
export const load: PageServerLoad = async (event) => {
	const portfolioID = (event.url.searchParams.get('portfolio') ?? '').trim();
	const [holdings, share] = await Promise.all([
		loadHoldingsViewModel(event, '1M', portfolioID),
		loadShareLink(event, shareScope(portfolioID))
	]);
	const { rows, other } = buildOnePageRows(holdings.positions, ONE_PAGE_MAX_ROWS);
	const vm: OnePageVM = {
		portfolioID,
		totalValue: holdings.totalValue,
		heroSubtitle: holdings.heroSubtitle,
		trendLabel: holdings.trendLabel,
		rows,
		other,
		hasLoadError: holdings.hasLoadError,
		share
	};
	return { vm };
};
