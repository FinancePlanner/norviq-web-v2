import type { Actions, PageServerLoad } from './$types';
import {
	deleteCryptoHolding,
	loadCryptoHoldingFormVM,
	requireCrypto,
	submitCryptoHolding
} from '#lib/features/planning-tools/crypto/crypto.server.js';

// GET /crypto/portfolio/holding/{id} (CryptoPortfolioHoldingForm): the Edit
// holding panel. Go's PUT (CryptoPortfolioHoldingUpdate) and DELETE
// (CryptoPortfolioHoldingDelete) on this URL are the ?/update and ?/delete
// actions (forms can only POST).
export const load: PageServerLoad = async (event) => {
	await requireCrypto(event);
	return { vm: await loadCryptoHoldingFormVM(event, event.params.id) };
};

export const actions: Actions = {
	update: (event) => submitCryptoHolding(event, event.params.id.trim()),
	delete: (event) => deleteCryptoHolding(event, event.params.id)
};
