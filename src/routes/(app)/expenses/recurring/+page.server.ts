import type { Actions, PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { requireProInline } from '#lib/features/money/expenses/gates.server.js';
import {
	loadRecurringTemplateFormVM,
	submitRecurring
} from '#lib/features/money/expenses/forms.server.js';

// /expenses/recurring: requireRecurringTemplates, then the handler's isPro
// check ("Recurring expenses").
export const load: PageServerLoad = async (event) => {
	await requireFeature(event, Feature.RecurringTemplates, 'Recurring templates');
	await requireProInline(event, 'Recurring expenses');
	return {
		vm: await loadRecurringTemplateFormVM(
			event,
			event.url.searchParams.get('month'),
			event.url.searchParams.get('id') ?? ''
		)
	};
};

export const actions: Actions = {
	default: async (event) => {
		await requireFeature(event, Feature.RecurringTemplates, 'Recurring templates');
		await requireProInline(event, 'Recurring expenses');
		return submitRecurring(event, '');
	}
};
