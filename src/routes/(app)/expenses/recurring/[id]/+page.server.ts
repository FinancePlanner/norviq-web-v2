import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { Feature } from '#lib/billing.js';
import { requireFeature } from '#lib/server/guards.js';
import { isProRequest, requireProInline } from '#lib/features/money/expenses/gates.server.js';
import {
	deleteRecurring,
	loadRecurringTemplateFormVM,
	submitRecurring
} from '#lib/features/money/expenses/forms.server.js';

// GET /expenses/recurring/{id}, PUT → ?/update, DELETE → ?/delete.
//
// Go oddity, ported as-is: ExpensesRecurringForm reads the template id from
// the ?id= query, not the {id} path segment, so GET /expenses/recurring/{id}
// renders the *Add* form (and saving it creates a new template). Edit links
// therefore open an empty form, exactly as on the Go web.
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
	update: async (event) => {
		await requireFeature(event, Feature.RecurringTemplates, 'Recurring templates');
		await requireProInline(event, 'Recurring expenses');
		return submitRecurring(event, event.params.id.trim());
	},
	delete: async (event) => {
		await requireFeature(event, Feature.RecurringTemplates, 'Recurring templates');
		if (!(await isProRequest(event))) error(403, 'Pro required');
		return deleteRecurring(event, event.params.id.trim());
	}
};
