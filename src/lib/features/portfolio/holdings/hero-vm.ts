// The holdings hero (DS 2.0 P1, spec § 2.0 A1/A2 and § 9.1 item 2): the
// portfolio figure in the data's currency, a change measured over the range on
// screen, and honest states when the history is stale, too short or in more
// than one currency. Pure, so it is unit tested; holdings.server.ts feeds it.

import type { components } from '#lib/api/schema.js';
import type { T } from '#lib/i18n/index.js';
import { money, signedMoney, signedPercent, type AppLocale } from '#lib/money.js';
import {
	civilDateLabel,
	isStale,
	performancePointSeries,
	rangeBasis,
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
	delta: HeroDeltaVM | null;
	asOfCaption: string | null;
	/** Shown in place of the chart when the series is too short to draw a trend. */
	historyNote: string | null;
	chart: { labels: string[]; values: number[] } | null;
	rangeLinks: RangeLinkVM[];
}

export interface HoldingsHeroInput {
	performance: Schemas['PortfolioPerformanceResponse'] | null;
	summary: Schemas['PortfolioSummaryResponse'] | null;
	/** What the holdings cost; the figure when the summary (market value) is missing. */
	costBasis: number;
	range: PerfRange;
	portfolioID: string;
	locale: AppLocale;
	now: Date;
	t: T;
}

const code = (c: string | null | undefined) => (c ?? '').trim().toUpperCase();

/** Sums the allocation per currency, in first-seen order. Cash is an allocation row. */
function subtotalsByCurrency(allocation: Schemas['AllocationItem'][]): Map<string, number> {
	const out = new Map<string, number>();
	for (const a of allocation) {
		const c = code(a.currency);
		if (c === '') continue;
		out.set(c, (out.get(c) ?? 0) + a.value);
	}
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
		delta: null,
		asOfCaption: null,
		historyNote: null,
		chart: null,
		rangeLinks: PERF_RANGES.map((r) => ({
			range: r,
			href: portfolioRedirectURLForPortfolio(r, portfolioID),
			current: r === range
		}))
	};

	const byCurrency = subtotalsByCurrency(summary?.allocation ?? []);
	if (byCurrency.size > 1) {
		// § 9.1 item 2: never one total that silently adds currencies, and no
		// chart or change computed from such a total.
		vm.subtotals = [...byCurrency].map(([c, v]) => money(v, c, locale));
		vm.mixedCaption = t('Not converted. A combined total needs exchange rates (coming).');
		return vm;
	}

	const currency =
		code(summary?.baseCurrency) ||
		[...byCurrency.keys()][0] ||
		code(performance?.baseCurrency) ||
		null;
	vm.currency = currency;
	const cash = summary?.cashBalance ?? 0;
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
		basis: rangeBasis(range, change.fromDate, t, locale),
		direction: change.absolute > 0 ? 'up' : change.absolute < 0 ? 'down' : 'flat'
	};
	return vm;
}
