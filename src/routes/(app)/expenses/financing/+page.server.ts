import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api } from '#lib/server/api.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { isPro } from '#lib/billing.js';
import { financingRequest, type PlanViewModel } from '#lib/features/money/financing/financing.js';

// GET /expenses/financing, POST /expenses/financing/simulate and
// /expenses/financing/save (expenses_financing.go). The two hx-posts that
// swapped #financing-result become ?/simulate and ?/save. Go's htmx config
// does not swap 4xx/5xx responses, so failures keep the previous panel: the
// page only replaces it when an action returns `result`.

export const load: PageServerLoad = async (event) => {
	const plans: PlanViewModel[] = [];
	try {
		const res = await api(event).GET('/v1/financing/plans');
		if (res.response.ok && res.data) {
			for (const plan of res.data) {
				plans.push({
					title: plan.title,
					market: plan.market,
					currency: plan.currency,
					monthlyPayment: plan.terms.quotedMonthlyPayment ?? 0,
					termMonths: plan.terms.termMonths
				});
			}
		}
	} catch (err) {
		console.warn('financing plans fetch failed', err);
	}
	return { plans };
};

export const actions: Actions = {
	simulate: async (event) => {
		const { vm, request } = financingRequest(await event.request.formData());
		if (!request) return fail(422, { result: vm });
		let result;
		try {
			const res = await api(event).POST('/v1/financing/simulations', { body: request });
			result = res.response.ok ? res.data?.results?.[0] : undefined;
		} catch (err) {
			console.warn('financing simulate failed', err);
		}
		if (!result) {
			vm.cashFlowStatus = 'Simulation unavailable';
			vm.cashFlowMessage = 'The financing service could not calculate this offer.';
			return fail(502, { result: vm });
		}
		vm.monthlyPayment = result.monthlyPayment;
		vm.totalPaid = result.totalOutOfPocket;
		vm.creditCost = result.totalCreditCost;
		vm.cashFlowStatus = result.affordability.cashFlowStatus.replaceAll('_', ' ');
		vm.cashFlowMessage = result.affordability.message;
		const bench = result.affordability.benchmark;
		vm.benchmarkMessage = bench.message;
		vm.benchmarkStatus = bench.status;
		vm.benchmarkRatio = bench.ratio ?? null;
		vm.guidanceMinimum = bench.guidanceMinimum ?? null;
		vm.guidanceMaximum = bench.guidanceMaximum ?? null;
		vm.incomeBasis = bench.incomeBasis ?? null;
		return { result: vm, isPro: isPro(await loadBillingContext(event)) };
	},

	save: async (event) => {
		if (!isPro(await loadBillingContext(event)))
			return fail(403, { message: 'Norviq Pro required' });
		const { vm, request } = financingRequest(await event.request.formData());
		if (!request) return fail(422, { message: 'Invalid financing terms' });
		try {
			const res = await api(event).POST('/v1/financing/plans', {
				body: {
					title: vm.title,
					market: request.market,
					purchaseType: request.purchaseType,
					currency: request.currency,
					userSharePercent: 100,
					terms: request.offers[0]
				}
			});
			if (res.response.status !== 201 || !res.data)
				return fail(502, { message: 'Plan could not be saved' });
		} catch (err) {
			console.warn('financing save failed', err);
			return fail(502, { message: 'Plan could not be saved' });
		}
		vm.saved = true;
		return { result: vm, isPro: true };
	}
};
