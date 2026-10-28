import type { Option } from '#lib/components/norviq/types.js';
import { sprintfFixed } from '#lib/format.js';
import type {
	TaxActionPlanResponse,
	TaxFundLotOption,
	TaxInstrumentMarketOption,
	TaxLossCarryforwardBalanceResponse,
	TaxMoney,
	TaxOpportunityResponse,
	TaxPageViewModel
} from './types.js';

// Ports of the helper funcs in norviq-web internal/pages/tax (page.templ,
// options.go, fund_lot_groups.go, viewmodel.go, filing.templ) and of the pure
// helpers in internal/handlers/tax.go.

/** page.templ money: "%s %.2f" */
export function money(value: TaxMoney | null | undefined): string {
	return `${value?.currency ?? ''} ${sprintfFixed(value?.amount ?? 0, 2)}`;
}

export function optionalFloat(value: number | null | undefined): string {
	return value == null ? '' : sprintfFixed(value, 2);
}

export function workpaperDescription(isPro: boolean): string {
	return isPro ? 'Generate advisor-review PDF or CSV exports.' : 'Preview report history. Pro unlocks generation and downloads.';
}

export function marketInstruments(vm: TaxPageViewModel): TaxInstrumentMarketOption[] {
	return vm.context.instruments ?? [];
}

export function listingExchange(value: TaxInstrumentMarketOption): string {
	return value.listingExchange ? value.listingExchange : 'Unavailable';
}

export function fundClassification(value: TaxInstrumentMarketOption): string {
	return value.fundClassification ?? 'unknown';
}

export function lossCategory(value: TaxLossCarryforwardBalanceResponse): string {
	switch (value.category ?? '') {
		case 'stock':
			return 'Stock loss';
		case 'general_capital':
			return 'General capital loss';
		case 'securities':
			return 'Securities loss';
		case 'short_term':
			return 'Short-term loss';
		case 'long_term':
			return 'Long-term loss';
		default:
			return 'Tax loss';
	}
}

export function lossExpiry(value: TaxLossCarryforwardBalanceResponse): string {
	return value.expiresAfterTaxYear >= 9999 ? 'No statutory expiry' : `Expires after ${value.expiresAfterTaxYear}`;
}

export function taxationMode(vm: TaxPageViewModel): string {
	return vm.context.profile?.profile.capitalGainsTaxationMode ?? 'jurisdiction_default';
}

export function profileValue(vm: TaxPageViewModel, field: string): string {
	const profile = vm.context.profile;
	if (!profile) {
		if (field === 'currency') return vm.context.defaultReportingCurrency;
		if (field === 'primary') return 'Me';
		if (field === 'filing') return 'single';
		if (field === 'shortLoss' || field === 'longLoss') return '0';
		return '';
	}
	const p = profile.profile;
	switch (field) {
		case 'filing':
			return p.filingStatus;
		case 'currency':
			return p.reportingCurrency;
		case 'primary':
			return p.members.length > 0 ? p.members[0].displayName : '';
		case 'partner':
			return p.members.length > 1 ? p.members[1].displayName : '';
		case 'income':
			return sprintfFixed(p.estimatedTaxableIncome, 2);
		case 'marginal':
			return p.marginalIncomeTaxRate != null ? sprintfFixed(p.marginalIncomeTaxRate * 100, 2) : '';
		case 'short':
			return p.shortTermCapitalGainsRate != null ? sprintfFixed(p.shortTermCapitalGainsRate * 100, 2) : '';
		case 'long':
			return p.longTermCapitalGainsRate != null ? sprintfFixed(p.longTermCapitalGainsRate * 100, 2) : '';
		case 'remainingAllowance':
			return p.remainingCapitalIncomeAllowance != null ? sprintfFixed(p.remainingCapitalIncomeAllowance, 2) : '';
		case 'churchTax':
			return p.churchTaxRate != null ? sprintfFixed(p.churchTaxRate * 100, 2) : '';
		case 'shortLoss':
			return sprintfFixed(p.priorShortTermLossCarryover, 2);
		case 'longLoss':
			return sprintfFixed(p.priorLongTermLossCarryover, 2);
	}
	return '';
}

// options.go

/** Fixed option list; pairs are [value, label]. Marks nothing when selected matches no value. */
export function staticOptions(selected: string, ...pairs: Array<[string, string]>): Option[] {
	return pairs.map(([value, label]) => ({ value, label, selected: value === selected }));
}

/** Each value is its own label, optionally led by a blank entry. */
export function valueOptions(values: string[], selected: string, blankLabel: string): Option[] {
	const opts: Option[] = [];
	if (blankLabel) opts.push({ value: '', label: blankLabel, selected: selected === '' });
	for (const v of values) opts.push({ value: v, label: v, selected: v === selected });
	return opts;
}

export function labelledOptions(values: string[], labels: string[], selected: string, blankLabel: string): Option[] {
	const opts: Option[] = [];
	if (blankLabel) opts.push({ value: '', label: blankLabel, selected: selected === '' });
	values.forEach((v, i) => opts.push({ value: v, label: i < labels.length ? labels[i] : v, selected: v === selected }));
	return opts;
}

export function accountOptions(vm: TaxPageViewModel, selected: string, blankLabel: string): Option[] {
	return labelledOptions(
		vm.context.accounts.map((a) => a.id),
		vm.context.accounts.map((a) => a.displayName),
		selected,
		blankLabel
	);
}

export function instrumentOptions(vm: TaxPageViewModel, blankLabel: string): Option[] {
	const instruments = marketInstruments(vm);
	return labelledOptions(
		instruments.map((i) => i.id),
		instruments.map((i) => i.symbol),
		'',
		blankLabel
	);
}

