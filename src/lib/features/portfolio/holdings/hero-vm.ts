// The holdings hero (DS 2.0 P1, spec § 2.0 A1/A2 and § 9.1 item 2): the
// portfolio figure in the data's currency, a change measured over the range on
// screen, and honest states when the history is stale, too short or in more
// than one currency. Pure, so it is unit tested; holdings.server.ts feeds it.

import type { components } from '#lib/api/schema.js';
import type { T } from '#lib/i18n/index.js';
import { money, signedMoney, signedPercent, type AppLocale } from '#lib/money.js';
import type { AccountCurrency } from '../account-currency.js';
import {
	civilDateLabel,
	isStale,
	performancePointSeries,
	basisIsDated,
	changeBasis,
	changeSummary,
	rangeChange,
	type PerfRange
} from './change.js';

type Schemas = components['schemas'];

/** No "1D": history is recorded once a day. */
export const PERF_RANGES: PerfRange[] = ['1W', '1M', '3M', '1Y', 'ALL'];

/** portfolioRedirectURLForPortfolio (url.Values.Encode sorts keys). */
export function portfolioRedirectURLForPortfolio(timeRange: string, portfolioID: string): string {
	const values = new URLSearchParams();
	if (portfolioID !== '') values.set('portfolio', portfolioID);
	if (timeRange !== '' && timeRange !== '1M') values.set('range', timeRange);
	values.sort();
	const qs = values.toString();
	return qs ? '/portfolio?' + qs : '/portfolio';
}

export interface HeroDeltaVM {
	text: string;
	basis: string;
	direction: 'up' | 'down' | 'flat';
}

export interface RangeLinkVM {
	range: PerfRange;
	href: string;
	current: boolean;
}

export interface HoldingsHeroVM {
	heroLabel: string;
	/** The one figure; '' when the portfolio holds more than one currency. */
	totalValue: string;
	/** Per-currency subtotals, shown instead of a total that would add currencies. */
	subtotals: string[] | null;
	mixedCaption: string | null;
	/** The currency every single-currency figure on the page uses; null when unknown or mixed. */
	currency: string | null;
	/** The portfolio's (or account's) base currency, even when the holdings are mixed. */
	baseCurrency: string | null;
	delta: HeroDeltaVM | null;
	asOfCaption: string | null;
	/** Shown in place of the chart when the series is too short to draw a trend. */
	historyNote: string | null;
	chart: { labels: string[]; values: number[] } | null;
	/** The chart's accessible name: "Portfolio up 3.2% over 1 month". */
	chartSummary: string | null;
	rangeLinks: RangeLinkVM[];
}

/** One holding's market value in its own (quote) currency; null when the quote names none. */
export interface HoldingValue {
	currency: string | null;
	value: number;
}

export interface HoldingsHeroInput {
	performance: Schemas['PortfolioPerformanceResponse'] | null;
	summary: Schemas['PortfolioSummaryResponse'] | null;
	/** What the holdings cost; the figure when the summary (market value) is missing. */
	costBasis: number;
	/**
	 * Each holding's market value in its quote currency. The summary's allocation
	 * stamps every row with the base currency (API bug B3), so the quotes decide
	 * whether a portfolio holds more than one currency.
	 */
	holdings: HoldingValue[];
	/** The currency the account's portfolios share (GET /v1/portfolios), for an unscoped page. */
	accountCurrency: AccountCurrency;
	/** Whether the API calls were scoped to one portfolio; defaults to a non-empty portfolioID. */
	scoped?: boolean;
	range: PerfRange;
	portfolioID: string;
	locale: AppLocale;
	now: Date;
	t: T;
}

const code = (c: string | null | undefined) => (c ?? '').trim().toUpperCase();

/**
 * Sums market value per currency, in first-seen order: each holding in its own
 * quote currency (null: the base), and cash in the base currency.
 */
function subtotalsByCurrency(
	holdings: HoldingValue[],
	base: string | null,
	cash: number
): Map<string | null, number> {
	const out = new Map<string | null, number>();
	const add = (c: string | null, v: number) => out.set(c, (out.get(c) ?? 0) + v);
	for (const h of holdings) add(code(h.currency) || base, h.value);
	if (cash !== 0) add(base, cash);
	return out;
}

export function buildHoldingsHeroVM(input: HoldingsHeroInput): HoldingsHeroVM {
	const { performance, summary, range, portfolioID, locale, now, t } = input;
	const vm: HoldingsHeroVM = {
		heroLabel: summary ? t('Portfolio value') : t('Portfolio value at cost'),
		totalValue: '',
		subtotals: null,
		mixedCaption: null,
		currency: null,
		baseCurrency: null,
		delta: null,
		asOfCaption: null,
		historyNote: null,
		chart: null,
		chartSummary: null,
		rangeLinks: PERF_RANGES.map((r) => ({
			range: r,
			href: portfolioRedirectURLForPortfolio(r, portfolioID),
			current: r === range
		}))
	};

	// Scoped to one portfolio, its own baseCurrency is data. Unscoped, the API
	// answers a default "USD", so the account's portfolios decide.
	const scoped = input.scoped ?? portfolioID !== '';
	const base = scoped
		? code(summary?.baseCurrency) || code(performance?.baseCurrency) || null
		: input.accountCurrency.currency;
	vm.baseCurrency = base;
	const cash = summary?.cashBalance ?? 0;
	const byCurrency = subtotalsByCurrency(input.holdings, base, cash);
	const mixed = (!scoped && input.accountCurrency.mixed) || byCurrency.size > 1;
	if (mixed) {
		// § 9.1 item 2: never one total that silently adds currencies, and no
		// chart or change computed from such a total.
		vm.subtotals = [...byCurrency].map(([c, v]) => money(v, c, locale));
		vm.mixedCaption = t('Not converted. A combined total needs exchange rates (coming).');
		return vm;
	}

	const currency = base;
	vm.currency = currency;
	vm.totalValue = money(summary ? summary.totalValue : input.costBasis + cash, currency, locale);

	const points = performance?.points ?? [];
	if (points.length === 0) return vm;
	const last = points.reduce((a, b) => (b.date > a.date ? b : a));
	if (isStale(last.date, now)) {
		vm.asOfCaption = t('Prices as of %@', civilDateLabel(last.date, locale));
		return vm;
	}
	const change = rangeChange(points);
	if (!change) {
		vm.historyNote = t('Not enough history for a trend yet.');
		return vm;
	}
	vm.chart = performancePointSeries(points);
	vm.delta = {
		text: `${signedMoney(change.absolute, currency, locale)} (${signedPercent(change.fraction, locale)})`,
		basis: changeBasis(range, change.fromDate, now, t, locale),
		direction: change.absolute > 0 ? 'up' : change.absolute < 0 ? 'down' : 'flat'
	};
	vm.chartSummary = changeSummary(
		change.fraction,
		vm.delta.basis,
		basisIsDated(range, change.fromDate, now),
		t,
		locale
	);
	return vm;
}
