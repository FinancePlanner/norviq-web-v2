import type { components } from '#lib/api/schema.js';
import { formatFloat } from '#lib/format.js';

// handlers/portfolio_change.go — rendering for the portfolio changes the
// backend computes. A change the backend could not compute is absent, and
// absent is not zero: no chip at all rather than a "0.0%".

type PortfolioChange = components['schemas']['PortfolioChange'];
type PortfolioChanges = components['schemas']['PortfolioChanges'];
type PerformancePoint = components['schemas']['PerformancePoint'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Civil date parts of a backend date ("2026-10-01" or an RFC 3339 timestamp, read in UTC like Go). */
function civil(raw: string): { y: number; m: number; d: number } {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
	if (m) return { y: +m[1], m: +m[2], d: +m[3] };
	const t = new Date(raw);
	return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function changeSuffix(change: PortfolioChange | null | undefined): string {
	if (!change) return '';
	switch (change.basis) {
		case 'previousTradingDay':
			return 'vs previous close';
		case 'week':
			return 'vs last week';
		case 'month':
			return 'vs last month';
		case 'ytd':
			return 'year to date';
		case 'inception':
			return 'since you started';
		default: {
			const c = civil(change.fromDate);
			return `since ${c.d} ${MONTHS[c.m - 1]} ${c.y}`;
		}
	}
}

export function formatChange(
	change: PortfolioChange | null | undefined
): { metric: string; suffix: string; positive: boolean; ok: boolean } {
	if (!change) return { metric: '', suffix: '', positive: false, ok: false };
	const positive = change.percent >= 0;
	const sign = positive ? '+' : '';
	return { metric: `${sign}${formatFloat(change.percent * 100, 1)}%`, suffix: changeSuffix(change), positive, ok: true };
}

export function formatChangeLabel(change: PortfolioChange | null | undefined): { label: string; positive: boolean; ok: boolean } {
	const { metric, suffix, positive, ok } = formatChange(change);
	if (!ok) return { label: '', positive: false, ok: false };
	return { label: suffix ? `${metric} ${suffix}` : metric, positive, ok: true };
}

export function primaryChange(changes: PortfolioChanges | null | undefined): PortfolioChange | null {
	if (!changes) return null;
	return changes.day ?? changes.week ?? changes.month ?? changes.sinceInception ?? null;
}

/** Labels "Jan 2", or "Jan 2, '06" when the series spans years. */
export function performancePointSeries(points: PerformancePoint[] | null | undefined): { labels: string[]; values: number[] } {
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
