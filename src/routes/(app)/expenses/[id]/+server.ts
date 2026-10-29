import { error, type RequestHandler } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { expenseDeleteTarget, isUUID } from '#lib/features/money/expenses/forms.server.js';

// DELETE /expenses/{id} (ExpensesDelete). Go answered htmx with 204 +
// HX-Redirect; here the caller reads the target from x-redirect and goto()s it.
// A non-fetch caller gets the 303 Go sent to plain requests.
export const DELETE: RequestHandler = async (event) => {
	const id = event.params.id?.trim() ?? '';
	if (!isUUID(id)) error(400, 'Invalid expense');
	try {
		await apiJSON(event, 'DELETE', `/v1/expenses/${id}`);
	} catch {
		error(502, 'Could not delete expense');
	}
	const target = expenseDeleteTarget(event.url);
	return new Response(null, { status: 204, headers: { 'x-redirect': target } });
};
