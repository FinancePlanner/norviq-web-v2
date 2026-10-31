import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { apiFetch, apiJSON, isAPIError } from '#lib/server/api.js';
import { loadBillingContext } from '#lib/server/app-context.js';
import { config } from '#lib/server/env.js';
import { setPostHogCaptureOnce } from '#lib/analytics/runtime.server.js';
import { Feature, isFeatureAvailable, isPro } from '#lib/billing.js';
import {
	appUserID,
	defaultFilingTaxYear,
	filterTaxOpportunities,
	taxOpportunityAssetClasses,
	taxPackCheckoutURL,
	taxRedirectTarget
} from './helpers.js';
import type {
	FilingPackPreviewResponse,
	FilingViewModel,
	TaxActionPlanResponse,
	TaxDashboardResponse,
	TaxLocationScenarioResponse,
	TaxLossCarryforwardLedgerResponse,
	TaxNotificationPreferences,
	TaxPageViewModel,
	TaxProfileContextResponse,
	TaxProfileRequest,
	TaxReportResponse,
	TaxScenarioResponse,
	TaxWorkspace
} from './types.js';

// Port of norviq-web internal/handlers/tax.go. Every POST the Go web mounted
// at its own URL (/tax/profile, /tax/scenarios, …) is a named form action on
// /tax here; the redirects (taxRedirect) and fragment swaps (#tax-workspace)
// behave the same.

const TAX_FEATURE_NAME = 'Tax strategy';

const emptyMoney = { amount: 0, currency: '' };

/** The zero value Go renders when FetchTaxDashboard fails. */
function emptyDashboard(jurisdiction: string, year: number): TaxDashboardResponse {
	return {
		generatedAt: '',
		taxYear: year,
		jurisdiction: jurisdiction as TaxDashboardResponse['jurisdiction'],
		ruleVersion: '',
		isStale: false,
		profileComplete: false,
		summary: {
			realizedEstimatedLiability: emptyMoney,
			embeddedUnrealizedLiability: emptyMoney,
			harvestableLosses: emptyMoney,
			estimatedNetBenefit: emptyMoney,
			shortTermCarryover: emptyMoney,
			longTermCarryover: emptyMoney
		},
		opportunities: [],
		unsupportedValue: emptyMoney,
		assumptions: [],
		disclaimer: ''
	};
}

async function maybe<T>(p: Promise<T>): Promise<T | null> {
	try {
		return (await p) ?? null;
	} catch {
		return null;
	}
}

// GET /tax
export async function loadTaxPage(
	event: RequestEvent,
	isProUser: boolean
): Promise<TaxPageViewModel> {
	const q = event.url.searchParams;
	const jurisdiction = (q.get('jurisdiction') ?? '').trim().toUpperCase() || 'US';
	let year = new Date().getFullYear();
	const parsed = goAtoi(q.get('taxYear'));
	if (parsed !== null && parsed >= 2020 && parsed <= year + 1) year = parsed;
	const query = { jurisdiction, taxYear: year };

	const [dashboardResult, context, carryforwards, notifications, reports, actionPlans] =
		await Promise.all([
			apiJSON<TaxDashboardResponse>(event, 'GET', '/v1/tax/dashboard', undefined, { query }).then(
				(d) => ({ ok: true as const, d }),
				(err) => {
					console.warn('fetch tax dashboard', err);
					return { ok: false as const, d: emptyDashboard(jurisdiction, year) };
				}
			),
			maybe(
				apiJSON<TaxProfileContextResponse>(event, 'GET', '/v1/tax/profile/context', undefined, {
					query
				})
			),
			isProUser && (jurisdiction === 'PT' || jurisdiction === 'DE')
				? maybe(
						apiJSON<TaxLossCarryforwardLedgerResponse>(
							event,
							'GET',
							'/v1/tax/loss-carryforwards',
							undefined,
							{ query }
						)
					)
				: Promise.resolve(null),
			isProUser
				? maybe(apiJSON<TaxNotificationPreferences>(event, 'GET', '/v1/tax/notifications'))
				: Promise.resolve(null),
			maybe(apiJSON<TaxReportResponse[]>(event, 'GET', '/v1/tax/reports')),
			isProUser
				? maybe(apiJSON<TaxActionPlanResponse[]>(event, 'GET', '/v1/tax/action-plans'))
				: Promise.resolve(null)
		]);

	const accountFilter = (q.get('accountId') ?? '').trim();
	const assetFilter = (q.get('assetClass') ?? '').trim().toLowerCase();
	const statusFilter = (q.get('status') ?? '').trim().toLowerCase();
	const dashboard = dashboardResult.d;
	dashboard.opportunities = dashboard.opportunities ?? [];
	const assetClasses = taxOpportunityAssetClasses(dashboard.opportunities);
	dashboard.opportunities = filterTaxOpportunities(
		dashboard.opportunities,
		accountFilter,
		assetFilter,
		statusFilter
	);

	return {
		dashboard,
		context: context ?? {
			jurisdiction: '' as TaxProfileContextResponse['jurisdiction'],
			taxYear: 0,
			defaultReportingCurrency: '',
			accounts: []
		},
		carryforwards,
		notifications: notifications ?? { enabled: false, cooldownDays: 0 },
		reports: reports ?? [],
		actionPlans: actionPlans ?? [],
		jurisdiction,
		taxYear: year,
		isPro: isProUser,
		errorMessage: dashboardResult.ok
			? ''
			: 'Tax estimates are temporarily unavailable. Please try again.',
		accountFilter,
		assetFilter,
		statusFilter,
		assetClasses
	};
}

