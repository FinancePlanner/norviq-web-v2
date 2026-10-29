// Port of norviq-web internal/pages/economy/viewmodel.go plus the pure helpers
// from handlers/economy.go and pages/economy/page.templ. Client-safe (no server imports).

import type { SegmentItem } from '#lib/components/norviq/types.js';

export type EconomySection = 'inflation' | 'personal' | 'housing' | 'growth' | 'fed';

export interface TrendVM {
	points: string;
	startLabel: string;
	endLabel: string;
	minLabel: string;
	maxLabel: string;
}

export interface ComponentVM {
	category: string;
	macroCategory: string;
	rate: string;
	weight: string;
	spend: string;
}

export interface ItemVM {
	name: string;
	emoji: string;
	value: string;
	change: string;
}

export interface PersonalInflationVM {
	hasRate: boolean;
	rate: string;
	officialRate: string;
	comparison: string;
	annualImpact: string;
	monthlySpend: string;
	coverage: string;
	coverageValue: number;
	mappedSpend: string;
	totalSpend: string;
	expenseCount: number;
	periodMonths: number;
	components: ComponentVM[];
}

export interface GaugeVM {
	name: string;
	nowValue: string;
	officialValue: string;
	gap: string;
	hasOfficial: boolean;
}

export interface MoverVM {
	category: string;
	changeYoY: string;
	direction: string; // up | down | flat
}

export interface NextPrintVM {
	date: string;
	daysRemaining: string;
	forecast: string;
	consensus: string;
	lastOfficial: string;
}

export interface IndicatorVM {
	label: string;
	value: string;
	asOf: string;
	detail: string;
	covered: boolean;
}

export interface OddsVM {
	move: string;
	probability: string;
}

export interface MeetingVM {
	label: string;
	daysRemaining: string;
	hasOdds: boolean;
	odds: OddsVM[];
}

/** economy.PageViewModel */
export interface EconomyPageVM {
	section: EconomySection;
	activePath: string;
	country: string;
	countryQuery: string;
	errorMessage: string;

	asOf: string;
	updatedAt: string;
	source: string;
	currency: string;
	coverage: string[];
	notes: string;

	headline: GaugeVM;
	gauges: GaugeVM[];
	movers: MoverVM[];
	hasNextPrint: boolean;
	nextPrint: NextPrintVM;
	trend: TrendVM;
	components: ComponentVM[];
	items: ItemVM[];

	personal: PersonalInflationVM;

	indicators: IndicatorVM[];
	missing: string[];

	riskLabel: string;
	officialRecession: boolean | null;
	yieldCurveSpread: string;

	institution: string;
	inflationTarget: string;
	distanceToTarget: string;
	stance: string;
	hasMeeting: boolean;
	meeting: MeetingVM;
}

/** economy.CountryOptions — kept in sync with MacroCountryParam in the OpenAPI spec. */
export const COUNTRY_OPTIONS: ReadonlyArray<{ code: string; label: string }> = [
	{ code: 'US', label: 'United States' },
	{ code: 'PT', label: 'Portugal' },
	{ code: 'ES', label: 'Spain' },
	{ code: 'DE', label: 'Germany' },
	{ code: 'FR', label: 'France' },
	{ code: 'IT', label: 'Italy' },
	{ code: 'BR', label: 'Brazil' },
	{ code: 'EA', label: 'Euro Area' }
];

/**
 * handlers.Economy section switch: "" and "inflation" → inflation; the four
 * other hubs pass; anything else is null (Go: http.NotFound).
 */
export function parseEconomySection(raw: string | undefined): EconomySection | null {
	const section = (raw ?? '').trim().toLowerCase();
	switch (section) {
		case '':
		case 'inflation':
			return 'inflation';
		case 'personal':
		case 'housing':
		case 'growth':
		case 'fed':
			return section;
		default:
			return null;
	}
}

/** handlers.normalizeMacroCountry: EURO/EZ → EA, a supported code, else US. */
export function normalizeMacroCountry(raw: string | null | undefined): string {
	const normalized = (raw ?? '').trim().toUpperCase();
	if (normalized === 'EURO' || normalized === 'EZ') return 'EA';
	for (const opt of COUNTRY_OPTIONS) {
		if (opt.code === normalized) return opt.code;
	}
	return 'US';
}

/** handlers.Economy page <title> per section. */
export function economyTitle(section: EconomySection): string {
	switch (section) {
		case 'housing':
			return 'Housing - Economy - Norviq';
		case 'growth':
			return 'Growth & Jobs - Economy - Norviq';
		case 'fed':
			return 'Policy Watch - Economy - Norviq';
		case 'personal':
			return 'Your Inflation - Economy - Norviq';
		default:
			return 'Inflation - Economy - Norviq';
	}
}

/** handlers.economyActivePath and page.templ sectionBasePath (identical in Go). */
export function sectionBasePath(section: EconomySection): string {
	switch (section) {
		case 'housing':
			return '/economy/housing';
		case 'growth':
			return '/economy/growth';
		case 'fed':
			return '/economy/fed';
		case 'personal':
			return '/economy/personal';
		default:
			return '/economy';
	}
}

/** page.templ sectionActivePath. */
export function sectionActivePath(section: EconomySection, countryQuery: string): string {
	return sectionBasePath(section) + countryQuery;
}

/** page.templ sectionTabs. */
export function sectionTabs(countryQuery: string): SegmentItem[] {
	const q = countryQuery;
	return [
		{ label: 'Inflation', path: '/economy' + q },
		{ label: 'Your Inflation', path: '/economy/personal' + q },
		{ label: 'Housing', path: '/economy/housing' + q },
		{ label: 'Growth & Jobs', path: '/economy/growth' + q },
		{ label: 'Policy Watch', path: '/economy/fed' + q }
	];
}

/** page.templ pageTitle. */
export function pageTitle(section: EconomySection): string {
	switch (section) {
		case 'housing':
			return 'Housing';
		case 'growth':
			return 'Growth & Jobs';
		case 'fed':
			return 'Policy Watch';
		case 'personal':
			return 'Your Inflation';
		default:
			return 'Inflation';
	}
}

/** page.templ pageSubtitle. */
export function pageSubtitle(section: EconomySection): string {
	switch (section) {
		case 'housing':
			return 'Home prices, mortgage rates, rent, and supply';
		case 'growth':
			return 'Labor market, GDP, and recession-risk signals';
		case 'fed':
			return 'Central bank stance, rates, and next meeting';
		case 'personal':
			return 'A cost-of-living rate weighted by your actual expenses';
		default:
			return 'Headline gauges, movers, and next print countdown';
	}
}

/** page.templ countryHref. */
export function countryHref(base: string, country: string): string {
	return `${base}?country=${country}`;
}

/** page.templ countryChipClass. */
export function countryChipClass(active: string, code: string): string {
	const base = 'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition';
	if (active === code) return base + ' border-[var(--color-tint)] bg-[var(--color-tint)]/10 font-semibold';
	return base + ' border-current/15 opacity-70 hover:opacity-100';
}

/** page.templ moverClass. */
export function moverClass(direction: string): string {
	switch (direction) {
		case 'down':
			return 'font-semibold text-success';
		case 'flat':
			return 'font-semibold text-muted-foreground';
		default:
			return 'font-semibold text-danger';
	}
}
