import type { Actions, PageServerLoad } from './$types';
import { submitCategory } from '#lib/features/money/expenses/forms.server.js';

// GET /expenses/category (ExpensesCategoryLabelForm, fragment) and POST (ExpensesCategoryLabelCreate).
// DELETE /expenses/category/{id} is the ?/deleteCategory action on /expenses.
export const load: PageServerLoad = async (event) => ({
	vm: { monthQuery: (event.url.searchParams.get('month') ?? '').trim(), name: '', pillar: '', error: '' }
});

export const actions: Actions = { default: submitCategory };