/** Wash-sale replacement candidates; the detail panel adds a fit score. */
export function replacementOptions(item: TaxOpportunityResponse, withScore: boolean): Option[] {
	return (item.replacementCandidates ?? []).map((c) => ({
		value: c.instrumentId,
		label: withScore ? `${c.symbol} · ${sprintfFixed(c.score * 100, 0)}% fit` : c.symbol
	}));
}

// fund_lot_groups.go

export interface FundLotGroup {
	accountID: string;
	instrumentID: string;
	accountName: string;
	symbol: string;
	currency: string;
	lots: TaxFundLotOption[];
}

export function fundLotGroups(vm: TaxPageViewModel): FundLotGroup[] {
	if (!vm.context.fundLots) return [];
	const accountNames = new Map<string, string>();
	const accountCurrencies = new Map<string, string>();
	for (const account of vm.context.accounts) {
		accountNames.set(account.id, account.displayName);
		accountCurrencies.set(account.id, account.baseCurrency);
	}
	const symbols = new Map<string, string>();
	for (const instrument of vm.context.instruments ?? []) symbols.set(instrument.id, instrument.symbol);

	const groups: FundLotGroup[] = [];
	const indices = new Map<string, number>();
	for (const lot of vm.context.fundLots) {
		const key = `${lot.accountId}:${lot.instrumentId}`;
		let index = indices.get(key);
		if (index === undefined) {
			index = groups.length;
			indices.set(key, index);
			groups.push({
				accountID: lot.accountId,
				instrumentID: lot.instrumentId,
				accountName: accountNames.get(lot.accountId) ?? '',
				symbol: symbols.get(lot.instrumentId) ?? '',
				currency: accountCurrencies.get(lot.accountId) ?? '',
				lots: []
			});
		}
		groups[index].lots.push(lot);
	}
	return groups;
}

// viewmodel.go

export function actionPlanKind(plan: TaxActionPlanResponse): string {
	return plan.kind ?? 'harvest';
}

export function actionPlanLegCount(plan: TaxActionPlanResponse): number {
	return plan.legs?.length ?? 0;
}

export function rebalancingPlanCount(plan: TaxActionPlanResponse): number {
	return plan.rebalancingPlanIds?.length ?? 0;
}

/** Go time.Format("2006-01-02") of an RFC 3339 timestamp (UTC, as the Go web decoded it). */
export function isoDate(value: string): string {
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? value.slice(0, 10) : d.toISOString().slice(0, 10);
}

/** fmt.Sprint of a float: shortest round-trip form. */
export function goSprint(v: number): string {
	return String(v);
}

// filing.templ

export function yearOptions(years: number[], selected: number): Option[] {
	return years.map((y) => ({ value: String(y), label: String(y), selected: y === selected }));
}

export function filingMoney(value: number | undefined, currency: string): string {
	return `${sprintfFixed(value ?? 0, 2)} ${currency}`;
}

export function filingTone(value: number | undefined): 'positive' | 'negative' | '' {
	const v = value ?? 0;
	if (v > 0) return 'positive';
	if (v < 0) return 'negative';
	return '';
}

// handlers/tax.go

export function filterTaxOpportunities(
	opportunities: TaxOpportunityResponse[],
	accountID: string,
	assetClass: string,
	status: string
): TaxOpportunityResponse[] {
	return opportunities.filter(
		(o) =>
			(accountID === '' || o.accountId === accountID) &&
			(assetClass === '' || o.instrumentType.toLowerCase() === assetClass.toLowerCase()) &&
			(status === '' || o.status.toLowerCase() === status.toLowerCase())
	);
}

export function taxOpportunityAssetClasses(opportunities: TaxOpportunityResponse[]): string[] {
	const seen = new Set<string>();
	for (const o of opportunities) {
		const v = o.instrumentType.trim().toLowerCase();
		if (v) seen.add(v);
	}
	return [...seen].sort();
}

/**
 * The year people are dealing with right now: during the filing window
 * (January–June) last year's return; from July the year in progress.
 */
export function defaultFilingTaxYear(now: Date): number {
	return now.getMonth() <= 5 ? now.getFullYear() - 1 : now.getFullYear();
}

/** billing.AppUserID: a UUID is upper-cased (RevenueCat's iOS form); anything else passes through trimmed. */
export function appUserID(raw: string | null | undefined): string {
	const trimmed = (raw ?? '').trim();
	if (!trimmed) return '';
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed;
}

/**
 * Fills the configured purchase link for one tax year, or '' when web
 * checkout for that year is not configured. The link must carry the Norviq
 * user UUID as the RevenueCat subscriber (the webhook drops unattributed
 * purchases silently), so an empty appUserID yields no link at all.
 */
export function taxPackCheckoutURL(
	cfg: { taxPackCheckoutURL: string; taxPackCheckoutURLs: Record<number, string> } | null,
	year: number,
	appUser: string
): string {
	if (!cfg) return '';
	appUser = appUser.trim();
	if (!appUser) return '';
	let link = cfg.taxPackCheckoutURLs[year] ?? '';
	// The single-link form serves every year, so the year is a parameter of the link.
	if (!link) link = cfg.taxPackCheckoutURL.trim();
	if (!link) return '';
	link = link.replaceAll('{year}', String(year));
	return link.replaceAll('{app_user_id}', goPathEscape(appUser));
}

/** url.PathEscape */
function goPathEscape(s: string): string {
	return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

export function taxRedirectTarget(jurisdiction: string, year: number): string {
	return `/tax?jurisdiction=${jurisdiction}&taxYear=${year}`;
}

/** fmt.Sprintf("%.Nf%%", v) */
export function sprintfPercent(v: number, prec: number): string {
	return `${sprintfFixed(v, prec)}%`;
}
