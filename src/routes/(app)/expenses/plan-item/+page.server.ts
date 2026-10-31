import type { Actions, PageServerLoad } from './$types';
import { loadPlanItemFormVM, submitPlanItem } from '#lib/features/money/expenses/forms.server.js';

// GET /expenses/plan-item (ExpensesPlanItemForm, fragment) and POST (ExpensesPlanItemCreate).
export const load: PageServerLoad = async (event) => ({
	vm: await loadPlanItemFormVM(event, event.url.searchParams.get('month'), '')
});

export const actions: Actions = { default: (event) => submitPlanItem(event, '') };
