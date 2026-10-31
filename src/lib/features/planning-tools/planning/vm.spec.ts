// Ports of norviq-web internal/pages/planning/{grow,retire}_test.go and
// internal/handlers/planning_test.go (the view-model parts).
import { describe, expect, it } from 'vitest';
import {
	defaultGrowDraft,
	defaultRetireDraft,
	formatRate,
	gapTone,
	growHorizonLabel,
	growPrefillHint,
	growRequest,
	growResultViewModel,
	leverRows,
	retireDelayLabel,
	retireRequest,
	retireResultViewModel,
	retireVerdict,
	type GrowDraft,
	type GrowResult
} from './vm.js';
import type { RetirementNeed } from './types.js';

const blankGrow = (over: Partial<GrowDraft>): GrowDraft => ({
	initialAmount: '',
	monthlyContribution: '',
	years: '',
	returnPercent: '',
	contributionGrowth: '',
	inflationPercent: '',
	adjustForInflation: false,
	...over
});

const need = (over: Partial<RetirementNeed> = {}): RetirementNeed => ({
	annualSpendingAtRetirement: 0,
	nestEggAtWithdrawalRate: 0,
	depletion: [],
	runwayYears: 0,
	endingBalance: 0,
	...over
});

const okRequest = <T>(parsed: { ok: true; request: T } | { ok: false; error: string }): T => {
	if (!parsed.ok) throw new Error(parsed.error);
	return parsed.request;
};

describe('grow draft', () => {
	it('uses defensible defaults', () => {
		const draft = defaultGrowDraft();
		expect(draft.returnPercent).toBe('7');
		expect(draft.inflationPercent).toBe('2');
		expect(draft.adjustForInflation).toBe(false);
	});

	it('converts percentages to fractions', () => {
		const r = okRequest(
			growRequest(
				blankGrow({
					initialAmount: '10000',
					monthlyContribution: '400',
					years: '20',
					returnPercent: '7',
					contributionGrowth: '3',
					inflationPercent: '2.5'
				})
			)
		);
		expect(r.assumptions.annualReturnRate).toBeCloseTo(0.07, 9);
		expect(r.assumptions.annualContributionGrowthRate).toBeCloseTo(0.03, 9);
		expect(r.assumptions.annualInflationRate).toBeCloseTo(0.025, 9);
		expect(r.assumptions.initialAmount).toBe(10000);
		expect(r.assumptions.monthlyContribution).toBe(400);
		expect(r.assumptions.years).toBe(20);
	});

	it('treats blank numbers as zero rather than rejecting them', () => {
		const r = okRequest(growRequest(blankGrow({ years: '10', returnPercent: '7' })));
		expect(r.assumptions.initialAmount).toBe(0);
		expect(r.assumptions.monthlyContribution).toBe(0);
	});

	it.each([
		['negative amount', blankGrow({ initialAmount: '-5', years: '10', returnPercent: '7' })],
		['absurd horizon', blankGrow({ years: '500', returnPercent: '7' })],
		['unparseable', blankGrow({ years: 'soon', returnPercent: '7' })]
	])('rejects %s with a readable message', (_, draft) => {
		const parsed = growRequest(draft);
		expect(parsed.ok).toBe(false);
		if (!parsed.ok) expect(parsed.error).not.toBe('');
	});

	it('reads the horizon naturally', () => {
		const result = {} as GrowResult;
		expect(growHorizonLabel({ result: null, draft: blankGrow({}) })).toBe('');
		expect(growHorizonLabel({ result, draft: blankGrow({ years: '0' }) })).toBe('Today');
		expect(growHorizonLabel({ result, draft: blankGrow({ years: '1' }) })).toBe('After 1 year');
		expect(growHorizonLabel({ result, draft: blankGrow({ years: '20' }) })).toBe('After 20 years');
	});

	it('only hints at a prefill when something was prefilled', () => {
		expect(growPrefillHint({ prefilled: false })).toBe('');
		expect(growPrefillHint({ prefilled: true })).not.toBe('');
	});
});

describe('retire draft', () => {
	it('builds both sides of the request', () => {
		const r = okRequest(retireRequest(defaultRetireDraft()));
		expect(r.need.currentAge).toBe(40);
		expect(r.need.retirementAge).toBe(60);
		expect(r.need.monthlyCostOfLifeToday).toBe(2800);
		expect(r.need.withdrawalRate).toBeCloseTo(0.04, 9);
		expect(r.need.annualInflationRate).toBeCloseTo(0.02, 9);
		expect(r.plan.years).toBe(20);
		expect(r.plan.annualReturnRate).toBeCloseTo(0.07, 9);
	});

	it('treats housing-ends-at-age as optional', () => {
		const draft = defaultRetireDraft();
		expect(okRequest(retireRequest(draft)).need.housingEndsAtAge).toBeUndefined();
		draft.housingEndsAtAge = '65';
		expect(okRequest(retireRequest(draft)).need.housingEndsAtAge).toBe(65);
	});

	it('does not let housing exceed the cost of life', () => {
		const draft = { ...defaultRetireDraft(), monthlyCost: '1000', monthlyHousing: '1500' };
		const parsed = retireRequest(draft);
		expect(parsed.ok).toBe(false);
		if (!parsed.ok) expect(parsed.error).toContain('part of it');
	});

	it.each([
		['retiring before today', { retirementAge: '30' }],
		['planning to before retiring', { longevityAge: '50' }]
	])('requires ages to form a timeline: %s', (_, over) => {
		expect(retireRequest({ ...defaultRetireDraft(), ...over }).ok).toBe(false);
	});

	it('bounds the withdrawal rate', () => {
		expect(retireRequest({ ...defaultRetireDraft(), withdrawalRate: '0' }).ok).toBe(false);
		expect(retireRequest({ ...defaultRetireDraft(), withdrawalRate: '50' }).ok).toBe(false);
	});
});

