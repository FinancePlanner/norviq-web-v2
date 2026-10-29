// Server half of the /scenarios port: norviq-web internal/handlers/scenarios.go
// form parsing and internal/api/service.go FetchScenarioWorkspace.
import { json, text, type RequestEvent } from '@sveltejs/kit';
import { apiJSON } from '#lib/server/api.js';
import { requireFeature } from '#lib/server/guards.js';
import { Feature } from '#lib/billing.js';
import { uid } from './view.js';
import type {
	FormErrorResponse,
	HoldingRiskProfile,
	ScenarioCatalog,
	ScenarioDefinition,
	ScenarioJSON,
	ScenarioRun,
	ScenarioWorkspace
} from './types.js';

/** server.go: every /scenarios route sits behind RequireFeature(FeatureScenarioPlanning, "Scenario planning"). */
export const requireScenarioPlanning = (event: RequestEvent) =>
	requireFeature(event, Feature.ScenarioPlanning, 'Scenario planning');

/** h.scenarioFormError: 422 with the FormErrorBanner message (rendered by the page). */
export const formError = (message: string) => json({ formError: message } satisfies FormErrorResponse, { status: 422 });

/** http.Error(w, message, status). */
export const httpError = (message: string, status: number) => text(message + '\n', { status });

/** h.scenarioMutationRedirect: HX-Redirect /scenarios with 204. The page navigates. */
export const mutationRedirect = () => json({ redirect: '/scenarios' });

/** r.FormValue(name): the first value, or "". */
export function formValue(form: FormData, name: string): string {
	const value = form.get(name);
	return typeof value === 'string' ? value : '';
}

const UUID = /^(urn:uuid:)?\{?[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}\}?$/i;

