import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	isValidCryptoTab,
	loadCryptoViewModel,
	requireCrypto
} from '#lib/features/planning-tools/crypto/crypto.server.js';
import {
	normalizeBubbleSize,
	normalizeCryptoMarketsView,
	normalizeCryptoTimeframe
} from '#lib/features/planning-tools/crypto/markets.js';

// GET /crypto and GET /crypto/{tab} (appHandler.Crypto), behind
// RequireFeature(FeatureCrypto, "Crypto"). Tabs: overview (also ""), market,
// bubbles, news, portfolio, case-insensitive; anything else is a 404.
//
// The Markets/Bubbles body was the hx-get fragment /crypto/markets/fragment;
// it is now the CryptoMarkets component querying /api/v1/crypto/markets.
export const load: PageServerLoad = async (event) => {
	await requireCrypto(event);
	const tab = event.params.tab ?? '';
	if (!isValidCryptoTab(tab)) error(404, 'Not Found');

	const activePath = tab === '' ? '/crypto' : event.url.pathname;
	const vm = await loadCryptoViewModel(event, tab, activePath);
	if (vm.tab === 'market' || vm.tab === 'bubbles') {
		const query = event.url.searchParams;
		vm.markets = {
			view: normalizeCryptoMarketsView(vm.tab),
			tf: normalizeCryptoTimeframe(query.get('tf')),
			size: normalizeBubbleSize(query.get('size'))
		};
	}
	return { vm };
};
