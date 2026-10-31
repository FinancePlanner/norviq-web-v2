import type { Actions, PageServerLoad } from './$types';
import { loadSalaryFormVM, submitSalary } from '#lib/features/money/expenses/forms.server.js';

// GET /expenses/salary (ExpensesSalaryForm, htmx fragment) and POST (ExpensesSalarySubmit).
export const load: PageServerLoad = async (event) => ({
	vm: await loadSalaryFormVM(event, event.url.searchParams.get('month'))
});

export const actions: Actions = { default: submitSalary };
