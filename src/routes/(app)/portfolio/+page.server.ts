import type { PageServerLoad } from './$types';
import { isPro } from '#lib/billing.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { pilotFollowingFor } from '#lib/components/norviq/PilotFollowingBanner.svelte';
import {
	loadHoldingsViewModel,
	loadPortfolioOptions
} from '#lib/features/portfolio/holdings/holdings.server.js';
import { pilotFollowingByPortfolio } from '#lib/features/portfolio/workspace/pilots.server.js';

// GET /portfolio — appHandler.PortfolioHoldings
export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams;
	let portfolioID = (q.get('portfolio') ?? '').trim();
	const [vm, options, follows, billing] = await Promise.all([
		loadHoldingsViewModel(event, q.get('range'), portfolioID),
		loadPortfolioOptions(event),
		pilotFollowingByPortfolio(event),
		loadBillingContext(event)
	]);
	if (options) {
		vm.portfolios = options;
		if (portfolioID === '' && options.length > 0) portfolioID = options[0].id;
		vm.selectedPortfolio = portfolioID;
	}
	vm.followingPilot = pilotFollowingFor(follows, vm.selectedPortfolio) ?? null;
	vm.isPro = isPro(billing);
	vm.addPosition.portfolioID = portfolioID;
	vm.showAddPosition = q.get('add') === 'position';
	return { vm };
};
