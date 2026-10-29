// Port of norviq-web internal/pages/planning/viewmodel.go plus the pure
// view-model builders from internal/handlers/planning.go and
// planning_retire.go. Client-safe: no server imports.
import { formatFloat, formatWithCommas, goRound } from '#lib/format.js';
import {
	isOnTrack,
	type GrowthProjectionRequest,
	type GrowthProjectionResponse,
	type PlanLever,
	type RetirementNeed,
	type RetirementPlanningRequest,
	type RetirementPlanningResponse
} from './types.js';

// ---------------------------------------------------------------------------
// Go parsing primitives

const floatPattern = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** strconv.ParseFloat for the decimal forms a number input sends; null on error. */
export function goParseFloat(raw: string): number | null {
	if (!floatPattern.test(raw)) return null;
	const value = Number(raw);
	return Number.isFinite(value) ? value : null;
}

/** strconv.Atoi; null on error. */
export function goAtoi(raw: string): number | null {
	if (!/^[+-]?\d+$/.test(raw)) return null;
	const value = Number(raw);
	return Number.isSafeInteger(value) ? value : null;
}

const emptyAsZero = (raw: string) => (raw === '' ? '0' : raw);

class DraftError extends Error {}

function parseAmount(raw: string, label: string): number {
	const value = goParseFloat(emptyAsZero(raw));
	if (value === null || value < 0) throw new DraftError(`${label} must be a number of zero or more.`);
	return value;
}

/** parsePercent converts what the user typed (7) into what the API wants (0.07). */
function parsePercent(raw: string, label: string): number {
	const value = goParseFloat(emptyAsZero(raw));
	if (value === null || value <= -100 || value > 100) throw new DraftError(`${label} must be a percentage greater than -100.`);
	return value / 100;
}

function parseAge(raw: string, label: string): number {
	const value = goAtoi(raw);
	if (value === null || value < 0 || value > 120) throw new DraftError(`${label} must be a whole number between 0 and 120.`);
	return value;
}

type Parsed<T> = { ok: true; request: T } | { ok: false; error: string };

function attempt<T>(build: () => T): Parsed<T> {
	try {
		return { ok: true, request: build() };
	} catch (err) {
		if (err instanceof DraftError) return { ok: false, error: err.message };
		throw err;
	}
}

// ---------------------------------------------------------------------------
// Shared formatting (handlers package)

/** handlers.formatBudgetCurrency: symbol + formatWithCommas of the magnitude. */
export function formatBudgetCurrency(value: number, code: string): string {
	const upper = (code ?? '').toUpperCase();
	const symbol = ({ USD: '$', EUR: '€', GBP: '£', JPY: '¥' } as Record<string, string>)[upper] || upper + ' ';
	return symbol + formatWithCommas(Math.abs(value));
}

/** handlers.formatRoundedAmount */
export const formatRoundedAmount = (value: number) => formatFloat(goRound(value), 0);

/**
 * handlers.formatRate: a fraction as a percentage, rounded first because
 * 0.07*100 is 7.000000000000001 in binary floating point.
 */
export function formatRate(rate: number): string {
	const scaled = goRound(rate * 100 * 100) / 100;
	return formatFloat(scaled, -1) + '%';
}

/** A chart's data; the page builds the multiSeriesLine spec in the browser. */
export interface ChartData {
	id: string;
	labels: string[];
	series: { name: string; values: number[] }[];
}

// ---------------------------------------------------------------------------
// Grow

/** GrowDraft: percentages as the user typed them (7 for 7%). */
export interface GrowDraft {
	initialAmount: string;
	monthlyContribution: string;
	years: string;
	returnPercent: string;
	contributionGrowth: string;
	inflationPercent: string;
	adjustForInflation: boolean;
}

/** DefaultGrowDraft: 7% nominal, 2% inflation. */
export const defaultGrowDraft = (): GrowDraft => ({
	initialAmount: '10000',
	monthlyContribution: '400',
	years: '20',
	returnPercent: '7',
	contributionGrowth: '0',
	inflationPercent: '2',
	adjustForInflation: false
});

export interface GrowYearRow {
	year: string;
	contributed: string;
	balance: string;
	growth: string;
}

