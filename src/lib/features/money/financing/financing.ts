import type { components } from '#lib/api/schema.js';
import { formatFloat } from '#lib/format.js';

// Port of norviq-web internal/pages/financing/viewmodel.go and the request
// parsing in internal/handlers/expenses_financing.go.

type Schemas = components['schemas'];
export type FinancingSimulationRequest = Schemas['FinancingSimulationRequest'];
export type FinancingPlanRequest = Schemas['FinancingPlanRequest'];

export interface PlanViewModel {
	title: string;
	market: string;
	currency: string;
	monthlyPayment: number;
	termMonths: number;
}

export interface ResultViewModel {
	title: string;
	currency: string;
	monthlyPayment: number;
	totalPaid: number;
	creditCost: number;
	cashFlowStatus: string;
	cashFlowMessage: string;
	benchmarkMessage: string;
	benchmarkStatus: string;
	benchmarkRatio: number | null;
	guidanceMinimum: number | null;
	guidanceMaximum: number | null;
	incomeBasis: string | null;
	/** Every submitted form field, replayed as hidden inputs by the save form. */
	planPayloadFields: [string, string][];
	saved: boolean;
}

/** financing.Money: fmt.Sprintf("%s %.2f", currency, value). */
export function money(value: number, currency: string): string {
	return `${currency} ${formatFloat(value, 2)}`;
}

export function benchmarkTitle(vm: ResultViewModel): string {
	switch (vm.benchmarkStatus) {
		case 'pass':
			return 'Within published guidance';
		case 'above_guidance':
			return 'Above published guidance';
		case 'not_evaluated':
			return 'Ratio shown without a pass/fail threshold';
		default:
			return 'Market guidance';
	}
}

export function showGuidanceBand(vm: ResultViewModel): boolean {
	return vm.guidanceMinimum !== null || vm.guidanceMaximum !== null;
}

export function financingCurrency(market: string): string {
	switch (market) {
		case 'PL':
			return 'PLN';
		case 'BR':
			return 'BRL';
		case 'US':
			return 'USD';
		default:
			return 'EUR';
	}
}

/** strconv.ParseFloat: no surrounding whitespace, no empty string. */
function parseFloatStrict(raw: string): number | null {
	if (raw === '' || raw.trim() !== raw) return null;
	const v = Number(raw);
	return Number.isFinite(v) ? v : null;
}

/** optionalFinancingFloat: blank is "absent" (undefined), junk is an error (null). */
function optionalFloat(raw: string): number | undefined | null {
	const value = raw.trim();
	if (value === '') return undefined;
	return parseFloatStrict(value);
}

function parseDate(raw: string): string | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
	if (!m) return null;
	const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
	if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
	return raw;
}

function emptyResult(title: string): ResultViewModel {
	return {
		title,
		currency: '',
		monthlyPayment: 0,
		totalPaid: 0,
		creditCost: 0,
		cashFlowStatus: '',
		cashFlowMessage: '',
		benchmarkMessage: '',
		benchmarkStatus: '',
		benchmarkRatio: null,
		guidanceMinimum: null,
		guidanceMaximum: null,
		incomeBasis: null,
		planPayloadFields: [],
		saved: false
	};
}

/** financingRequest: returns the view model plus the simulation request when the form is valid. */
export function financingRequest(form: FormData): {
	vm: ResultViewModel;
	request: FinancingSimulationRequest | null;
} {
	const get = (k: string) => {
		const v = form.get(k);
		return typeof v === 'string' ? v : '';
	};
	const vm = emptyResult(get('title').trim());
	const price = parseFloatStrict(get('purchaseAmount'));
	const down = parseFloatStrict(get('downPayment') || '0') ?? 0;
	const termRaw = get('termMonths');
	const term = /^[+-]?\d+$/.test(termRaw) ? Number.parseInt(termRaw, 10) : null;
	const firstDate = parseDate(get('firstPaymentDate'));
	const payment = optionalFloat(get('monthlyPayment'));
	const nominal = optionalFloat(get('nominalRate'));
	const effective = optionalFloat(get('effectiveRate'));
	const market = get('market') as FinancingSimulationRequest['market'];
	const purchaseType = get('purchaseType') as FinancingSimulationRequest['purchaseType'];
	const valid =
		vm.title !== '' &&
		price !== null &&
		price > 0 &&
		term !== null &&
		term > 0 &&
		term <= 480 &&
		firstDate !== null &&
		payment !== null &&
		nominal !== null &&
		(payment !== undefined || nominal !== undefined);
	if (!valid) {
		vm.cashFlowStatus = 'Check the offer terms';
		vm.cashFlowMessage =
			'Enter a title, price, term, first payment date, and either monthly payment or nominal rate.';
		return { vm, request: null };
	}
	const request: FinancingSimulationRequest = {
		market,
		purchaseType,
		currency: financingCurrency(market),
		offers: [
			{
				id: 'web-offer',
				name: vm.title,
				purchaseAmount: price,
				downPayment: down,
				termMonths: term,
				firstPaymentDate: firstDate,
				quotedMonthlyPayment: payment ?? undefined,
				nominalAnnualRate: nominal ?? undefined,
				effectiveAnnualRate: effective ?? undefined,
				rateType: 'fixed',
				upfrontFees: 0,
				financedFees: 0,
				balloonPayment: 0,
				additionalCosts: []
			}
		]
	};
	const seen = new Set<string>();
	for (const [key, value] of form.entries()) {
		if (seen.has(key) || typeof value !== 'string') continue;
		seen.add(key);
		vm.planPayloadFields.push([key, value]);
	}
	return { vm, request };
}
