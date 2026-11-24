// The money figures of Overview and Pulse (DS 2.0 P1, spec § 2.0 A1, A2, A9,
// A18 and § 9.1 item 8). Pure, so it is unit tested; load.server.ts feeds it.
//
// - One currency for the page: the account's (the baseCurrency its portfolios
//   share, from /v1/portfolios). The unscoped performance baseCurrency is a
//   backend default, not data, so it is never used. The
//   expenses API carries no currency, so spend is shown in this month's
//   budget currency when there is a budget, and in the account's otherwise.
// - The portfolio change is measured over the series fetched for the Pulse
//   range (first point to last), labelled with that range, and hidden when the
//   series is stale or too short.
// - The Pulse range also bounds the monthly spend tile.

import type { components } from '#lib/api/schema.js';
import type { T } from '#lib/i18n/index.js';
import { money, signedPercent, type AppLocale } from '#lib/money.js';
import * as timerange from '#lib/timerange.js';
import {
	civilDateLabel,
	isStale,
	performancePointSeries,
	basisIsDated,
	changeBasis,
	changeSummary,
	rangeBasis,
	rangeChange,
	type PerfRange
} from '../../portfolio/holdings/change.js';
import { goFormat, parseTime } from '../shared.js';
import type { SeriesData } from './types.js';

type S = components['schemas'];

/** The portfolio range whose series covers a Pulse period. */
export function perfRangeForKey(k: timerange.Key): PerfRange {
	switch (k) {
		case timerange.Last30d:
			return '1M';
		case timerange.Last12mo:
		case timerange.YTD:
			return '1Y';
		default:
			return '1W';
	}
}

export interface OverviewFiguresInput {
	dash: S['DashboardResponse'] | null;
	/** This month's budget snapshot currencyCode; null without a budget. */
	budgetCurrency: string | null;
	/** The currency the account's portfolios share; null when they differ or are unknown. */
	accountCurrency: string | null;
	performance: Pick<S['PortfolioPerformanceResponse'], 'baseCurrency' | 'points'> | null;
	reports: S['ReportsOverviewResponse'] | null;
	rng: timerange.Key;
	locale: AppLocale;
	now: Date;
	t: T;
}

export interface OverviewDeltaVM {
	text: string;
	basis: string;
	positive: boolean;
}

export interface OverviewFigures {
	/** The portfolio figures' currency; null when unknown (figures then print " —", never "$"). */
	currency: string | null;
	/** The spend figures' currency: the budget's, else the account's. */
	spendCurrency: string | null;
	totalWealth: string;
	delta: OverviewDeltaVM | null;
	/** "+3.2% 1 month": the delta and its basis, for the attention card. */
	portfolioPeriodPercent: string;
	portfolioPeriodSuffix: string;
	portfolioPeriodPositive: boolean;
	asOfCaption: string | null;
	wealthChart: SeriesData | null;
	/** Shown instead of the wealth chart when its history is stale or too short. */
	wealthChartNote: string | null;
	/** The wealth chart's accessible name: "Portfolio up 3.2% over 1 month". */
	wealthChartSummary: string | null;
	spendingThisMonth: string;
	spendingChart: SeriesData | null;
	/** Shown instead of the monthly spend chart when the range covers a single month. */
	spendingChartNote: string | null;
	spendingPeriodPercent: string;
	spendingPeriodSuffix: string;
	spendingPeriodPositive: boolean;
}

/** Monthly summaries whose month overlaps the Pulse window, oldest first. */
function spendingSeries(
	summaries: S['BudgetMonthSummaryResponse'][] | undefined,
	rng: timerange.Key,
	now: Date
): SeriesData {
	if (!summaries?.length) return { labels: [], values: [] };
	const { from, to } = timerange.window(rng, now);
	const firstMonth = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1);
	const rows = summaries
		.map((r) => ({ r, at: parseTime(r.monthStart) }))
		.filter((x): x is { r: S['BudgetMonthSummaryResponse']; at: Date } => x.at !== null)
		.filter((x) => x.at.getTime() >= firstMonth && x.at.getTime() < to.getTime())
		.sort((a, b) => a.at.getTime() - b.at.getTime());
	return {
		labels: rows.map((x) => goFormat(x.at, 'Jan')),
		values: rows.map((x) => Math.max(0, x.r.actual))
	};
}

