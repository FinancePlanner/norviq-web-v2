import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { apiJSON } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { safeRedirect } from '#lib/helpers.js';
import {
	formString,
	portfolioAPIErrorMessage
} from '#lib/features/portfolio/automation/common.server.js';
import {
	FormError,
	findPortfolio,
	loadRebalancingViewModel,
	parseAllocationModelForm,
	parseSimulationForm,
	rebalancingBase,
	rebalancingURL
} from '#lib/features/portfolio/automation/rebalancing.server.js';
import type { RebalancingSimulation } from '#lib/features/portfolio/automation/types.js';

// GET /portfolio/rebalancing (PortfolioRebalancing) plus the POST routes under
// /portfolio/rebalancing/{id}/… as named actions. Each form posts to
// `?portfolio={id}[&plan=…|&alert=…]&/<action>`, which carries the Go path
// parameters; redirects and messages are the Go handlers' (redirectRebalancing).

const gate = (event: RequestEvent) =>
	requireFeature(event, Feature.RebalancingRules, 'Rebalancing rules');

export const load: PageServerLoad = async (event) => {
	await gate(event);
	return { vm: await loadRebalancingViewModel(event) };
};

const portfolioParam = (event: RequestEvent) =>
	(event.url.searchParams.get('portfolio') ?? '').trim();

function back(portfolioID: string, message: string, isError: boolean): never {
	safeRedirect(303, rebalancingURL(portfolioID, message, isError));
}

export const actions: Actions = {
	// POST /portfolio/rebalancing/{id}/model — PortfolioRebalancingModelSave
	model: async (event) => {
		await gate(event);
		const portfolioID = portfolioParam(event);
		const form = await event.request.formData();
		let input;
		try {
			input = parseAllocationModelForm(form);
		} catch (err) {
			if (err instanceof FormError) back(portfolioID, err.message, true);
			throw err;
		}
		let method = 'POST';
		let path = rebalancingBase(portfolioID) + '/models';
		const modelID = formString(form, 'modelId').trim();
		if (modelID !== '') {
			method = 'PUT';
			path += '/' + encodeURIComponent(modelID);
		}
		try {
			await apiJSON(event, method, path, input);
		} catch (err) {
			back(
				portfolioID,
				portfolioAPIErrorMessage(err, 'Could not save the allocation model.'),
				true
			);
		}
		back(portfolioID, 'Allocation model saved.', false);
	},

	// POST /portfolio/rebalancing/{id}/simulate — PortfolioRebalancingSimulate.
	// Renders the page (no redirect) with the simulation or its error.
	simulate: async (event) => {
		await gate(event);
		const portfolioID = portfolioParam(event);
		const form = await event.request.formData();
		let request;
		try {
			request = parseSimulationForm(form);
		} catch (err) {
			if (err instanceof FormError) back(portfolioID, err.message, true);
			throw err;
		}
		const page = await apiJSON<{ items: { id: string }[] | null }>(
			event,
			'GET',
			'/v1/portfolios'
		).catch(() => null);
		if (!findPortfolio((page?.items ?? []) as never[], portfolioID)) {
			return { portfolioID, error: 'Portfolio not found.' };
		}
		try {
			const simulation = await apiJSON<RebalancingSimulation>(
				event,
				'POST',
				rebalancingBase(portfolioID) + '/simulate',
				request
			);
			return { portfolioID, simulation, cashFlow: request.cashFlow };
		} catch (err) {
			return {
				portfolioID,
				error: portfolioAPIErrorMessage(err, 'Could not calculate the rebalancing plan.')
			};
		}
	},

	// POST /portfolio/rebalancing/{id}/plans — PortfolioRebalancingPlanSave
	plans: async (event) => {
		await gate(event);
		const portfolioID = portfolioParam(event);
		const form = await event.request.formData();
		let simulation;
		try {
			simulation = parseSimulationForm(form);
		} catch (err) {
			if (err instanceof FormError) back(portfolioID, err.message, true);
			throw err;
		}
		const input = { name: formString(form, 'name').trim(), simulation };
		try {
			await apiJSON(event, 'POST', rebalancingBase(portfolioID) + '/plans', input);
		} catch (err) {
			back(portfolioID, portfolioAPIErrorMessage(err, 'Could not save the plan.'), true);
		}
		back(portfolioID, 'Planning record saved. No orders were placed.', false);
	},

	// POST /portfolio/rebalancing/{id}/plans/{planID}/complete — PortfolioRebalancingPlanComplete
	complete: async (event) => {
		await gate(event);
		const portfolioID = portfolioParam(event);
		const planID = (event.url.searchParams.get('plan') ?? '').trim();
		const form = await event.request.formData();
		const input = { note: formString(form, 'note').trim() };
		try {
			await apiJSON(
				event,
				'POST',
				`${rebalancingBase(portfolioID)}/plans/${encodeURIComponent(planID)}/complete`,
				input
			);
		} catch (err) {
			back(portfolioID, portfolioAPIErrorMessage(err, 'Could not complete the plan.'), true);
		}
		back(portfolioID, 'Rebalance logged in discipline history.', false);
	},

	// POST /portfolio/rebalancing/{id}/preferences — PortfolioRebalancingPreferences
	preferences: async (event) => {
		await gate(event);
		const portfolioID = portfolioParam(event);
		const form = await event.request.formData();
		const input = { pushEnabled: form.get('pushEnabled') === 'on' };
		try {
			await apiJSON(event, 'PUT', rebalancingBase(portfolioID) + '/preferences', input);
		} catch (err) {
			back(portfolioID, portfolioAPIErrorMessage(err, 'Could not update alert settings.'), true);
		}
		back(portfolioID, 'Alert settings updated.', false);
	},

	// POST /portfolio/rebalancing/{id}/alerts/{alertID}/acknowledge — PortfolioRebalancingAlertAcknowledge
	acknowledge: async (event) => {
		await gate(event);
		const portfolioID = portfolioParam(event);
		const alertID = (event.url.searchParams.get('alert') ?? '').trim();
		try {
			await apiJSON(
				event,
				'POST',
				`/v1/rebalancing/alerts/${encodeURIComponent(alertID)}/acknowledge`
			);
		} catch (err) {
			back(portfolioID, portfolioAPIErrorMessage(err, 'Could not acknowledge the alert.'), true);
		}
		back(portfolioID, 'Alert acknowledged.', false);
	}
};
