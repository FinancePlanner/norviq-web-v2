// Port of norviq-web internal/handlers/economy_data.go (LoadEconomyViewModel).
// Go called the generated client and treated `err != nil || JSON200 == nil` as a
// failure; getJSON's `data === null` is exactly that.

import type { RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { formatFloat, formatMoney } from '#lib/format.js';
import { getJSON } from '#lib/features/dashboard/fetch.server.js';
import type { ComponentVM, EconomyPageVM, EconomySection, GaugeVM, IndicatorVM } from './types.js';

type S = components['schemas'];

function isNegative(v: number): boolean {
	return v < 0 || Object.is(v, -0);
}

/** fmt.Sprintf("%+.Nf", v). */
function signedFixed(v: number, prec: number): string {
	const s = formatFloat(v, prec);
	return isNegative(v) || Number.isNaN(v) ? s : '+' + s;
}

function emptyVM(section: EconomySection, country: string, activePath: string): EconomyPageVM {
	return {
		section,
		activePath,
		country,
		countryQuery: '?country=' + country,
		errorMessage: '',
		asOf: '',
		updatedAt: '',
		source: '',
		currency: '',
		coverage: [],
		notes: '',
		headline: { name: '', nowValue: '', officialValue: '', gap: '', hasOfficial: false },
		gauges: [],
		movers: [],
		hasNextPrint: false,
		nextPrint: { date: '', daysRemaining: '', forecast: '', consensus: '', lastOfficial: '' },
		trend: { points: '', startLabel: '', endLabel: '', minLabel: '', maxLabel: '' },
		components: [],
		items: [],
		personal: {
			hasRate: false,
			rate: '',
			officialRate: '',
			comparison: '',
			annualImpact: '',
			monthlySpend: '',
			coverage: '',
			coverageValue: 0,
			mappedSpend: '',
			totalSpend: '',
			expenseCount: 0,
			periodMonths: 0,
			components: []
		},
		indicators: [],
		missing: [],
		riskLabel: '',
		officialRecession: null,
		yieldCurveSpread: '',
		institution: '',
		inflationTarget: '',
		distanceToTarget: '',
		stance: '',
		hasMeeting: false,
		meeting: { label: '', daysRemaining: '', hasOdds: false, odds: [] }
	};
}

export async function loadEconomyViewModel(
	event: RequestEvent,
	section: EconomySection,
	country: string,
	activePath: string
): Promise<EconomyPageVM> {
	const vm = emptyVM(section, country, activePath);
	switch (section) {
		case 'personal':
			await loadPersonalInflation(event, vm);
			break;
		case 'housing':
			await loadEconomyHousing(event, vm);
			break;
		case 'growth':
			await loadEconomyGrowth(event, vm);
			break;
		case 'fed':
			await loadEconomyPolicy(event, vm);
			break;
		default:
			await loadEconomyInflation(event, vm);
	}
	return vm;
}

async function loadEconomyInflation(event: RequestEvent, vm: EconomyPageVM): Promise<void> {
	const res = await getJSON<S['InflationSnapshotResponse']>(event, '/v1/macro/inflation/current', { country: vm.country });
	const snap = res.data;
	if (!snap) {
		console.warn('economy inflation fetch failed', vm.country, res.status);
		vm.errorMessage = 'Could not load inflation data.';
		return;
	}
	vm.asOf = snap.asOf;
	vm.updatedAt = snap.updatedAt;
	vm.source = snap.source;
	vm.currency = snap.currency;
	if (snap.notes != null) vm.notes = snap.notes.trim();
	vm.headline = mapInflationGauge(snap.headline);
	for (const g of snap.gauges ?? []) vm.gauges.push(mapInflationGauge(g));
	for (const component of snap.components ?? []) {
		const weight = component.cpiWeight != null ? `${formatFloat(component.cpiWeight, 1)}% basket weight` : '';
		vm.components.push({
			category: component.category,
			macroCategory: '',
			rate: signedFixed(component.ourYoY, 1) + '%',
			weight,
			spend: ''
		});
	}
	for (const m of snap.topMovers ?? []) {
		vm.movers.push({
			category: m.category,
			changeYoY: signedFixed(m.changeYoY, 2) + '%',
			direction: m.direction ?? ''
		});
	}
	const np = snap.nextPrintCountdown;
	if (np) {
		vm.hasNextPrint = true;
		if (np.date != null) vm.nextPrint.date = np.date;
		if (np.daysRemaining != null) {
			const days = np.daysRemaining;
			vm.nextPrint.daysRemaining = `Next CPI print in ${days} ${days === 1 ? 'day' : 'days'}`;
		}
		if (np.forecastNowflation != null) vm.nextPrint.forecast = formatFloat(np.forecastNowflation, 2) + '%';
		if (np.streetConsensus != null) vm.nextPrint.consensus = formatFloat(np.streetConsensus, 2) + '%';
		if (np.lastOfficial != null) vm.nextPrint.lastOfficial = formatFloat(np.lastOfficial, 2) + '%';
	}
	await loadInflationEnrichments(event, vm);
}

async function loadInflationEnrichments(event: RequestEvent, vm: EconomyPageVM): Promise<void> {
	// Go ran these two sequentially; they are independent, so fetch in parallel.
	const [seriesRes, itemsRes] = await Promise.all([
		getJSON<S['MacroSeriesResponse']>(event, '/v1/macro/inflation/series', {
			country: vm.country,
			series: 'headline_cpi',
			limit: 60
		}),
		getJSON<S['MacroItemsResponse']>(event, '/v1/macro/items', { country: vm.country })
	]);
	if (seriesRes.data) vm.trend = trendViewModel(seriesRes.data.points ?? []);

	if (!itemsRes.data) return;
	for (const item of itemsRes.data.items ?? []) {
		const entry = { name: item.name, emoji: item.emoji ?? '', value: '', change: '' };
		if (item.latestPrice != null) entry.value = formatMoney(item.latestPrice, item.currency);
		if (item.changeYoY != null) {
			entry.change = `${signedFixed(item.changeYoY, 1)}% YoY`;
			if (entry.value === '') {
				entry.value = entry.change;
				entry.change = '';
			}
		}
		vm.items.push(entry);
	}
}

async function loadPersonalInflation(event: RequestEvent, vm: EconomyPageVM): Promise<void> {
	const res = await getJSON<S['PersonalInflationResponse']>(event, '/v1/macro/inflation/personal', {
		country: vm.country,
		months: 12
	});
	const data = res.data;
	if (!data) {
		console.warn('personal inflation fetch failed', vm.country, res.status);
		vm.errorMessage = 'Could not calculate your inflation from recorded expenses.';
		return;
	}
	vm.asOf = data.asOf;
	vm.source = data.source;
	vm.currency = data.currency;
	vm.personal = {
		hasRate: false,
		rate: '',
		officialRate: formatFloat(data.officialRate, 2) + '%',
		comparison: '',
		annualImpact: '',
		monthlySpend: formatMoney(data.averageMonthlySpend, data.currency),
		coverage: formatFloat(data.coveragePercent, 0) + '%',
		coverageValue: data.coveragePercent,
		mappedSpend: formatMoney(data.mappedSpend, data.currency),
		totalSpend: formatMoney(data.totalSpend, data.currency),
		expenseCount: data.expenseCount,
		periodMonths: data.periodMonths,
		components: []
	};
	if (data.personalRate != null) {
		vm.personal.hasRate = true;
		vm.personal.rate = formatFloat(data.personalRate, 2) + '%';
	}
	if (data.difference != null) {
		const direction = data.difference < 0 ? 'below' : 'above';
		vm.personal.comparison = `${formatFloat(Math.abs(data.difference), 2)} percentage points ${direction} official inflation`;
	}
	if (data.estimatedAnnualImpact != null) {
		vm.personal.annualImpact = formatMoney(data.estimatedAnnualImpact, data.currency);
	}
	for (const component of data.components ?? []) {
		vm.personal.components.push({
			category: component.category,
			macroCategory: component.macroCategory,
			rate: signedFixed(component.inflationRate, 1) + '%',
			weight: `${formatFloat(component.weight, 1)}% of mapped spend`,
			spend: formatMoney(component.spend, data.currency)
		} satisfies ComponentVM);
	}
}

/** handlers.trendViewModel: SVG polyline points in a 1000x250 viewBox. */
function trendViewModel(points: S['MacroSeriesPoint'][]): EconomyPageVM['trend'] {
	if (points.length < 2) return { points: '', startLabel: '', endLabel: '', minLabel: '', maxLabel: '' };
	let minimum = points[0].value;
	let maximum = points[0].value;
	for (const point of points.slice(1)) {
		minimum = Math.min(minimum, point.value);
		maximum = Math.max(maximum, point.value);
	}
	let rangeValue = maximum - minimum;
	if (rangeValue === 0) rangeValue = 1;
	const coordinates = points.map((point, index) => {
		const x = (index / (points.length - 1)) * 1000;
		const y = 230 - ((point.value - minimum) / rangeValue) * 210;
		return `${formatFloat(x, 1)},${formatFloat(y, 1)}`;
	});
	return {
		points: coordinates.join(' '),
		startLabel: points[0].date,
		endLabel: points[points.length - 1].date,
		minLabel: formatFloat(minimum, 1) + '%',
		maxLabel: formatFloat(maximum, 1) + '%'
	};
}

async function loadEconomyHousing(event: RequestEvent, vm: EconomyPageVM): Promise<void> {
	const res = await getJSON<S['HousingHubResponse']>(event, '/v1/macro/housing', { country: vm.country });
	const hub = res.data;
	if (!hub) {
		console.warn('economy housing fetch failed', vm.country, res.status);
		vm.errorMessage = 'Could not load housing data.';
		return;
	}
	applyHubMeta(vm, hub.currency, hub.asOf, hub.updatedAt, hub.source, hub.coverage, hub.notes);
	vm.indicators = [
		mapOptionalIndicator('Home price index YoY', hub.hpiYoY),
		mapOptionalIndicator('Mortgage rate', hub.mortgageRate),
		mapOptionalIndicator('Rent YoY', hub.rentYoY),
		mapOptionalIndicator('Housing starts', hub.housingStarts),
		mapOptionalIndicator('Months supply', hub.monthsSupply)
	];
	vm.missing = missingCoverage(hub.coverage ?? [], ['hpi', 'mortgage', 'rent', 'starts', 'supply']);
}

async function loadEconomyGrowth(event: RequestEvent, vm: EconomyPageVM): Promise<void> {
	const res = await getJSON<S['EconomyHubResponse']>(event, '/v1/macro/economy', { country: vm.country });
	const hub = res.data;
	if (!hub) {
		console.warn('economy growth fetch failed', vm.country, res.status);
		vm.errorMessage = 'Could not load growth & jobs data.';
		return;
	}
	applyHubMeta(vm, hub.currency, hub.asOf, hub.updatedAt, hub.source, hub.coverage, hub.notes);
	vm.officialRecession = hub.officialRecession ?? null;
	if (hub.riskLabel != null) vm.riskLabel = hub.riskLabel;
	if (hub.yieldCurveSpread != null) vm.yieldCurveSpread = `${signedFixed(hub.yieldCurveSpread, 2)} pp`;
	vm.indicators = [
		mapOptionalIndicator('Unemployment', hub.unemployment),
		mapOptionalIndicator('GDP growth', hub.gdpGrowth),
		mapOptionalIndicator('Payrolls', hub.payrolls),
		mapOptionalIndicator('Initial claims', hub.initialClaims),
		mapOptionalIndicator('Policy rate', hub.policyRate),
		mapOptionalIndicator('Sahm rule', hub.sahmRule)
	];
	vm.missing = missingCoverage(hub.coverage ?? [], ['unemployment', 'gdp', 'payrolls', 'claims', 'policy', 'sahm']);
}

/** api.PolicyWatchFromFedWatch (macro_helpers.go). policyRate is not mapped, as in Go. */
function policyWatchFromFedWatch(fed: S['FedWatchResponse']): S['PolicyWatchResponse'] {
	return {
		country: 'US',
		asOf: fed.asOf,
		updatedAt: fed.updatedAt,
		source: fed.source,
		institution: 'Federal Reserve',
		inflationGauge: fed.corePCE,
		inflationTarget: fed.fedTarget,
		distanceToTarget: fed.distanceToTarget,
		treasury2Y: fed.treasury2Y,
		treasury10Y: fed.treasury10Y,
		spread10Y2Y: fed.spread10Y2Y,
		real10Y: fed.real10Y,
		breakeven10Y: fed.breakeven10Y,
		nextMeeting: fed.nextFOMC,
		stance: fed.stance ?? null
	};
}

async function loadEconomyPolicy(event: RequestEvent, vm: EconomyPageVM): Promise<void> {
	const res = await getJSON<S['PolicyWatchResponse']>(event, '/v1/macro/policy-watch', { country: vm.country });
	let policy: S['PolicyWatchResponse'];
	if (res.data) {
		policy = res.data;
	} else if (vm.country === 'US') {
		const fedRes = await getJSON<S['FedWatchResponse']>(event, '/v1/macro/fed-watch');
		if (!fedRes.data) {
			console.warn('economy policy/fed-watch fetch failed', vm.country, res.status, fedRes.status);
			vm.errorMessage = 'Could not load policy watch data.';
			return;
		}
		policy = policyWatchFromFedWatch(fedRes.data);
	} else {
		console.warn('economy policy-watch fetch failed', vm.country, res.status);
		vm.errorMessage = 'Could not load policy watch data.';
		return;
	}

	vm.asOf = policy.asOf;
	vm.updatedAt = policy.updatedAt;
	vm.source = policy.source;
	vm.institution = policy.institution;
	vm.inflationTarget = formatFloat(policy.inflationTarget, 0) + '%';
	vm.distanceToTarget = `${signedFixed(policy.distanceToTarget, 2)} pp`;
	if (policy.stance != null) vm.stance = policy.stance;
	if (policy.notes != null) vm.notes = policy.notes.trim();
	vm.indicators = [
		mapRequiredIndicator(policy.inflationGauge?.name ?? '', policy.inflationGauge),
		mapOptionalIndicator('Policy rate', policy.policyRate),
		mapOptionalIndicator('2Y yield', policy.treasury2Y),
		mapOptionalIndicator('10Y yield', policy.treasury10Y),
		mapOptionalIndicator('Real 10Y', policy.real10Y),
		mapOptionalIndicator('Breakeven 10Y', policy.breakeven10Y)
	];
	if (policy.spread10Y2Y != null) {
		vm.indicators.push({
			label: '10Y–2Y spread',
			value: `${signedFixed(policy.spread10Y2Y, 2)} pp`,
			asOf: '',
			detail: '',
			covered: true
		});
	}
	const meeting = policy.nextMeeting;
	if (meeting) {
		vm.hasMeeting = true;
		vm.meeting.label = `Next meeting ${meeting.startDate} – ${meeting.endDate}`;
		const days = meeting.daysRemaining;
		vm.meeting.daysRemaining = `in ${days} ${days === 1 ? 'day' : 'days'}`;
		// Hide FOMC odds when null / empty.
		if (meeting.odds && meeting.odds.length > 0) {
			vm.meeting.hasOdds = true;
			for (const odd of meeting.odds) {
				let p = odd.probability;
				if (p <= 1) p *= 100;
				vm.meeting.odds.push({ move: odd.move, probability: formatFloat(p, 0) + '%' });
			}
		}
	}
}

function applyHubMeta(
	vm: EconomyPageVM,
	currency: string,
	asOf: string,
	updatedAt: string,
	source: string,
	coverage: string[] | null | undefined,
	notes: string | null | undefined
): void {
	vm.asOf = asOf;
	vm.updatedAt = updatedAt;
	vm.source = source;
	vm.currency = currency;
	vm.coverage = coverage ?? [];
	if (notes != null) vm.notes = notes.trim();
}

function mapInflationGauge(g: S['InflationGaugeDTO']): GaugeVM {
	const vm: GaugeVM = { name: g.name, nowValue: formatFloat(g.nowValue, 2) + '%', officialValue: '', gap: '', hasOfficial: false };
	if (g.officialValue != null) {
		vm.hasOfficial = true;
		vm.officialValue = formatFloat(g.officialValue, 2) + '%';
	}
	if (g.gap != null) vm.gap = `${signedFixed(g.gap, 2)} pp`;
	return vm;
}

function mapOptionalIndicator(label: string, ind: S['MacroIndicatorDTO'] | null | undefined): IndicatorVM {
	if (!ind) return { label, value: '', asOf: '', detail: '', covered: false };
	return mapRequiredIndicator(label, ind);
}

function mapRequiredIndicator(label: string, ind: S['MacroIndicatorDTO'] | null | undefined): IndicatorVM {
	if (!ind) return { label, value: '', asOf: '', detail: '', covered: false };
	const name = (ind.name ?? '').trim() !== '' ? ind.name : label;
	const detail = ind.changeFromPrevious != null ? `${signedFixed(ind.changeFromPrevious, 2)} vs prior` : '';
	return { label: name, value: formatMacroIndicatorValue(ind), asOf: ind.asOf, detail, covered: true };
}

function formatMacroIndicatorValue(ind: S['MacroIndicatorDTO']): string {
	const unit = (ind.unit ?? '').trim().toLowerCase();
	switch (unit) {
		case 'percent':
		case 'pct':
		case '%':
			return formatFloat(ind.value, 2) + '%';
		case 'pp':
		case 'percentage_points':
			return formatFloat(ind.value, 2) + ' pp';
		default:
			if (unit !== '') return `${formatFloat(ind.value, 2)} ${ind.unit}`;
			return formatFloat(ind.value, 2);
	}
}

function missingCoverage(present: string[], expected: string[]): string[] {
	const set = new Set(present.map(normalizeCoverageTag));
	const missing: string[] = [];
	for (const e of expected) {
		if (set.has(normalizeCoverageTag(e))) continue;
		const found = coverageAliases(e).some((a) => set.has(normalizeCoverageTag(a)));
		if (!found) missing.push(e);
	}
	return missing;
}

function normalizeCoverageTag(tag: string): string {
	return tag.trim().toLowerCase().replaceAll('_', '');
}

function coverageAliases(tag: string): string[] {
	switch (normalizeCoverageTag(tag)) {
		case 'hpi':
			return ['hpi', 'hpiyoy', 'hpi_yoy'];
		case 'starts':
			return ['starts', 'housingstarts', 'housing_starts'];
		case 'supply':
			return ['supply', 'monthssupply', 'months_supply'];
		case 'gdp':
			return ['gdp', 'gdpgrowth', 'gdp_growth'];
		case 'claims':
			return ['claims', 'initialclaims', 'initial_claims'];
		case 'policy':
			// Backend EconomyHubResponse.coverage uses "policy_rate".
			return ['policy', 'policyrate', 'policy_rate'];
		case 'sahm':
			return ['sahm', 'sahmrule', 'sahm_rule'];
		case 'nber':
			return ['nber', 'officialrecession'];
		default:
			return [tag];
	}
}
