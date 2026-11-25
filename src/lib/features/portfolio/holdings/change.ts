import type { components } from '#lib/api/schema.js';
import type { T } from '#lib/i18n/index.js';
import { signedPercent, type AppLocale } from '#lib/money.js';
import type { RangeKey } from '#lib/ranges.js';
import { civil, civilDateLabel, DAY_MS, isStale } from '#lib/as-of.js';

export { civilDateLabel, isStale };

// Portfolio series helpers. The backend's own `changes` are no longer shown:
// a change is measured over the series on screen (DS 2.0 P1, below), so it
// can't be labelled "vs previous close" while describing a fortnight.

type PerformancePoint = components['schemas']['PerformancePoint'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Labels "Jan 2", or "Jan 2, '06" when the series spans years. */
export function performancePointSeries(points: PerformancePoint[] | null | undefined): {
	labels: string[];
	values: number[];
} {
	if (!points?.length) return { labels: [], values: [] };
	const dates = points.map((p) => civil(p.date));
	const years = dates.map((d) => d.y);
	const multiYear = Math.max(...years) > Math.min(...years);
	const labels = dates.map((d) => {
		const base = `${MONTHS[d.m - 1]} ${d.d}`;
		return multiYear ? `${base}, '${String(d.y % 100).padStart(2, '0')}` : base;
	});
	return { labels, values: points.map((p) => p.value) };
}

// ---------------------------------------------------------------------------
// DS 2.0 P1: range changes computed from the fetched series. The backend's
// `changes` can describe a different window from the one on screen (a "day"
// change over a series that stopped a fortnight ago), so a figure shown next
// to a range chart is measured from that chart's own first and last point and
// labelled with the range, never "vs previous close".

export type PerfRange = Extract<RangeKey, '1W' | '1M' | '3M' | '1Y' | 'ALL'>;

export interface RangeChange {
	absolute: number;
	/** Fractional: 0.0321 is +3.2%. */
	fraction: number;
	fromDate: string;
	toDate: string;
}

/** First point to last point; null under 3 points or from a start of 0 or less. */
export function rangeChange(points: { date: string; value: number }[]): RangeChange | null {
	if (points.length < 3) return null;
	const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
	const first = sorted[0];
	const last = sorted[sorted.length - 1];
	if (!(first.value > 0)) return null;
	const absolute = last.value - first.value;
	return {
		absolute,
		fraction: absolute / first.value,
		fromDate: first.date,
		toDate: last.date
	};
}

/** The basis label of a range change: "1 month", or "since 27 Oct 2026" for ALL. */
export function rangeBasis(
	range: PerfRange,
	fromDate: string,
	t: T,
	locale: AppLocale = 'en'
): string {
	switch (range) {
		case '1W':
			return t('1 week');
		case '1M':
			return t('1 month');
		case '3M':
			return t('3 months');
		case '1Y':
			return t('1 year');
		default:
			return t('since %@', civilDateLabel(fromDate, locale));
	}
}

/** How far back each range nominally reaches, as calendar parts. */
const RANGE_SPAN: Record<
	Exclude<PerfRange, 'ALL'>,
	{ years: number; months: number; days: number }
> = {
	'1W': { years: 0, months: 0, days: 7 },
	'1M': { years: 0, months: 1, days: 0 },
	'3M': { years: 0, months: 3, days: 0 },
	'1Y': { years: 1, months: 0, days: 0 }
};

/** Slack before a late first point stops counting as the range's start (weekends, holidays). */
const BASIS_SLACK_DAYS = 3;

/**
 * The honest basis of a range change. A series whose first point is more than
 * 3 days after the range's nominal start does not measure "1 year" (10 days of
 * history with 1Y selected), so it is dated instead: "since 14 Nov 2026".
 */
export function changeBasis(
	range: PerfRange,
	fromDate: string,
	now: Date,
	t: T,
	locale: AppLocale = 'en'
): string {
	return basisIsDated(range, fromDate, now)
		? rangeBasis('ALL', fromDate, t, locale)
		: rangeBasis(range, fromDate, t, locale);
}

/** Whether changeBasis dates the change ("since …") rather than naming the range. */
export function basisIsDated(range: PerfRange, fromDate: string, now: Date): boolean {
	if (range === 'ALL') return true;
	const span = RANGE_SPAN[range];
	const nominal = Date.UTC(
		now.getUTCFullYear() - span.years,
		now.getUTCMonth() - span.months,
		now.getUTCDate() - span.days
	);
	const c = civil(fromDate);
	return (Date.UTC(c.y, c.m - 1, c.d) - nominal) / DAY_MS > BASIS_SLACK_DAYS;
}

/**
 * The change in words, for a chart's accessible name: "Portfolio up 3.2% over
 * 1 month", or "… since 14 Nov 2026" for a dated basis.
 */
export function changeSummary(
	fraction: number,
	basis: string,
	dated: boolean,
	t: T,
	locale: AppLocale
): string {
	const pct = signedPercent(Math.abs(fraction), locale).replace(/^\+/, '');
	if (fraction > 0)
		return dated ? t('Portfolio up %@ %@', pct, basis) : t('Portfolio up %@ over %@', pct, basis);
	if (fraction < 0)
		return dated
			? t('Portfolio down %@ %@', pct, basis)
			: t('Portfolio down %@ over %@', pct, basis);
	return dated ? t('Portfolio flat %@', basis) : t('Portfolio flat over %@', basis);
}