// GET /tax/filing
export async function loadFilingPage(
	event: RequestEvent,
	isProUser: boolean
): Promise<FilingViewModel> {
	const q = event.url.searchParams;
	const now = new Date();
	const current = now.getFullYear();
	let year = goAtoi(q.get('taxYear')) ?? 0;
	if (year === 0) year = defaultFilingTaxYear(now);
	const vm: FilingViewModel = {
		taxYear: year,
		years: [current, current - 1, current - 2, current - 3],
		provisional: year >= current,
		jurisdiction: (q.get('jurisdiction') ?? '').trim().toUpperCase(),
		isPro: isProUser,
		preview: null,
		profileIncomplete: false,
		unsupported: false,
		errorMessage: '',
		taxPackURL: taxPackCheckoutURL(config(), year, appUserID(event.locals.session.auth?.userId))
	};
	// Ask the backend even for non-Pro sessions: a purchased per-year pack
	// opens the preview without a subscription, and only the backend knows.
	let res: Response;
	try {
		res = await apiFetch(event, 'GET', '/v1/tax/filing/preview', null, {
			query: { taxYear: year }
		});
	} catch {
		vm.errorMessage = 'The filing pack is temporarily unavailable. Please try again.';
		return vm;
	}
	if (res.status === 200) {
		try {
			vm.preview = (await res.json()) as FilingPackPreviewResponse;
			vm.isPro = true;
			if (vm.jurisdiction === '') vm.jurisdiction = vm.preview.jurisdiction;
		} catch {
			vm.errorMessage = 'The filing pack is temporarily unavailable. Please try again.';
		}
	} else if (res.status === 409) {
		vm.profileIncomplete = true;
		vm.isPro = true;
	} else if (res.status === 422) {
		vm.unsupported = true;
		vm.isPro = true;
	} else if (res.status === 402 || res.status === 403) {
		vm.isPro = false;
	} else {
		vm.errorMessage = 'The filing pack is temporarily unavailable. Please try again.';
	}
	return vm;
}

// ---- gates ----

/** middleware.RequireFeature(FeatureTaxOptimization, "Tax strategy") + requireTaxPro. */
async function requireTaxOptimization(event: RequestEvent) {
	const billing = await loadBillingContext(event);
	if (!isFeatureAvailable(billing, Feature.TaxOptimization)) {
		error(402, { message: TAX_FEATURE_NAME, proGate: TAX_FEATURE_NAME });
	}
	return isPro(billing);
}

/** requireTaxPro alone (routes Go mounted without the feature middleware). */
async function taxPro(event: RequestEvent) {
	return isPro(await loadBillingContext(event));
}

const proRequired = () => fail(402, { error: 'Pro subscription required' });

/** Shared by the download +server.ts: feature gate, then the Pro check. */
export async function requireTaxProForEndpoint(event: RequestEvent) {
	if (!(await requireTaxOptimization(event))) error(402, 'Pro subscription required');
}

// ---- parsing helpers (strconv / taxFloat) ----

/** strconv.Atoi: null when it would fail. */
function goAtoi(raw: string | null | undefined): number | null {
	const s = raw ?? '';
	if (!/^[+-]?\d+$/.test(s)) return null;
	return Number.parseInt(s, 10);
}

