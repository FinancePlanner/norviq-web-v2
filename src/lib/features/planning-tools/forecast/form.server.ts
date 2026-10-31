// Server half of the /forecast port: wealth_automation.go forecastRequestFromForm
// and the RequireFeature gate.
import type { RequestEvent } from '@sveltejs/kit';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { goParseFloat } from '../scenarios/form.server.js';
import type { NetWorthForecastUpsertRequest } from './types.js';

export { parseUUID } from '../scenarios/form.server.js';

/** server.go: every /forecast route sits behind RequireFeature(FeatureNetWorthForecasting, "Net worth forecasting"). */
export const requireNetWorthForecasting = (event: RequestEvent) =>
	requireFeature(event, Feature.NetWorthForecasting, 'Net worth forecasting');

const value = (form: FormData, name: string) => {
	const v = form.get(name);
	return typeof v === 'string' ? v : '';
};

/** strconv.Atoi */
function atoi(raw: string): number | null {
	if (!/^[+-]?\d+$/.test(raw)) return null;
	const n = Number(raw);
	return Number.isSafeInteger(n) ? n : null;
}

/** strconv.ParseFloat(strings.TrimSpace(raw)); null on error. */
function parseFloatStrict(raw: string): number | null {
	const n = goParseFloat(raw.trim());
	return Number.isNaN(n) && !/nan/i.test(raw) ? null : n;
}

/** parseOptionalFloat: "" → absent (undefined), invalid → null. */
function parseOptionalFloat(raw: string): number | undefined | null {
	raw = raw.trim();
	if (raw === '') return undefined;
	return parseFloatStrict(raw);
}

export class ForecastFormError extends Error {}

/** forecastRequestFromForm. Throws ForecastFormError with Go's message. */
export function forecastRequestFromForm(form: FormData): NetWorthForecastUpsertRequest {
	const fail = (message: string): never => {
		throw new ForecastFormError(message);
	};
	const name = value(form, 'name').trim();
	if (name === '') fail('name is required');
	const baseCurrency = value(form, 'base_currency').trim().toUpperCase();
	if (new TextEncoder().encode(baseCurrency).length !== 3)
		fail('base currency must be a 3-letter code');
	const horizon = atoi(value(form, 'horizon').trim()) ?? fail('horizon must be a number');
	const pathCount =
		atoi(value(form, 'path_count').trim()) ?? fail('simulation paths must be a number');
	if (horizon < 12 || horizon > 600) fail('horizon must be between 12 and 600 months');
	if (pathCount < 100 || pathCount > 10_000) fail('simulation paths must be between 100 and 10000');
	const income = parseOptionalFloat(value(form, 'income'));
	if (income === null) fail('monthly income must be a number');
	const spending = parseOptionalFloat(value(form, 'spending'));
	if (spending === null) fail('monthly spending must be a number');
	const target = parseOptionalFloat(value(form, 'target'));
	if (target === null) fail('target amount must be a number');
	for (const amount of [income, spending, target]) {
		if (amount != null && amount < 0) fail('amounts cannot be negative');
	}
	const percent = (raw: string) => {
		const n = parseFloatStrict(raw);
		return n === null ? null : n / 100;
	};
	const incomeGrowth =
		percent(value(form, 'income_growth')) ?? fail('income growth must be a number');
	const spendingGrowth =
		percent(value(form, 'spending_growth')) ?? fail('spending growth must be a number');
	const inflation = percent(value(form, 'inflation'));
	if (inflation === null || inflation < 0) fail('inflation must be a non-negative number');
	const body: NetWorthForecastUpsertRequest = {
		name,
		baseCurrency,
		horizonMonths: horizon,
		pathCount,
		annualIncomeGrowth: incomeGrowth,
		annualSpendingGrowth: spendingGrowth,
		inflationAssumption: inflation as number,
		includeCash: value(form, 'cash') === 'on',
		includeCrypto: value(form, 'crypto') === 'on'
	};
	// Nil pointers are omitted from the Go request body.
	if (income != null) body.monthlyIncomeOverride = income;
	if (spending != null) body.monthlySpendingOverride = spending;
	if (target != null) body.targetAmount = target;
	return body;
}
