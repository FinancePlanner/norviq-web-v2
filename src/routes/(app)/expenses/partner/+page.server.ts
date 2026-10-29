import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { isProRequest, requireProInline } from '#lib/features/money/expenses/gates.server.js';
import { loadPartnerFormVM, submitPartner } from '#lib/features/money/expenses/forms.server.js';

// /expenses/partner: requireHouseholdPartner, then the handler's own isPro check.
export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.HouseholdPartner, 'Household partner');
	await requireProInline(event, 'Household partner');
	return { vm: await loadPartnerFormVM(event) };
};

export const actions: Actions = {
	default: async (event) => {
		await requireFeature(event, Feature.HouseholdPartner, 'Household partner');
		if (!(await isProRequest(event))) error(403, 'Pro required');
		return submitPartner(event);
	}
};