/** uuid.Parse; returns the canonical lower-case form, or null. */
export function parseUUID(raw: string): string | null {
	if (!UUID.test(raw)) return null;
	const hex = raw.replace(/^urn:uuid:/i, '').replace(/[{}-]/g, '').toLowerCase();
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const DECIMAL = /^[+-]?(\d+(_\d+)*\.?(\d+(_\d+)*)?|\.\d+(_\d+)*)([eE][+-]?\d+)?$/;
const SPECIAL = /^[+-]?(inf|infinity|nan)$/i;

/** strconv.ParseFloat(s, 64): NaN when s is not a float literal. */
export function goParseFloat(raw: string): number {
	if (SPECIAL.test(raw)) {
		if (/nan/i.test(raw)) return NaN;
		return raw.startsWith('-') ? -Infinity : Infinity;
	}
	if (!DECIMAL.test(raw)) return NaN;
	return Number(raw.replaceAll('_', ''));
}

/** parseBoundedFloat: trims, parses, and rejects values outside [min, max] (NaN passes, as in Go). */
export function parseBoundedFloat(value: string, minimum: number, maximum: number): number {
	const trimmed = value.trim();
	if (trimmed === '') throw new Error('out of range');
	const parsed = goParseFloat(trimmed);
	if (Number.isNaN(parsed) && !SPECIAL.test(trimmed)) throw new Error('out of range');
	if (parsed < minimum || parsed > maximum) throw new Error('out of range');
	return parsed;
}

export function optionalBoundedFloat(value: string, minimum: number, maximum: number): number | null {
	if (value.trim() === '') return null;
	return parseBoundedFloat(value, minimum, maximum);
}

/** strconv.ParseInt(s, 10, 64). */
export function parseInt64(raw: string): number | null {
	if (!/^[+-]?\d+$/.test(raw)) return null;
	const big = BigInt(raw);
	if (big > 9223372036854775807n || big < -9223372036854775808n) return null;
	return Number(big);
}

export function scenarioOptionalString(value: string): string | null {
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

export function defaultString(value: string, fallback: string): string {
	return value.trim() === '' ? fallback : value.trim();
}

const ASSET_CATEGORIES = ['stock', 'etf', 'mutual_fund', 'crypto', 'cash', 'bond', 'real_estate', 'commodity'];
export const scenarioAssetCategory = (value: string) => ASSET_CATEGORIES.includes(value);

/** scenarioCryptoHoldingIDs: de-duplicated, every value must be a UUID. */
export function scenarioCryptoHoldingIDs(form: FormData): string[] | null {
	const ids: string[] = [];
	for (const value of form.getAll('cryptoHoldingId')) {
		const id = typeof value === 'string' ? parseUUID(value) : null;
		if (!id) return null;
		if (!ids.includes(id)) ids.push(id);
	}
	return ids;
}

class ConfigError extends Error {}

function optionalScenarioShock(targetRaw: string, percentageRaw: string, label: string) {
	const target = targetRaw.trim();
	percentageRaw = percentageRaw.trim();
	if (target === '' && percentageRaw === '') return [];
	if (target === '' || percentageRaw === '') throw new ConfigError(`provide both ${label} target and shock`);
	let percentage: number;
	try {
		percentage = parseBoundedFloat(percentageRaw, -100, 100);
	} catch {
		throw new ConfigError(`${label} shock must be between -100% and 100%`);
	}
	return [{ target, percentage: percentage / 100 }];
}

function bounded(form: FormData, name: string, minimum: number, maximum: number, message: string): number {
	try {
		return parseBoundedFloat(formValue(form, name), minimum, maximum);
	} catch {
		throw new ConfigError(message);
	}
}

function parseMultiAssetAssumptions(weightsRaw: string, returnsRaw: string, covarianceRaw: string) {
	weightsRaw = weightsRaw.trim();
	returnsRaw = returnsRaw.trim();
	covarianceRaw = covarianceRaw.trim();
	if (weightsRaw === '' && returnsRaw === '' && covarianceRaw === '') return null;
	if (weightsRaw === '' || returnsRaw === '' || covarianceRaw === '') {
		throw new ConfigError('weights, per-asset returns, and covariance must be provided together');
	}
	const numbers = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === 'number');
	let weights: unknown, returns: unknown, covariance: unknown;
	try {
		weights = JSON.parse(weightsRaw);
		returns = JSON.parse(returnsRaw);
		covariance = JSON.parse(covarianceRaw);
	} catch {
		throw new ConfigError('multi-asset assumptions must be valid JSON arrays');
	}
	// json.Unmarshal into []float64 / [][]float64 accepts null as an empty slice.
	weights = weights === null ? [] : weights;
	returns = returns === null ? [] : returns;
	covariance = covariance === null ? [] : covariance;
	if (
		!numbers(weights) ||
		!numbers(returns) ||
		!Array.isArray(covariance) ||
		!covariance.every((row) => row === null || numbers(row))
	) {
		throw new ConfigError('multi-asset assumptions must be valid JSON arrays');
	}
	const matrix = (covariance as (number[] | null)[]).map((row) => row ?? []);
	const count = weights.length;
	if (count < 2 || count > 50 || returns.length !== count || matrix.length !== count) {
		throw new ConfigError('multi-asset assumption dimensions must match 2 to 50 assets');
	}
	let weightTotal = 0;
	for (let index = 0; index < count; index++) {
		const weight = weights[index];
		if (weight < 0 || weight > 1 || returns[index] < -1 || returns[index] > 10 || matrix[index].length !== count) {
			throw new ConfigError('invalid multi-asset weight, return, or covariance dimension');
		}
		weightTotal += weight;
		matrix[index].forEach((value, column) => {
			if (value < -25 || value > 25 || (index === column && value < 0)) {
				throw new ConfigError('covariance values are outside supported bounds');
			}
		});
	}
	if (weightTotal <= 0) throw new ConfigError('multi-asset weights must sum above zero');
	return { weights, returns, covariance: matrix };
}

/** scenarioConfiguration(r, kind). Throws an Error whose message is shown to the user. */
export function scenarioConfiguration(form: FormData, kind: string): ScenarioJSON {
	switch (kind) {
		case 'historical': {
			const preset = formValue(form, 'historicalPreset').trim();
			if (preset === '') throw new ConfigError('choose a historical event');
			return { catalogId: preset };
		}
		case 'custom': {
			const shock = bounded(form, 'assetClassShock', -100, 100, 'asset-class shock must be between -100% and 100%');
			const horizon = bounded(form, 'customHorizonMonths', 1, 120, 'horizon must be between 1 and 120 months');
			const rateShift = bounded(form, 'rateShiftBps', -5000, 5000, 'rate shift must be between -5,000 and 5,000 basis points');
			const volatilityMultiplier = bounded(form, 'volatilityMultiplier', 0, 10, 'volatility multiplier must be between 0 and 10');
			const assetClass = defaultString(formValue(form, 'assetClassTarget'), 'stock');
			if (!scenarioAssetCategory(assetClass)) throw new ConfigError('choose a supported asset class');
			const holdingShocks = optionalScenarioShock(formValue(form, 'holdingShockTarget'), formValue(form, 'holdingShock'), 'holding');
			const sectorShocks = optionalScenarioShock(formValue(form, 'sectorShockTarget'), formValue(form, 'sectorShock'), 'sector');
			const regionShocks = optionalScenarioShock(formValue(form, 'regionShockTarget'), formValue(form, 'regionShock'), 'region');
			const currencyShocks = optionalScenarioShock(
				formValue(form, 'currencyShockTarget').toUpperCase(),
				formValue(form, 'currencyShock'),
				'currency'
			);
			return {
				holding_shocks: holdingShocks,
				sector_shocks: sectorShocks,
				region_shocks: regionShocks,
				currency_shocks: currencyShocks,
				asset_class_shocks: [{ target: assetClass, percentage: shock / 100 }],
				horizon_months: Math.trunc(horizon),
				recovery: formValue(form, 'recovery'),
				parallel_rate_shift_bps: rateShift,
				volatility_multiplier: volatilityMultiplier
			};
		}
		case 'monte_carlo': {
			const paths = bounded(form, 'paths', 100, 50000, 'paths must be between 100 and 50,000');
			const horizon = bounded(form, 'monteCarloHorizonMonths', 1, 600, 'horizon must be between 1 and 600 months');
			const annualReturn = bounded(form, 'annualReturn', -100, 100, 'annual return must be between -100% and 100%');
			const annualVolatility = bounded(form, 'annualVolatility', 0, 500, 'annual volatility must be between 0% and 500%');
			const inflation = bounded(form, 'inflation', -20, 100, 'inflation must be between -20% and 100%');
			const monthlyContribution = bounded(form, 'monthlyContribution', 0, 1_000_000_000, 'monthly contribution must be zero or greater');
			const contributionGrowth = bounded(form, 'contributionGrowth', -100, 100, 'contribution growth must be between -100% and 100%');
			const degreesOfFreedom = bounded(form, 'degreesOfFreedom', 2.01, 100, 'student-t degrees of freedom must be greater than 2');
			const bootstrapMonths = bounded(form, 'bootstrapBlockMonths', 1, 120, 'bootstrap block length must be between 1 and 120 months');
			const configuration: ScenarioJSON = {
				path_count: Math.trunc(paths),
				horizon_months: Math.trunc(horizon),
				distribution: defaultString(formValue(form, 'distribution'), 'block_bootstrap'),
				annual_return: annualReturn / 100,
				annual_volatility: annualVolatility / 100,
				inflation: inflation / 100,
				monthly_contribution: monthlyContribution,
				annual_contribution_growth: contributionGrowth / 100,
				degrees_of_freedom: degreesOfFreedom,
				bootstrap_block_months: Math.trunc(bootstrapMonths)
			};
			const multi = parseMultiAssetAssumptions(
				formValue(form, 'assetWeights'),
				formValue(form, 'assetAnnualReturns'),
				formValue(form, 'annualCovariance')
			);
			if (multi && multi.weights.length > 0) {
				configuration.asset_weights = multi.weights;
				configuration.asset_annual_returns = multi.returns;
				configuration.annual_covariance = multi.covariance;
			}
			return configuration;
		}
		default:
			throw new ConfigError('choose a scenario type');
	}
}

/** Request form body; a body that is not a form reads as empty (Go's r.FormValue). */
export async function readForm(event: RequestEvent): Promise<FormData> {
	try {
		return await event.request.formData();
	} catch {
		return new FormData();
	}
}

/** CreateScenarioRun accepts 200 or 202; the page then navigates to /scenarios?run=<id>. */
export async function queueRun(event: RequestEvent, scenarioID: string, snapshotID: string, seed: number | null) {
	const input: { snapshotId: string; seed?: number } = { snapshotId: snapshotID };
	if (seed !== null) input.seed = seed;
	return apiJSON<ScenarioRun>(event, 'POST', `/v1/scenarios/${encodeURIComponent(scenarioID)}/runs`, input);
}

export async function createSnapshot(
	event: RequestEvent,
	portfolioID: string,
	form: FormData,
	cryptoHoldingIDs: string[] | undefined
) {
	const input: { portfolioListId: string; baseCurrency: string; cryptoHoldingIds?: string[] } = {
		portfolioListId: portfolioID,
		baseCurrency: defaultString(formValue(form, 'baseCurrency'), 'USD').toUpperCase()
	};
	if (cryptoHoldingIDs) input.cryptoHoldingIds = cryptoHoldingIDs;
	return apiJSON<{ id: string }>(event, 'POST', '/v1/portfolio/scenario-snapshots', input);
}

/** api.Service.FetchScenarioWorkspace: seven reads plus a holdings fan-out; any failure fails the whole workspace. */
export async function fetchScenarioWorkspace(event: RequestEvent): Promise<ScenarioWorkspace> {
	const get = <T>(path: string, query?: Record<string, string>) => apiJSON<T>(event, 'GET', path, undefined, { query });
	const portfoliosAndHoldings = (async () => {
		const portfolios = (await get<{ id: string; name: string }[]>('/v1/portfolio/lists')) ?? [];
		const holdings = await Promise.all(
			portfolios.map(
				async (p) => (await get<{ id: string; symbol: string; category: string }[]>('/v1/stocks', { portfolioListId: uid(p.id) })) ?? []
			)
		);
		return { portfolios, holdings: holdings.flat() };
	})();
	const [catalog, runs, goals, scenarios, riskProfiles, cryptoHoldings, ph] = await Promise.all([
		get<ScenarioCatalog>('/v1/scenarios/catalog'),
		get<ScenarioRun[]>('/v1/scenario-runs'),
		get<{ id: string; name: string }[]>('/v1/financial-goals'),
		get<ScenarioDefinition[]>('/v1/scenarios'),
		get<HoldingRiskProfile[]>('/v1/holding-risk-profiles'),
		get<{ id: string; symbol: string; quantity: number }[]>('/v1/crypto/portfolio'),
		portfoliosAndHoldings
	]);
	if (!catalog || !runs || !goals || !scenarios || !riskProfiles || !cryptoHoldings) {
		throw new Error('scenario workspace: empty response');
	}
	return {
		catalog: { version: catalog.version, historicalScenarios: catalog.historicalScenarios ?? [] },
		runs,
		portfolios: ph.portfolios.map((p) => ({ id: p.id, name: p.name })),
		goals: goals.map((g) => ({ id: g.id, name: g.name })),
		scenarios,
		holdings: ph.holdings.map((h) => ({ id: h.id, symbol: h.symbol, category: h.category })),
		cryptoHoldings: cryptoHoldings.map((c) => ({ id: c.id, symbol: c.symbol, quantity: c.quantity })),
		riskProfiles
	};
}