export interface SensitivityRow {
	rate: string;
	endingValue: string;
	isBase: boolean;
}

export interface GrowResult {
	endingValue: string;
	endingValueReal: string;
	totalContributed: string;
	totalGrowth: string;
	growthShare: string;
	years: GrowYearRow[];
	sensitivity: SensitivityRow[];
	notes: string[];
	showReal: boolean;
}

export interface GrowViewModel {
	draft: GrowDraft;
	currency: string;
	prefilled: boolean;
	result: GrowResult | null;
	chart: ChartData | null;
	error: string;
	notice: string;
}

/** GrowDraft.ToRequest */
export function growRequest(d: GrowDraft): Parsed<GrowthProjectionRequest> {
	return attempt(() => {
		const initial = parseAmount(d.initialAmount, 'Initial amount');
		const monthly = parseAmount(d.monthlyContribution, 'Monthly contribution');
		const years = goAtoi(emptyAsZero(d.years));
		if (years === null || years < 0 || years > 100) throw new DraftError('Years must be a whole number between 0 and 100.');
		const returnRate = parsePercent(d.returnPercent, 'Expected return');
		const growth = parsePercent(d.contributionGrowth, 'Contribution increase');
		const inflation = parsePercent(d.inflationPercent, 'Inflation');
		return {
			assumptions: {
				initialAmount: initial,
				monthlyContribution: monthly,
				annualReturnRate: returnRate,
				annualContributionGrowthRate: growth,
				annualInflationRate: inflation,
				years
			}
		};
	});
}

/** growPrefillHint */
export const growPrefillHint = (vm: Pick<GrowViewModel, 'prefilled'>) => (vm.prefilled ? 'Taken from your portfolio. Change it freely.' : '');

/** growHorizonLabel */
export function growHorizonLabel(vm: Pick<GrowViewModel, 'result' | 'draft'>): string {
	if (!vm.result) return '';
	const years = vm.draft.years;
	if (years === '' || years === '0') return 'Today';
	if (years === '1') return 'After 1 year';
	return 'After ' + years + ' years';
}

/** handlers.growResultViewModel */
export function growResultViewModel(response: GrowthProjectionResponse, draft: GrowDraft, currency: string): GrowResult {
	const result = response.result;
	let growthShare = 0;
	if (result.endingValueNominal > 0) growthShare = (result.totalGrowth / result.endingValueNominal) * 100;
	const base = result.assumptions?.annualReturnRate ?? 0;
	return {
		endingValue: formatBudgetCurrency(result.endingValueNominal, currency),
		endingValueReal: formatBudgetCurrency(result.endingValueReal, currency),
		totalContributed: formatBudgetCurrency(result.totalContributed, currency),
		totalGrowth: formatBudgetCurrency(result.totalGrowth, currency),
		growthShare: formatFloat(goRound(growthShare), 0) + '%',
		years: (result.years ?? []).map((year) => ({
			year: String(year.yearIndex),
			contributed: formatBudgetCurrency(year.contributedThisYear, currency),
			balance: formatBudgetCurrency(year.endingBalanceNominal, currency),
			growth: formatBudgetCurrency(year.growthToDate, currency)
		})),
		sensitivity: (response.sensitivity ?? []).map((point) => ({
			rate: formatRate(point.annualReturnRate),
			endingValue: formatBudgetCurrency(point.endingValueNominal, currency),
			isBase: Math.abs(point.annualReturnRate - base) < 1e-9
		})),
		notes: response.assumptionNotes ?? [],
		showReal: draft.adjustForInflation
	};
}

/** handlers.growChart: nominal against today's money, plus what went in. */
export function growChart(response: GrowthProjectionResponse): ChartData | null {
	const years = response.result.years ?? [];
	if (years.length < 2) return null;
	return {
		id: 'planning-grow-chart',
		labels: years.map((y) => String(y.yearIndex)),
		series: [
			{ name: 'Projected', values: years.map((y) => y.endingBalanceNominal) },
			{ name: "In today's money", values: years.map((y) => y.endingBalanceReal) },
			{ name: 'What you put in', values: years.map((y) => y.cumulativeContributions) }
		]
	};
}

// ---------------------------------------------------------------------------
// Retire

