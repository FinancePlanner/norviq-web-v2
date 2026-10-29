import type { SubmitFunction } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { withSpinner } from '#lib/components/norviq/form-loading.js';

// Port of norviq-web internal/server/assets/quick-expense.js: the dashboard's
// quick-expense modal (#quick-expense-form, POST /dashboard/quick-expense,
// owned by the dashboard port). Go listened for htmx:after:request on that
// form and, on a 204, dispatched `closeQuickExpense` (PinesModalShell) and
// refreshed #activity-feed and #recent-spend-panel. Here it is the form's
// enhance callback; the refresh is invalidateAll() instead of htmx triggers.
//
//   <form id="quick-expense-form" method="POST" action="/dashboard/quick-expense" use:enhance={quickExpenseEnhance()}>

export function quickExpenseEnhance(): SubmitFunction {
	return withSpinner(() => async ({ result, update }) => {
		if (result.type === 'success' || result.type === 'redirect') {
			window.dispatchEvent(new CustomEvent('closeQuickExpense'));
			await invalidateAll();
			return;
		}
		await update({ reset: false });
	});
}
