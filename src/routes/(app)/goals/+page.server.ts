import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { apiJSON } from '#lib/server/api.js';
import {
	financialGoalInputFromForm,
	formChoice,
	noteGuidedAction,
	parseBoundedFloat,
	parseUUID,
	portfolioAPIErrorMessage,
	redirectFinancialGoals
} from '#lib/features/dashboard/goals/form.server.js';
import type {
	GoalsPageViewModel,
	PlanningFinancialGoalBulkUpdate,
	PlanningGoalAdjustmentDraft,
	PlanningGoalOverview,
	PlanningGoalSuggestion,
	PlanningGoalTemplate,
	PlanningGoalWhatIfRequest,
	PlanningGoalWhatIfResponse,
	PortfolioListSummary
} from '#lib/features/dashboard/goals/types.js';

// Port of norviq-web internal/handlers/goal_planning.go.
//
// Soft-gated on purpose (server.go): goal planning is free up to one active
// goal, so the page renders for everyone and the limit is enforced in-page
// from PlanningGoalOverview.activeGoalLimit. No requireFeature here.

const emptyOverview = (): PlanningGoalOverview => ({
	items: [],
	totalCurrentValue: 0,
	totalTargetAmount: 0,
	activeGoalCount: 0,
	activeGoalLimit: null,
	isPro: false
});

// loadGoalPlanningViewModel
export const load: PageServerLoad = async (event) => {
	const vm: GoalsPageViewModel = {
		overview: emptyOverview(),
		templates: [],
		portfolios: [],
		selected: null,
		suggestions: [],
		notice: '',
		errorMessage: ''
	};
	const query = event.url.searchParams;
	try {
		vm.overview = (await apiJSON<PlanningGoalOverview>(event, 'GET', '/v1/financial-goals/overview')) ?? emptyOverview();
	} catch (err) {
		vm.errorMessage = portfolioAPIErrorMessage(err, 'Could not load financial goals.');
	}
	if (!vm.errorMessage) {
		const [templates, portfolios] = await Promise.all([
			apiJSON<PlanningGoalTemplate[]>(event, 'GET', '/v1/financial-goals/templates').catch(() => null),
			apiJSON<{ id: string; name: string }[]>(event, 'GET', '/v1/portfolio/lists').catch(() => null)
		]);
		vm.templates = templates ?? [];
		// uuid.UUID.String() in Go: the option values are lower-case.
		vm.portfolios = (portfolios ?? []).map((p): PortfolioListSummary => ({ id: p.id.toLowerCase(), name: p.name }));
		const items = vm.overview.items ?? [];
		let selectedID = query.get('goal') ?? '';
		if (selectedID === '' && items.length > 0) selectedID = items[0].id;
		vm.selected = items.find((item) => item.id === selectedID) ?? null;
		if (vm.selected) {
			const path = `/v1/financial-goals/${encodeURIComponent(vm.selected.id)}/suggestions`;
			vm.suggestions = (await apiJSON<PlanningGoalSuggestion[]>(event, 'GET', path).catch(() => null)) ?? [];
		}
	}
	// FinancialGoals
	vm.notice = query.get('notice') ?? '';
	vm.errorMessage = vm.errorMessage || (query.get('error') ?? '');
	return { vm };
};

export const actions: Actions = {
	// POST /goals → FinancialGoalCreate
	create: async (event) => {
		const form = await event.request.formData();
		const parsed = financialGoalInputFromForm(form);
		if (!('input' in parsed)) redirectFinancialGoals('', parsed.message);
		try {
			await apiJSON(event, 'POST', '/v1/financial-goals', parsed.input);
		} catch (err) {
			redirectFinancialGoals('', portfolioAPIErrorMessage(err, 'Could not create the financial goal.'));
		}
		await noteGuidedAction(event, 'set_goal');
		redirectFinancialGoals('Financial goal created.', '');
	},

	// POST /goals/bulk → FinancialGoalBulkUpdate
	bulk: async (event) => {
		const form = await event.request.formData();
		const ids = form.getAll('goalId').map(String);
		const status = formChoice(form.get('status'), 'active', 'paused', 'archived');
		if (ids.length === 0) redirectFinancialGoals('', 'Select at least one financial goal.');
		const request: PlanningFinancialGoalBulkUpdate = { goalIds: ids, status };
		try {
			await apiJSON(event, 'PATCH', '/v1/financial-goals/bulk', request);
		} catch (err) {
			redirectFinancialGoals('', portfolioAPIErrorMessage(err, 'Could not update the selected goals.'));
		}
		redirectFinancialGoals('Selected goals updated.', '');
	},

	// POST /goals/{id}/what-if → FinancialGoalWhatIf. Go answered with the
	// WhatIfResult fragment (hx-target="#what-if-result"); here the action
	// returns the response and the page renders the same fragment. Go's error
	// branches were plain-text non-2xx responses, which htmx does not swap, so
	// a failure leaves #what-if-result as it was.
	whatIf: async (event) => {
		const form = await event.request.formData();
		const id = parseUUID(String(form.get('goalId') ?? ''));
		if (!id) return fail(400, { whatIfError: 'Invalid financial goal' });
		const contribution = parseBoundedFloat(form.get('monthlyContribution'), 0, 1_000_000_000);
		if (contribution === null) return fail(400, { whatIfError: 'Enter a valid monthly contribution' });
		const annualReturn = parseBoundedFloat(form.get('expectedAnnualReturn'), -50, 50);
		if (annualReturn === null) return fail(400, { whatIfError: 'Enter a valid annual return' });
		const request: PlanningGoalWhatIfRequest = { monthlyContribution: contribution, expectedAnnualReturn: annualReturn / 100 };
		try {
			const whatIf = await apiJSON<PlanningGoalWhatIfResponse>(
				event,
				'POST',
				`/v1/financial-goals/${encodeURIComponent(id)}/what-if`,
				request
			);
			return { whatIf, whatIfGoalId: id };
		} catch (err) {
			return fail(502, { whatIfError: portfolioAPIErrorMessage(err, 'Could not calculate the scenario.') });
		}
	},

	// POST /goals/{id}/suggestions/{suggestionID}/accept → FinancialGoalSuggestionAccept
	accept: async (event) => {
		const form = await event.request.formData();
		const goalID = parseUUID(String(form.get('goalId') ?? ''));
		const suggestionID = parseUUID(String(form.get('suggestionId') ?? ''));
		if (!goalID || !suggestionID) error(400, 'Invalid adjustment');
		const path = `/v1/financial-goals/${encodeURIComponent(goalID)}/suggestions/${encodeURIComponent(suggestionID)}/accept`;
		try {
			await apiJSON<PlanningGoalAdjustmentDraft>(event, 'POST', path, {});
		} catch (err) {
			redirectFinancialGoals('', portfolioAPIErrorMessage(err, 'Could not prepare the adjustment draft.'));
		}
		redirectFinancialGoals('Review draft created. No budget or portfolio changes were applied.', '');
	}
};
