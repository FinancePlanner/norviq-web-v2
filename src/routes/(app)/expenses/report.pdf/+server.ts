import type { RequestHandler } from './$types';
import { api } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { parseExpensesMonth, monthQueryString } from '#lib/features/money/category-page/month.js';
import { writeExpensesBudgetPDF } from '#lib/features/money/pdf/budget-report.js';

// GET /expenses/report.pdf — ExpensesBudgetPDF (expenses_pdf.go), behind
// requireSmartSuggestions. The Go gate rendered the Pro page in the shell; a
// +server route cannot, so a locked reader gets the 402 error response.

const plain = (msg: string, status: number) =>
	new Response(msg + '\n', { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' } });

export const GET: RequestHandler = async (event) => {
	await requireFeature(event, Feature.SmartSuggestions, 'Smart suggestions');
	const month = parseExpensesMonth(event.url.searchParams.get('month'));
	const client = api(event);

	const snapshots = await client
		.GET('/v1/budget/snapshots', {
			params: { query: { year: month.getUTCFullYear(), month: month.getUTCMonth() + 1 } }
		})
		.catch(() => null);
	const snapshot = snapshots?.response.ok ? snapshots.data?.[0] : undefined;
	if (!snapshot) return plain('No budget exists for this month', 404);

	const drift = await client
		.GET('/v1/budget/snapshots/{snapshotId}/drift', { params: { path: { snapshotId: snapshot.id } } })
		.catch(() => null);
	if (!drift?.response.ok || !drift.data) return plain('Budget report is unavailable', 502);

	const [discipline, history] = await Promise.all([
		client.GET('/v1/budget/discipline', { params: { query: { months: 6 } } }).catch(() => null),
		client.GET('/v1/budget/reallocations').catch(() => null)
	]);

	let body: Uint8Array;
	try {
		body = writeExpensesBudgetPDF(
			month,
			drift.data,
			discipline?.response.ok && discipline.data ? discipline.data : null,
			history?.response.ok && history.data ? history.data : []
		);
	} catch (err) {
		console.error('budget pdf', err);
		return plain('PDF generation failed', 500);
	}
	return new Response(body as BodyInit, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename=norviq-budget-${monthQueryString(month)}.pdf`
		}
	});
};
