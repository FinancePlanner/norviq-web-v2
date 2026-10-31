import { json, type RequestHandler } from '@sveltejs/kit';
import { fetchJSON } from '#lib/features/dashboard/fetch.server.js';
import { isoDate } from '#lib/features/dashboard/shared.js';

// POST /dashboard/quick-expense — AppHandler.DashboardQuickExpense. 204 on
// success (the modal closes); errors answer 200 with { error }, the message
// Go rendered as QuickExpenseError into #quick-expense-feedback.

/** handlers.parsePositiveFloat: a comma decimal is accepted. */
function parsePositiveFloat(raw: string): number | null {
	const s = raw.replaceAll(',', '.');
	if (s === '' || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return null;
	const v = Number(s);
	return Number.isFinite(v) && v > 0 ? v : null;
}

const fail = (message: string) => json({ error: message });

export const POST: RequestHandler = async (event) => {
	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		return fail('Invalid form submission.');
	}
	const field = (k: string) => String(form.get(k) ?? '').trim();
	const title = field('title');
	const pillar = field('pillar') || 'fundamentals';
	const occurredRaw = field('occurred_on');
	if (!title) return fail('Enter a title for this expense.');
	const amount = parsePositiveFloat(field('amount'));
	if (amount === null) return fail('Enter a valid amount.');

	let occurredOn = isoDate(new Date());
	if (
		/^\d{4}-\d{2}-\d{2}$/.test(occurredRaw) &&
		!Number.isNaN(new Date(occurredRaw + 'T00:00:00Z').getTime())
	)
		occurredOn = occurredRaw;

	// parseExpenseSplit: the modal has no split control, so this is personal/100.
	const shared = field('split_mode').toLowerCase() === 'shared';
	let userSharePercent = 100;
	if (shared) {
		const v = parsePositiveFloat(field('user_share_percent'));
		if (v !== null && v <= 100) userSharePercent = v;
	}

	const res = await fetchJSON(event, 'POST', '/v1/expenses', {
		title,
		amount,
		pillar,
		occurredOn,
		splitMode: shared ? 'shared' : 'personal',
		userSharePercent
	});
	if (res.failed || res.status !== 201) return fail('Could not save expense. Try again.');
	return new Response(null, { status: 204 });
};
