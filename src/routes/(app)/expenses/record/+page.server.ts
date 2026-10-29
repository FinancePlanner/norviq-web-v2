import type { Actions, PageServerLoad } from './$types';
import { requireProInline } from '#lib/features/money/expenses/gates.server.js';
import { loadRecordExpenseFormVM, submitRecordExpense } from '#lib/features/money/expenses/forms.server.js';

// GET /expenses/record (ExpensesRecordForm, an htmx fragment in Go): the
// Record spend panel. ?recurring=<id> pre-fills from a template (Pro).
export const load: PageServerLoad = async (event) => {
	const recurringID = (event.url.searchParams.get('recurring') ?? '').trim();
	if (recurringID) await requireProInline(event, 'Recurring expenses');
	const monthQuery = (event.url.searchParams.get('month') ?? '').trim();
	return { vm: await loadRecordExpenseFormVM(event, monthQuery, recurringID) };
};

// POST /expenses/record (ExpensesRecordSubmit)
export const actions: Actions = { default: submitRecordExpense };