/** strconv.Atoi with the error ignored (0 on failure). */
const atoi0 = (raw: FormDataEntryValue | null) => goAtoi(typeof raw === 'string' ? raw : '') ?? 0;

/** taxFloat: strconv.ParseFloat(strings.TrimSpace(value), 32). */
function taxFloat(raw: FormDataEntryValue | null): [number, boolean] {
	const s = (typeof raw === 'string' ? raw : '').trim();
	if (s === '' || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$|^[+-]?(inf|infinity)$/i.test(s))
		return [0, false];
	return [Number(/inf/i.test(s) ? (s.startsWith('-') ? -Infinity : Infinity) : s), true];
}

const taxFloatOrZero = (raw: FormDataEntryValue | null) => taxFloat(raw)[0];

function taxPercent(raw: FormDataEntryValue | null): number | undefined {
	const [v, ok] = taxFloat(raw);
	return ok ? v / 100 : undefined;
}

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const isUUID = (s: string) =>
	UUID_RE.test(
		s
			.trim()
			.replace(/^urn:uuid:/i, '')
			.replace(/^\{(.*)\}$/, '$1')
	);

function str(form: FormData, key: string): string {
	const v = form.get(key);
	return typeof v === 'string' ? v : '';
}

function strs(form: FormData, key: string): string[] {
	return form.getAll(key).filter((v): v is string => typeof v === 'string');
}

function taxRedirect(jurisdiction: string, year: number): never {
	redirect(303, taxRedirectTarget(jurisdiction, year));
}

const unprocessable = (message: string) => fail(422, { error: message });
const badRequest = (message: string) => fail(400, { error: message });

// ---- actions ----

// POST /tax/profile
export async function saveProfile(event: RequestEvent) {
	if (!(await requireTaxOptimization(event))) return proRequired();
	const form = await event.request.formData();
	const year = atoi0(form.get('taxYear'));
	const [income, ok] = taxFloat(form.get('income'));
	if (!ok) return unprocessable('Enter taxable income');
	const filing = str(form, 'filingStatus') as TaxProfileRequest['filingStatus'];
	const members: TaxProfileRequest['members'] = [
		{ id: 'primary', displayName: str(form, 'primaryName').trim(), relationship: 'self' }
	];
	if (filing !== 'single') {
		const name = str(form, 'partnerName').trim();
		if (name === '') return unprocessable('Enter spouse or partner');
		members.push({ id: 'partner', displayName: name, relationship: 'partner' });
	}
	const jurisdictionRaw = str(form, 'jurisdiction');
	const accounts: TaxProfileRequest['accounts'] = [];
	for (const rawID of strs(form, 'account_id')) {
		if (!isUUID(rawID)) return unprocessable('Invalid account');
		const owner = str(form, 'owner_' + rawID);
		if (owner !== 'primary' && (owner !== 'partner' || members.length !== 2))
			return unprocessable('Invalid account owner');
		let lotMethod = str(
			form,
			'lot_' + rawID
		) as TaxProfileRequest['accounts'][number]['lotSelectionMethod'];
		if (jurisdictionRaw.toUpperCase() === 'DE') lotMethod = 'fifo';
		accounts.push({
			id: rawID,
			accountId: rawID.toLowerCase(),
			ownerMemberId: owner,
			wrapper: str(form, 'wrapper_' + rawID) as TaxProfileRequest['accounts'][number]['wrapper'],
			lotSelectionMethod: lotMethod
		});
	}
	const body: TaxProfileRequest = {
		jurisdiction: jurisdictionRaw.toUpperCase() as TaxProfileRequest['jurisdiction'],
		taxYear: year,
		filingStatus: filing,
		reportingCurrency: str(form, 'reportingCurrency').trim().toUpperCase(),
		estimatedTaxableIncome: income,
		priorShortTermLossCarryover: taxFloatOrZero(form.get('priorShortLoss')),
		priorLongTermLossCarryover: taxFloatOrZero(form.get('priorLongLoss')),
		members,
		accounts
	};
	body.marginalIncomeTaxRate = taxPercent(form.get('marginalRate'));
	body.shortTermCapitalGainsRate = taxPercent(form.get('shortTermRate'));
	body.longTermCapitalGainsRate = taxPercent(form.get('longTermRate'));
	const rawAllowance = str(form, 'remainingCapitalIncomeAllowance').trim();
	if (rawAllowance !== '') {
		const [allowance, valid] = taxFloat(rawAllowance);
		if (!valid || allowance < 0) return unprocessable('Invalid remaining saver allowance');
		body.remainingCapitalIncomeAllowance = allowance;
	}
	const rawChurchTax = str(form, 'churchTaxRate').trim();
	if (rawChurchTax !== '') {
		if (rawChurchTax !== '8' && rawChurchTax !== '9')
			return unprocessable('Invalid church tax rate');
		body.churchTaxRate = taxPercent(rawChurchTax);
	}
	const rawMode = str(form, 'capitalGainsTaxationMode').trim();
	if (rawMode !== '') {
		if (!['jurisdiction_default', 'autonomous', 'aggregate_with_income'].includes(rawMode)) {
			return unprocessable('Invalid capital gains taxation mode');
		}
		body.capitalGainsTaxationMode = rawMode as TaxProfileRequest['capitalGainsTaxationMode'];
	}
	try {
		await apiJSON(event, 'PUT', '/v1/tax/profile', body);
	} catch {
		return unprocessable('Profile could not be saved');
	}
	taxRedirect(body.jurisdiction, year);
}

