import { error, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { apiJSON, isAPIError } from '#lib/server/api.js';
import { safeRedirect } from '#lib/helpers.js';
import {
	encodeQuery,
	escapePath,
	formChoice,
	formValue,
	parseFloatGo,
	parseIntGo,
	portfolioAPIErrorMessage,
	type ManagedPortfolio,
	type PortfolioPage,
	type RetirementPlan,
	type RetirementPlanInput,
	type RetirementProjection
} from '#lib/features/portfolio/workspace/api.server.js';

// handlers/retirement.go — GET/POST /portfolio/retirement.

export interface RetirementViewModel {
	portfolio: ManagedPortfolio;
	portfolios: ManagedPortfolio[];
	plan: RetirementPlan;
	projection: RetirementProjection | null;
	notice: string;
	error: string;
}

export type RetirementData =
	| { picker: true; items: ManagedPortfolio[]; errorMessage: string }
	| ({ picker: false } & RetirementViewModel);

function defaultRetirementPlan(item: ManagedPortfolio): RetirementPlan {
	return {
		id: '',
		portfolioId: item.id,
		ruleVersion: '',
		newerRuleVersion: '',
		input: {
			jurisdiction: 'US',
			currency: item.baseCurrency,
			currentAge: 35,
			retirementAge: 65,
			longevityAge: 95,
			annualSalary: 80000,
			annualSalaryGrowthRate: 0,
			desiredAnnualSpending: 50000,
			inflationRate: 0.02,
			expectedAnnualReturn: 0.06,
			annualVolatility: 0.14,
			annualContributionGrowthRate: 0,
			withdrawalStrategy: 'fixed_real_spending',
			accounts: [
				{
					id: 'primary',
					name: 'Retirement portfolio',
					wrapper: 'taxable',
					currentBalance: 0,
					employeeAnnualContribution: 0,
					annualFeeRate: 0
				}
			],
			otherAnnualRetirementIncome: 0
		}
	};
}

async function loadRetirementViewModelFor(event: RequestEvent, id: string): Promise<RetirementViewModel | null> {
	if (id === '') return null;
	let portfolio: ManagedPortfolio;
	try {
		portfolio = await apiJSON<ManagedPortfolio>(event, 'GET', '/v1/portfolios/' + escapePath(id));
	} catch {
		return null;
	}
	const vm: RetirementViewModel = { portfolio, portfolios: [], plan: defaultRetirementPlan(portfolio), projection: null, notice: '', error: '' };
	try {
		vm.plan = await apiJSON<RetirementPlan>(event, 'GET', '/v1/portfolios/' + escapePath(id) + '/retirement-plan');
	} catch (err) {
		if (!(isAPIError(err) && err.status === 404)) vm.error = portfolioAPIErrorMessage(err, 'Could not load retirement plan.');
		vm.plan = defaultRetirementPlan(portfolio);
	}
	return vm;
}

export const load: PageServerLoad = async (event): Promise<RetirementData> => {
	let page: PortfolioPage;
	try {
		page = await apiJSON<PortfolioPage>(event, 'GET', '/v1/portfolios');
	} catch (err) {
		return { picker: true, items: [], errorMessage: portfolioAPIErrorMessage(err, 'Could not load portfolios.') };
	}
	const items = page.items ?? [];
	let id = (event.url.searchParams.get('portfolio') ?? '').trim();
	if (id === '' && items.length > 0) id = items[0].id;
	if (id === '') return { picker: true, items, errorMessage: '' };
	const vm = await loadRetirementViewModelFor(event, id);
	if (!vm) return { picker: true, items, errorMessage: 'Could not load a retirement plan for that portfolio.' };
	vm.portfolios = items;
	vm.notice = event.url.searchParams.get('notice') ?? '';
	vm.error = event.url.searchParams.get('error') ?? '';
	return { picker: false, ...vm };
};

function retirementInputFromForm(form: FormData): RetirementPlanInput {
	const v = (name: string) => formValue(form, name);
	const jurisdiction = formChoice(form.get('jurisdiction'), 'US', 'PT', 'ES', 'DE', 'FR', 'IT');
	const currency = jurisdiction !== 'US' ? 'EUR' : 'USD';
	const pensionAmount = parseFloatGo(v('publicPension'));
	const input: RetirementPlanInput = {
		jurisdiction,
		currency,
		currentAge: parseIntGo(v('currentAge')),
		retirementAge: parseIntGo(v('retirementAge')),
		longevityAge: parseIntGo(v('longevityAge')),
		annualSalary: parseFloatGo(v('annualSalary')),
		annualSalaryGrowthRate: 0,
		desiredAnnualSpending: parseFloatGo(v('desiredSpending')),
		inflationRate: parseFloatGo(v('inflation')) / 100,
		expectedAnnualReturn: parseFloatGo(v('return')) / 100,
		annualVolatility: parseFloatGo(v('volatility')) / 100,
		annualContributionGrowthRate: 0,
		withdrawalStrategy: 'fixed_real_spending',
		accounts: [
			{
				id: 'primary',
				name: 'Retirement portfolio',
				wrapper: 'taxable',
				currentBalance: parseFloatGo(v('balance')),
				employeeAnnualContribution: parseFloatGo(v('contribution')),
				annualFeeRate: parseFloatGo(v('fee')) / 100
			}
		],
		otherAnnualRetirementIncome: 0
	};
	if (pensionAmount > 0) {
		input.publicPension = { annualAmount: pensionAmount, startAge: parseIntGo(v('pensionAge')), annualIndexationRate: 0.02, currency };
	}
	return input;
}

function redirectRetirement(id: string, notice: string, errorMessage: string): never {
	const values: Record<string, string> = { portfolio: id };
	if (notice) values.notice = notice;
	if (errorMessage) values.error = errorMessage;
	safeRedirect(303, '/portfolio/retirement?' + encodeQuery(values));
}

export const actions: Actions = {
	// POST /portfolio/retirement?portfolio={id}
	default: async (event) => {
		let form: FormData;
		try {
			form = await event.request.formData();
		} catch {
			error(400, 'Invalid form submission');
		}
		const id = (event.url.searchParams.get('portfolio') ?? '').trim();
		if (id === '') safeRedirect(303, '/portfolio/retirement');
		const path = '/v1/portfolios/' + escapePath(id) + '/retirement-plan';
		let saved: RetirementPlan;
		try {
			saved = await apiJSON<RetirementPlan>(event, 'PUT', path, { input: retirementInputFromForm(form) });
		} catch (err) {
			redirectRetirement(id, '', portfolioAPIErrorMessage(err, 'Could not save retirement plan.'));
		}
		if (formValue(form, 'intent') !== 'project') redirectRetirement(id, 'Retirement plan saved.', '');
		let projection: RetirementProjection;
		try {
			projection = await apiJSON<RetirementProjection>(event, 'POST', path + '/project', {
				ruleVersion: saved.ruleVersion,
				pathCount: 10000,
				seed: 42
			});
		} catch (err) {
			redirectRetirement(id, '', portfolioAPIErrorMessage(err, 'Could not run projection.'));
		}
		const vm = await loadRetirementViewModelFor(event, id);
		if (!vm) error(502, 'Could not load retirement plan');
		// Go re-renders in place: the saved plan, the projection, a notice — and
		// no portfolio switcher, because vm.Portfolios is not reloaded here.
		return {
			projected: { ...vm, plan: saved, projection, notice: 'Projection updated from your saved assumptions.' } satisfies RetirementViewModel
		};
	}
};
