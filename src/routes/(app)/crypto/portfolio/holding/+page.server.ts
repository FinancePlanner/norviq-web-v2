import type { Actions, PageServerLoad } from './$types';
import {
	loadCryptoHoldingFormVM,
	requireCrypto,
	submitCryptoHolding
} from '#lib/features/planning-tools/crypto/crypto.server.js';

// GET /crypto/portfolio/holding (CryptoPortfolioHoldingForm): the Add holding
// panel, an htmx fragment in Go, opened with preloadData() in the portfolio
// tab's dialog. POST (CryptoPortfolioHoldingCreate) is the default action.
export const load: PageServerLoad = async (event) => {
	await requireCrypto(event);
	return { vm: await loadCryptoHoldingFormVM(event, '') };
};

export const actions: Actions = {
	default: (event) => submitCryptoHolding(event, '')
};