// POST /tax/instruments/{id}/market-admission (no feature gate in Go)
export async function saveMarketAdmission(event: RequestEvent) {
	const id = event.url.searchParams.get('id') ?? '';
	if (!isUUID(id)) error(404, 'Not found');
	const form = await event.request.formData();
	const status = str(form, 'status');
	if (status !== 'regulated' && status !== 'unlisted' && status !== 'unknown') {
		return unprocessable('Invalid market classification');
	}
	// tax_evidence.go validTaxEvidenceAttestation
	if (!(status === 'unknown' || str(form, 'verified') === 'true')) {
		return unprocessable('Verify the market classification against documentary evidence');
	}
	const evidenceAttested = status !== 'unknown';
	try {
		await apiJSON(
			event,
			'PUT',
			`/v1/tax/instruments/${id.toLowerCase()}/market-admission`,
			{ status },
			{
				headers: { 'X-Tax-Evidence-Attested': String(evidenceAttested) }
			}
		);
	} catch {
		return unprocessable('Classification could not be saved');
	}
	let year = atoi0(form.get('taxYear'));
	if (year === 0) year = new Date().getFullYear();
	taxRedirect(str(form, 'jurisdiction').toUpperCase(), year);
}

const FUND_CLASSIFICATIONS = [
	'equity',
	'mixed',
	'real_estate',
	'foreign_real_estate',
	'other',
	'unknown'
];

// POST /tax/instruments/{id}/fund-classification (no feature gate in Go)
export async function saveFundClassification(event: RequestEvent) {
	const id = event.url.searchParams.get('id') ?? '';
	if (!isUUID(id)) error(404, 'Not found');
	const form = await event.request.formData();
	const classification = str(form, 'classification');
	if (!FUND_CLASSIFICATIONS.includes(classification))
		return unprocessable('Invalid fund classification');
	try {
		await apiJSON(event, 'PUT', `/v1/tax/instruments/${id.toLowerCase()}/fund-classification`, {
			classification
		});
	} catch {
		return unprocessable('Fund classification could not be saved');
	}
	taxRedirect(str(form, 'jurisdiction').toUpperCase(), atoi0(form.get('taxYear')));
}

type Holding = {
	id: string;
	lotId?: string;
	quantity?: number;
	beginningMarketValue: number;
	endingMarketValue: number;
	distributions: number;
	acquisitionMonth?: number;
};