/** RetireDraft: ages are whole numbers; money is monthly and in today's terms. */
export interface RetireDraft {
	currentAge: string;
	retirementAge: string;
	longevityAge: string;
	monthlyCost: string;
	monthlyHousing: string;
	housingEndsAtAge: string;
	monthlyOther: string;
	inflationPercent: string;
	withdrawalRate: string;
	returnPercent: string;
	initialAmount: string;
	monthlyContribution: string;
}

/** DefaultRetireDraft: 7% nominal, 2% inflation, 4% withdrawal, plan to 90. */
export const defaultRetireDraft = (): RetireDraft => ({
	currentAge: '40',
	retirementAge: '60',
	longevityAge: '90',
	monthlyCost: '2800',
	monthlyHousing: '0',
	housingEndsAtAge: '',
	monthlyOther: '0',
	inflationPercent: '2',
	withdrawalRate: '4',
	returnPercent: '7',
	initialAmount: '10000',
	monthlyContribution: '400'
});

export interface LeverRow {
	label: string;
	detail: string;
}

export interface DepletionRow {
	age: string;
	spending: string;
	balance: string;
}

/** RetireResult: tone is "positive" / "negative" / "" so the template never decides severity. */
export interface RetireResult {
	needHeadline: string;
	willHave: string;
	gap: string;
	gapTone: 'positive' | 'negative' | '';
	verdict: string;
	annualSpending: string;
	runwayYears: string;
	shortfallAge: string;
	probability: string;
	levers: LeverRow[];
	depletion: DepletionRow[];
	notes: string[];
	onTrack: boolean;
}

export interface RetireViewModel {
	draft: RetireDraft;
	currency: string;
	prefilledCost: boolean;
	prefilledValue: boolean;
	prefilledHousing: boolean;
	noBudget: boolean;
	result: RetireResult | null;
	chart: ChartData | null;
	error: string;
	notice: string;
}

/** RetireDraft.ToRequest */
export function retireRequest(d: RetireDraft): Parsed<RetirementPlanningRequest> {
	return attempt(() => {
		const currentAge = parseAge(d.currentAge, 'Current age');
		const retirementAge = parseAge(d.retirementAge, 'Retirement age');
		const longevityAge = parseAge(d.longevityAge, 'Plan-to age');
		if (retirementAge <= currentAge) throw new DraftError('Retirement age must be after your current age.');
		if (longevityAge <= retirementAge) throw new DraftError('Plan-to age must be after your retirement age.');

		const monthlyCost = parseAmount(d.monthlyCost, 'Monthly cost of life');
		const monthlyHousing = parseAmount(d.monthlyHousing, 'Housing');
		if (monthlyHousing > monthlyCost)
			throw new DraftError('Housing cannot be more than your total cost of life — it is part of it, not on top of it.');
		const monthlyOther = parseAmount(d.monthlyOther, 'Other retirement income');
		const initial = parseAmount(d.initialAmount, 'Invested today');
		const monthlyContribution = parseAmount(d.monthlyContribution, 'Monthly contribution');

		const inflation = parsePercent(d.inflationPercent, 'Inflation');
		const withdrawal = parsePercent(d.withdrawalRate, 'Withdrawal rate');
		if (withdrawal <= 0 || withdrawal > 0.2) throw new DraftError('Withdrawal rate must be between 0% and 20%.');
		const returnRate = parsePercent(d.returnPercent, 'Expected return');

		let housingEnds: number | undefined;
		if (d.housingEndsAtAge !== '') housingEnds = parseAge(d.housingEndsAtAge, 'Housing ends at age');

		return {
			need: {
				currentAge,
				retirementAge,
				longevityAge,
				monthlyCostOfLifeToday: monthlyCost,
				monthlyHousingToday: monthlyHousing,
				...(housingEnds !== undefined ? { housingEndsAtAge: housingEnds } : {}),
				monthlyOtherIncomeAtRetirement: monthlyOther,
				annualInflationRate: inflation,
				withdrawalRate: withdrawal,
				expectedAnnualReturn: returnRate
			},
			plan: {
				initialAmount: initial,
				monthlyContribution,
				annualReturnRate: returnRate,
				annualContributionGrowthRate: 0,
				annualInflationRate: inflation,
				years: retirementAge - currentAge
			}
		};
	});
}