describe('retire result', () => {
	it('names every available move', () => {
		const rows = leverRows(
			{
				gap: 230000,
				additionalMonthlyContribution: 185,
				delayYears: 3,
				spendingReductionMonthly: 120
			},
			'EUR'
		);
		expect(rows.map((r) => r.label)).toEqual([
			'+€185 a month',
			'Retire 3 years later',
			'-€120 a month'
		]);
	});

	it('has no levers when on track', () => {
		expect(leverRows({ gap: -1000 }, 'EUR')).toEqual([]);
	});

	it('skips moves that were not solved', () => {
		const rows = leverRows(
			{
				gap: 5000,
				additionalMonthlyContribution: 90,
				delayYears: null,
				spendingReductionMonthly: 0
			},
			'EUR'
		);
		expect(rows.map((r) => r.label)).toEqual(['+€90 a month']);
	});

	it('reads the delay naturally for a single year', () => {
		expect(retireDelayLabel(1)).toBe('Retire 1 year later');
		expect(retireDelayLabel(4)).toBe('Retire 4 years later');
	});

	it('distinguishes missing the target from running out', () => {
		expect(gapTone({ gap: -1 }, need())).toBe('positive');
		expect(gapTone({ gap: 1000 }, need())).toBe('');
		expect(gapTone({ gap: 1000 }, need({ shortfallAge: 81 }))).toBe('negative');
	});

	it('matches the verdict to the tone', () => {
		expect(retireVerdict({ gap: -1 }, need())).toBe('Your plan covers this');
		expect(retireVerdict({ gap: 1 }, need())).toBe(
			'Short of the target, but the money still lasts'
		);
		expect(retireVerdict({ gap: 1 }, need({ shortfallAge: 81 }))).toBe(
			'Short, and the money runs out'
		);
	});

	it('carries the probability as a whole percent', () => {
		const vm = retireResultViewModel(
			{
				need: need({ nestEggAtWithdrawalRate: 840000, runwayYears: 21, shortfallAge: 81 }),
				lever: { gap: 230000, additionalMonthlyContribution: 185 },
				projection: {} as never,
				projectedPortfolioAtRetirement: 610000,
				readinessProbability: 0.6234,
				assumptionNotes: null
			},
			'EUR'
		);
		expect(vm.probability).toBe('62%');
		expect(vm.needHeadline).toBe('€840,000');
		expect(vm.willHave).toBe('€610,000');
		expect(vm.gap).toBe('€230,000');
		expect(vm.shortfallAge).toBe('81');
		expect(vm.onTrack).toBe(false);
	});

	it('omits an absent probability and shows the gap as a magnitude', () => {
		const vm = retireResultViewModel(
			{
				need: need({ nestEggAtWithdrawalRate: 100 }),
				lever: { gap: -25000 },
				projection: {} as never,
				projectedPortfolioAtRetirement: 0,
				assumptionNotes: null
			},
			'EUR'
		);
		expect(vm.probability).toBe('');
		expect(vm.onTrack).toBe(true);
		expect(vm.gap).toBe('€25,000');
		expect(vm.gapTone).toBe('positive');
	});
});

describe('grow result', () => {
	it('reports the growth share and marks the base rate', () => {
		const result = growResultViewModel(
			{
				result: {
					assumptions: {
						annualReturnRate: 0.07,
						initialAmount: 0,
						monthlyContribution: 0,
						annualContributionGrowthRate: 0,
						annualInflationRate: 0,
						years: 0
					},
					years: null,
					endingValueNominal: 241711,
					endingValueReal: 162700,
					totalContributed: 106000,
					totalGrowth: 135711
				},
				sensitivity: [
					{ annualReturnRate: 0.05, endingValueNominal: 196000, endingValueReal: 0 },
					{ annualReturnRate: 0.07, endingValueNominal: 241711, endingValueReal: 0 }
				],
				assumptionNotes: null
			},
			defaultGrowDraft(),
			'EUR'
		);
		expect(result.growthShare).toBe('56%');
		expect(result.sensitivity[0].isBase).toBe(false);
		expect(result.sensitivity[1].isBase).toBe(true);
	});

	it('drops trailing zeroes from rates', () => {
		expect(formatRate(0.07)).toBe('7%');
		expect(formatRate(0.075)).toBe('7.5%');
	});
});
