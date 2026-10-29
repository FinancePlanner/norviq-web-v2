import type { PageServerLoad } from './$types';
import { loadCoinPage, requireCrypto } from '#lib/features/planning-tools/crypto/crypto.server.js';

// GET /crypto/coin/{symbol} (appHandler.CryptoCoin): FMP symbols only
// (^[A-Z0-9]{1,15}USD$ after upper-casing), else 404. ?range=1w|1m|3m|ytd|1y|all.
export const load: PageServerLoad = async (event) => {
	await requireCrypto(event);
	return { vm: await loadCoinPage(event, event.params.symbol) };
};
