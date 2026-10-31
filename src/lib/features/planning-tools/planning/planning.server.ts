// Port of the HTTP side of norviq-web internal/handlers/planning.go and
// planning_retire.go. Planning is ungated (server.go: usable with no
// holdings, and it answers "am I on track").
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { portfolioAPIErrorMessage } from '#lib/features/dashboard/goals/form.server.js';
import type {
	GrowthProjectionResponse,
	PlanningPrefill,
	RetirementPlanningResponse
} from './types.js';
import {
	defaultGrowDraft,
	defaultRetireDraft,
	formatRoundedAmount,
	growChart,
	growRequest,
	growResultViewModel,
	retireChart,
	retireRequest,
	retireResultViewModel,
	type GrowDraft,
	type GrowViewModel,
	type RetireDraft,
	type RetireViewModel
} from './vm.js';

const planningBase = '/v1/planning';

/** Go's r.FormValue: the first value, or "". */
function formValue(form: FormData, key: string): string {
	const v = form.get(key);
	return typeof v === 'string' ? v : '';
}

/**
 * The /preview routes only take POST in Go (chi answers GET with 405). A GET
 * here (a reload after a no-JS submit, a pasted URL) goes back to the tool.
 */
export function previewGetGuard(event: RequestEvent, target: string) {
	if (event.request.method === 'GET') redirect(303, target);
}

/** loadGrowViewModel: pre-filled from the portfolio where there is one. */
export async function loadGrowViewModel(event: RequestEvent): Promise<GrowViewModel> {
	const vm: GrowViewModel = {
		draft: defaultGrowDraft(),
		currency: 'EUR',
		prefilled: false,
		result: null,
		chart: null,
		error: '',
		notice: ''
	};
	let prefill: PlanningPrefill;
	try {
		prefill = await apiJSON<PlanningPrefill>(event, 'GET', planningBase + '/prefill');
	} catch {
		// Pre-fill is a convenience; the calculator stays usable on its defaults.
		return vm;
	}
	if (prefill.currency) vm.currency = prefill.currency;
	if (prefill.hasPortfolio && prefill.portfolioValue > 0) {
		vm.draft.initialAmount = formatRoundedAmount(prefill.portfolioValue);
		vm.prefilled = true;
	}
	return vm;
}

function parseGrowForm(form: FormData): GrowDraft {
	return {
		initialAmount: formValue(form, 'initialAmount'),
		monthlyContribution: formValue(form, 'monthlyContribution'),
		years: formValue(form, 'years'),
		returnPercent: formValue(form, 'returnPercent'),
		contributionGrowth: formValue(form, 'contributionGrowth'),
		inflationPercent: formValue(form, 'inflationPercent'),
		adjustForInflation: formValue(form, 'adjustForInflation') !== ''
	};
}

/** PlanningGrowPreview */
export async function growPreview(event: RequestEvent): Promise<{ vm: GrowViewModel }> {
	const vm = await loadGrowViewModel(event);
	vm.draft = parseGrowForm(await event.request.formData());
	const parsed = growRequest(vm.draft);
	if (!parsed.ok) {
		vm.error = parsed.error;
		return { vm };
	}
	try {
		const response = await apiJSON<GrowthProjectionResponse>(
			event,
			'POST',
			planningBase + '/projection',
			parsed.request
		);
		vm.result = growResultViewModel(response, vm.draft, vm.currency);
		vm.chart = growChart(response);
	} catch (err) {
		vm.error = portfolioAPIErrorMessage(err, 'Could not run the projection.');
	}
	return { vm };
}

/** loadRetireViewModel */
export async function loadRetireViewModel(event: RequestEvent): Promise<RetireViewModel> {
	const vm: RetireViewModel = {
		draft: defaultRetireDraft(),
		currency: 'EUR',
		prefilledCost: false,
		prefilledValue: false,
		prefilledHousing: false,
		noBudget: false,
		result: null,
		chart: null,
		error: '',
		notice: ''
	};
	let prefill: PlanningPrefill;
	try {
		prefill = await apiJSON<PlanningPrefill>(event, 'GET', planningBase + '/prefill');
	} catch {
		return vm;
	}
	if (prefill.currency) vm.currency = prefill.currency;
	if (prefill.monthlyCostOfLife != null && prefill.monthlyCostOfLife > 0) {
		vm.draft.monthlyCost = formatRoundedAmount(prefill.monthlyCostOfLife);
		vm.prefilledCost = true;
	} else {
		// No budget means an unknown cost of life, not a cost of life of zero.
		vm.noBudget = true;
	}
	if (prefill.monthlyHousing != null && prefill.monthlyHousing > 0) {
		vm.draft.monthlyHousing = formatRoundedAmount(prefill.monthlyHousing);
		vm.prefilledHousing = true;
	}
	if (prefill.hasPortfolio && prefill.portfolioValue > 0) {
		vm.draft.initialAmount = formatRoundedAmount(prefill.portfolioValue);
		vm.prefilledValue = true;
	}
	if (prefill.suggestedRetirementAge != null)
		vm.draft.retirementAge = String(prefill.suggestedRetirementAge);
	return vm;
}

function parseRetireForm(form: FormData): RetireDraft {
	return {
		currentAge: formValue(form, 'currentAge'),
		retirementAge: formValue(form, 'retirementAge'),
		longevityAge: formValue(form, 'longevityAge'),
		monthlyCost: formValue(form, 'monthlyCost'),
		monthlyHousing: formValue(form, 'monthlyHousing'),
		housingEndsAtAge: formValue(form, 'housingEndsAtAge'),
		monthlyOther: formValue(form, 'monthlyOther'),
		inflationPercent: formValue(form, 'inflationPercent'),
		withdrawalRate: formValue(form, 'withdrawalRate'),
		returnPercent: formValue(form, 'returnPercent'),
		initialAmount: formValue(form, 'initialAmount'),
		monthlyContribution: formValue(form, 'monthlyContribution')
	};
}

/** PlanningRetirePreview */
export async function retirePreview(event: RequestEvent): Promise<{ vm: RetireViewModel }> {
	const vm = await loadRetireViewModel(event);
	vm.draft = parseRetireForm(await event.request.formData());
	const parsed = retireRequest(vm.draft);
	if (!parsed.ok) {
		vm.error = parsed.error;
		return { vm };
	}
	try {
		const response = await apiJSON<RetirementPlanningResponse>(
			event,
			'POST',
			planningBase + '/retirement',
			parsed.request
		);
		vm.result = retireResultViewModel(response, vm.currency);
		vm.chart = retireChart(response);
	} catch (err) {
		vm.error = portfolioAPIErrorMessage(err, 'Could not check the plan.');
	}
	return { vm };
}