function monthOverMonthChange(values: number[]): number | null {
	if (values.length < 2) return null;
	const prev = values[values.length - 2];
	const last = values[values.length - 1];
	if (prev <= 0) return null;
	return (last - prev) / prev;
}

export function buildOverviewFigures(input: OverviewFiguresInput): OverviewFigures {
	const { dash, performance, reports, rng, locale, now, t } = input;
	const currency = (input.accountCurrency ?? '').trim().toUpperCase() || null;
	const spendCurrency = (input.budgetCurrency ?? '').trim().toUpperCase() || currency;
	const f: OverviewFigures = {
		currency,
		spendCurrency,
		totalWealth: '',
		delta: null,
		portfolioPeriodPercent: '',
		portfolioPeriodSuffix: '',
		portfolioPeriodPositive: false,
		asOfCaption: null,
		wealthChart: null,
		wealthChartNote: null,
		wealthChartSummary: null,
		spendingThisMonth: '',
		spendingChart: null,
		spendingChartNote: null,
		spendingPeriodPercent: '',
		spendingPeriodSuffix: '',
		spendingPeriodPositive: false
	};

	let totalValue = dash?.portfolio?.totalMarketValue ?? 0;
	if (totalValue <= 0 && reports) totalValue = reports.portfolioStatistics?.totalMarketValue ?? 0;
	f.totalWealth = money(totalValue, currency, locale);

	let points = performance?.points ?? [];
	if (rng === timerange.YTD) {
		const jan1 = `${now.getUTCFullYear()}-01-01`;
		points = points.filter((p) => p.date.slice(0, 10) >= jan1);
	}
	if (points.length > 0) {
		f.wealthChart = performancePointSeries(points);
		const last = points.reduce((a, b) => (b.date > a.date ? b : a));
		const change = rangeChange(points);
		if (isStale(last.date, now)) {
			f.asOfCaption = t('Prices as of %@', civilDateLabel(last.date, locale));
			f.wealthChartNote = f.asOfCaption;
		} else if (!change) {
			f.wealthChartNote = t('Not enough history for a trend yet.');
		} else {
			// YTD is a filtered 1Y series, so it is dated rather than called "1 year".
			const dated =
				rng === timerange.YTD || basisIsDated(perfRangeForKey(rng), change.fromDate, now);
			const basis = dated
				? rangeBasis('ALL', change.fromDate, t, locale)
				: changeBasis(perfRangeForKey(rng), change.fromDate, now, t, locale);
			f.wealthChartSummary = changeSummary(change.fraction, basis, dated, t, locale);
			f.delta = {
				text: signedPercent(change.fraction, locale),
				basis,
				positive: change.fraction > 0
			};
			f.portfolioPeriodPercent = `${f.delta.text} ${basis}`;
			f.portfolioPeriodSuffix = basis;
			f.portfolioPeriodPositive = f.delta.positive;
		}
	}

	if (reports) {
		if (reports.latestMonthSummary)
			f.spendingThisMonth = money(reports.latestMonthSummary.actual, spendCurrency, locale);
		const series = spendingSeries(reports.monthlySummaries, rng, now);
		if (series.labels.length > 0) {
			const change = monthOverMonthChange(series.values);
			if (change !== null) {
				f.spendingPeriodPositive = change >= 0;
				f.spendingPeriodSuffix = t('vs last month');
				f.spendingPeriodPercent = `${signedPercent(change, locale)} ${f.spendingPeriodSuffix}`;
			}
			// One month is one point, and a line needs two.
			if (series.labels.length >= 2) f.spendingChart = series;
			else
				f.spendingChartNote = t('This range covers one month. Choose a longer range for a trend.');
		}
	}
	return f;
}
