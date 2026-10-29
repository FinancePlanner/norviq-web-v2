import type { Actions, PageServerLoad } from './$types';
import { deletePlanItem, loadPlanItemFormVM, submitPlanItem } from '#lib/features/money/expenses/forms.server.js';

// GET /expenses/plan-item/{id} (edit form fragment), PUT → default action,
// DELETE → ?/delete (Go: hx-put / hx-delete).
export const load: PageServerLoad = async (event) => ({
	vm: await loadPlanItemFormVM(event, event.url.searchParams.get('month'), event.params.id)
});

export const actions: Actions = {
	default: (event) => submitPlanItem(event, event.params.id.trim()),
	delete: (event) => deletePlanItem(event, event.params.id.trim())
};