// POST /tax/funds/annual-inputs
export async function saveFundAnnualInput(event: RequestEvent) {
	if (!(await requireTaxOptimization(event))) return proRequired();
	const form = await event.request.formData();
	const accountID = str(form, 'accountId');
	const instrumentID = str(form, 'instrumentId');
	const year = goAtoi(str(form, 'calculationYear'));
	if (!isUUID(accountID) || !isUUID(instrumentID) || year === null)
		return unprocessable('Enter valid annual fund values');
	const holdings: Holding[] = [];
	for (const rawLotID of strs(form, 'lot_id')) {
		if (!isUUID(rawLotID)) return unprocessable('Invalid fund lot');
		const [quantity, qOK] = taxFloat(form.get('quantity_' + rawLotID));
		const [beginning, bOK] = taxFloat(form.get('beginning_' + rawLotID));
		const [ending, eOK] = taxFloat(form.get('ending_' + rawLotID));
		const [distributions, dOK] = taxFloat(form.get('distributions_' + rawLotID));
		if (
			!qOK ||
			!bOK ||
			!eOK ||
			!dOK ||
			quantity <= 0 ||
			beginning < 0 ||
			ending < 0 ||
			distributions < 0
		) {
			return unprocessable('Enter valid values for every selected lot');
		}
		let month: number | undefined;
		const raw = str(form, 'acquisition_' + rawLotID).trim();
		if (raw !== '') {
			const parsed = goAtoi(raw);
			if (parsed === null || parsed < 1 || parsed > 12)
				return unprocessable('Invalid acquisition month');
			month = parsed;
		}
		holdings.push({
			id: rawLotID,
			lotId: rawLotID.toLowerCase(),
			quantity,
			beginningMarketValue: beginning,
			endingMarketValue: ending,
			distributions,
			acquisitionMonth: month
		});
	}
	if (holdings.length === 0) {
		const [beginning, bOK] = taxFloat(form.get('beginningMarketValue'));
		const [ending, eOK] = taxFloat(form.get('endingMarketValue'));
		const [distributions, dOK] = taxFloat(form.get('distributions'));
		if (!bOK || !eOK || !dOK || beginning < 0 || ending < 0 || distributions < 0) {
			return unprocessable('Select at least one lot or enter aggregate values');
		}
		let month: number | undefined;
		const raw = str(form, 'acquisitionMonth').trim();
		if (raw !== '') {
			const parsed = goAtoi(raw);
			if (parsed === null || parsed < 1 || parsed > 12)
				return unprocessable('Invalid acquisition month');
			month = parsed;
		}
		holdings.push({
			id: 'aggregate',
			beginningMarketValue: beginning,
			endingMarketValue: ending,
			distributions,
			acquisitionMonth: month
		});
	}
	try {
		await apiJSON(event, 'PUT', '/v1/tax/funds/annual-inputs', {
			accountId: accountID.toLowerCase(),
			instrumentId: instrumentID.toLowerCase(),
			calculationYear: year,
			currency: str(form, 'currency').trim().toUpperCase(),
			holdings
		});
	} catch {
		return unprocessable('Annual fund input could not be saved');
	}
	taxRedirect('DE', year);
}

// POST /tax/scenarios → #tax-workspace
export async function createScenario(event: RequestEvent) {
	if (!(await requireTaxOptimization(event))) return proRequired();
	const form = await event.request.formData();
	const year = atoi0(form.get('taxYear'));
	const jurisdiction = str(form, 'jurisdiction').toUpperCase();
	const opportunityIds = strs(form, 'opportunityId');
	if (opportunityIds.length === 0) return unprocessable('Select at least one opportunity');
	const replacements: Record<string, string> = {};
	for (const id of opportunityIds) {
		const replacement = str(form, 'replacement_' + id).trim();
		if (replacement) replacements[id] = replacement;
	}
	try {
		const scenario = await apiJSON<TaxScenarioResponse>(
			event,
			'POST',
			'/v1/tax/scenarios',
			{ taxYear: year, opportunityIds, plannedReplacementInstrumentIds: replacements },
			{ query: { jurisdiction } }
		);
		return { workspace: { kind: 'scenario', scenario } satisfies TaxWorkspace as TaxWorkspace };
	} catch {
		return unprocessable('Scenario could not be created');
	}
}

// POST /tax/location-scenarios → #tax-workspace
export async function createLocationScenario(event: RequestEvent) {
	if (!(await requireTaxOptimization(event))) return proRequired();
	const form = await event.request.formData();
	const year = atoi0(form.get('taxYear'));
	const jurisdiction = str(form, 'jurisdiction').toUpperCase();
	try {
		const scenario = await apiJSON<TaxLocationScenarioResponse>(
			event,
			'POST',
			'/v1/tax/location-scenarios',
			{ taxYear: year, opportunityIds: strs(form, 'opportunityId') },
			{ query: { jurisdiction } }
		);
		return { workspace: { kind: 'location', scenario } satisfies TaxWorkspace as TaxWorkspace };
	} catch {
		return unprocessable('Asset-location scenario could not be created');
	}
}

