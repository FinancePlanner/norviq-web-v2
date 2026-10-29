import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiJSON } from '#lib/server/api.js';
import {
	parseBoundedFloat,
	parseUUID,
	portfolioAPIErrorMessage,
	redirectFinancialGoals,
	validISODate
} from '#lib/features/dashboard/goals/form.server.js';
import type { PlanningGoalContributionInput } from '#lib/features/dashboard/goals/types.js';

// POST /goals/{id}/contributions → FinancialGoalContributionCreate.
//
// No Go page posts here (the goals templ has no contribution form), so it
// stays an endpoint at the same URL rather than a form action.
export const POST: RequestHandler = async (event) => {
	const id = parseUUID(event.params.id);
	if (!id) return text('Invalid financial goal\n', { status: 400 });
	const form = await event.request.formData();
	const amount = parseBoundedFloat(form.get('amount'), 0.01, 1_000_000_000);
	if (amount === null) redirectFinancialGoals('', 'Enter a positive contribution.');
	const date = form.get('occurredAt');
	if (!validISODate(date)) redirectFinancialGoals('', 'Choose a valid contribution date.');
	const request: PlanningGoalContributionInput = { amount, occurredAt: date };
	// `json:"note,omitempty"`
	const note = String(form.get('note') ?? '').trim();
	if (note) request.note = note;
	try {
		await apiJSON(event, 'POST', `/v1/financial-goals/${encodeURIComponent(id)}/contributions`, request);
	} catch (err) {
		redirectFinancialGoals('', portfolioAPIErrorMessage(err, 'Could not record the contribution.'));
	}
	redirectFinancialGoals('Contribution recorded.', '');
};