/** retireCostHint */
export const retireCostHint = (vm: Pick<RetireViewModel, 'prefilledCost'>) =>
	vm.prefilledCost ? 'Taken from your budget. Change it freely.' : 'What a month costs you today, including housing.';

/** retireValueHint */
export const retireValueHint = (vm: Pick<RetireViewModel, 'prefilledValue'>) => (vm.prefilledValue ? 'Taken from your portfolio.' : '');

const hasShortfall = (need: RetirementNeed) => need.shortfallAge !== undefined && need.shortfallAge !== null;

/**
 * gapTone: amber is the case worth having (target missed, money still lasts),
 * which renders as no tone at all.
 */
export function gapTone(lever: PlanLever, need: RetirementNeed): RetireResult['gapTone'] {
	if (isOnTrack(lever)) return 'positive';
	if (!hasShortfall(need)) return '';
	return 'negative';
}

/** retireVerdict */
export function retireVerdict(lever: PlanLever, need: RetirementNeed): string {
	if (isOnTrack(lever)) return 'Your plan covers this';
	if (!hasShortfall(need)) return 'Short of the target, but the money still lasts';
	return 'Short, and the money runs out';
}

/** retireDelayLabel */
export const retireDelayLabel = (years: number) => (years === 1 ? 'Retire 1 year later' : `Retire ${years} years later`);

/** leverRows: the solved gap as sentences a person can act on. */
export function leverRows(lever: PlanLever, currency: string): LeverRow[] {
	if (isOnTrack(lever)) return [];
	const rows: LeverRow[] = [];
	if (lever.additionalMonthlyContribution != null && lever.additionalMonthlyContribution > 0) {
		rows.push({
			label: '+' + formatBudgetCurrency(lever.additionalMonthlyContribution, currency) + ' a month',
			detail: 'on top of what you already put away'
		});
	}
	if (lever.delayYears != null && lever.delayYears > 0) {
		rows.push({ label: retireDelayLabel(lever.delayYears), detail: 'more years of saving, and fewer to fund' });
	}
	if (lever.spendingReductionMonthly != null && lever.spendingReductionMonthly > 0) {
		rows.push({
			label: '-' + formatBudgetCurrency(lever.spendingReductionMonthly, currency) + ' a month',
			detail: "spending less, in today's money"
		});
	}
	return rows;
}

/** handlers.retireResultViewModel */
export function retireResultViewModel(response: RetirementPlanningResponse, currency: string): RetireResult {
	const need = response.need;
	const lever = response.lever;
	return {
		needHeadline: formatBudgetCurrency(need.nestEggAtWithdrawalRate, currency),
		willHave: formatBudgetCurrency(response.projectedPortfolioAtRetirement, currency),
		gap: formatBudgetCurrency(Math.abs(lever.gap), currency),
		gapTone: gapTone(lever, need),
		verdict: retireVerdict(lever, need),
		annualSpending: formatBudgetCurrency(need.annualSpendingAtRetirement, currency),
		runwayYears: String(need.runwayYears),
		shortfallAge: hasShortfall(need) ? String(need.shortfallAge) : '',
		probability:
			response.readinessProbability != null ? formatFloat(goRound(response.readinessProbability * 100), 0) + '%' : '',
		levers: leverRows(lever, currency),
		depletion: (need.depletion ?? []).map((year) => ({
			age: String(year.age),
			spending: formatBudgetCurrency(year.annualSpending, currency),
			balance: formatBudgetCurrency(year.endingBalance, currency)
		})),
		notes: response.assumptionNotes ?? [],
		onTrack: isOnTrack(lever)
	};
}

/** handlers.retireChart: the money running down against the spending it funds. */
export function retireChart(response: RetirementPlanningResponse): ChartData | null {
	const depletion = response.need.depletion ?? [];
	if (depletion.length < 2) return null;
	return {
		id: 'planning-retire-chart',
		labels: depletion.map((y) => String(y.age)),
		series: [
			{ name: 'What is left', values: depletion.map((y) => y.endingBalance) },
			{ name: 'Spending that year', values: depletion.map((y) => y.annualSpending) }
		]
	};
}