// POST /tax/placement-plans → #tax-workspace
export async function createPlacementPlan(event: RequestEvent) {
	if (!(await requireTaxOptimization(event))) return proRequired();
	const form = await event.request.formData();
	const scenarioId = str(form, 'scenarioId');
	if (!isUUID(scenarioId)) return badRequest('Invalid asset-location scenario');
	try {
		const plan = await apiJSON<TaxActionPlanResponse>(event, 'POST', '/v1/tax/placement-plans', {
			scenarioId: scenarioId.toLowerCase(),
			idempotencyKey: crypto.randomUUID()
		});
		return { workspace: { kind: 'plan', plan } satisfies TaxWorkspace as TaxWorkspace };
	} catch {
		return unprocessable('Placement plan could not be created');
	}
}

// POST /tax/action-plans → #tax-workspace
export async function createActionPlan(event: RequestEvent) {
	if (!(await requireTaxOptimization(event))) return proRequired();
	const form = await event.request.formData();
	const scenarioId = str(form, 'scenarioId');
	if (!isUUID(scenarioId)) return badRequest('Invalid scenario');
	try {
		const plan = await apiJSON<TaxActionPlanResponse>(event, 'POST', '/v1/tax/action-plans', {
			scenarioId: scenarioId.toLowerCase(),
			idempotencyKey: crypto.randomUUID()
		});
		return { workspace: { kind: 'plan', plan } satisfies TaxWorkspace as TaxWorkspace };
	} catch {
		return unprocessable('Action plan could not be created');
	}
}

// POST /tax/opportunities/{id}/dismiss and /restore. The opportunity id
// travels in the action URL: formaction="/tax?/dismiss&id=…".
export async function opportunityDecision(event: RequestEvent, restore: boolean) {
	if (!(await requireTaxOptimization(event))) return proRequired();
	const form = await event.request.formData();
	const opportunityID = event.url.searchParams.get('id') ?? '';
	const year = goAtoi(str(form, 'taxYear'));
	if (opportunityID === '' || year === null) return badRequest('Invalid opportunity');
	const jurisdiction = str(form, 'jurisdiction').toUpperCase();
	let status = 0;
	try {
		const res = await apiFetch(
			event,
			restore ? 'DELETE' : 'POST',
			`/v1/tax/opportunities/${encodeURIComponent(opportunityID)}/dismiss`,
			null,
			{ query: { jurisdiction, taxYear: year } }
		);
		status = res.status;
	} catch {
		status = 0;
	}
	if (status < 200 || status >= 300) return unprocessable('Opportunity could not be updated');
	taxRedirect(jurisdiction, year);
}

// POST /tax/notifications
export async function saveNotifications(event: RequestEvent) {
	if (!(await requireTaxOptimization(event))) return proRequired();
	const form = await event.request.formData();
	const body: TaxNotificationPreferences = {
		enabled: str(form, 'enabled') === 'on',
		cooldownDays: atoi0(form.get('cooldownDays'))
	};
	const [minimum, ok] = taxFloat(form.get('minimumBenefit'));
	if (ok) body.minimumBenefit = minimum;
	try {
		await apiJSON(event, 'PUT', '/v1/tax/notifications', body);
	} catch {
		return unprocessable('Notification settings could not be saved');
	}
	let year = atoi0(form.get('taxYear'));
	if (year === 0) year = new Date().getFullYear();
	taxRedirect(str(form, 'jurisdiction').toUpperCase(), year);
}

// POST /tax/reports (no route middleware in Go; the annual filing pack can be
// unlocked by a per-year purchase only the backend sees, so only the other
// kinds stay behind the local Pro check).
export async function createReport(event: RequestEvent) {
	const form = await event.request.formData();
	const year = atoi0(form.get('taxYear'));
	const kind = str(form, 'kind') || 'transaction_workpaper';
	if (kind !== 'annual_filing_pack' && !(await taxPro(event))) return proRequired();
	const format = str(form, 'format');
	const jurisdiction = str(form, 'jurisdiction').toUpperCase();
	try {
		await apiJSON(event, 'POST', '/v1/tax/reports', { taxYear: year, kind, format });
	} catch (err) {
		if (isAPIError(err)) console.warn('create tax report', err.status, err.reason);
		return unprocessable('Report could not be generated');
	}
	if (kind === 'annual_filing_pack') {
		// The one funnel event the filing pack owns: a user asked for the file.
		await setPostHogCaptureOnce(event.locals, 'filing_pack_generated', {
			taxYear: year,
			format,
			jurisdiction
		});
	}
	taxRedirect(jurisdiction, year);
}
