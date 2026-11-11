// The web view of one weekly digest, the page every "Open in Norviq" link in
// the digest email lands on. Section anchors, order and figures mirror
// norviq-backend-v2 internal/features/digest/render.go Sections, so the
// email's ?s=<anchor> always names a section that exists here. The email sets
// each section as sentences; the page sets the same numbers as rows so they
// can be compared at a glance.
import type { DigestPayload, DigestResponse } from './types.js';

export type DigestAnchor = 'holdings' | 'movers' | 'budget' | 'inflation' | 'earnings';
export type Direction = 'up' | 'down' | 'flat';

export interface HoldingRow {
	currency: string;
	value: string;
	change: string;
	changePercent: string | null;
	direction: Direction;
}

export interface MoverRow {
	symbol: string;
	changePercent: string;
	contribution: string;
	direction: Direction;
	why: string;
}

export interface BudgetRow {
	title: string;
	actual: string;
	target: string;
	drift: string;
	over: boolean;
}

export interface EarningRow {
	symbol: string;
	/** ISO date, YYYY-MM-DD. */
	date: string;
	/** True on the first row of each date, so the page prints a date once. */
	firstOfDate: boolean;
	timing: 'before-open' | 'after-close' | 'during' | null;
}

export type DigestSection =
	| {
			anchor: 'holdings';
			title: string;
			rows: HoldingRow[];
			priced: number;
			total: number;
	  }
	| { anchor: 'movers'; title: string; rows: MoverRow[] }
	| { anchor: 'budget'; title: string; monthStart: string; rows: BudgetRow[] }
	| {
			anchor: 'inflation';
			title: string;
			personal: string;
			official: string;
			country: string;
			asOf: string;
			above: boolean;
	  }
	| { anchor: 'earnings'; title: string; rows: EarningRow[] };

export interface DigestPageViewModel {
	headline: string;
	periodStart: string;
	periodEnd: string;
	narrative: string;
	sections: DigestSection[];
}

const numberFormat = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

const number = (value: number) => numberFormat.format(Math.abs(value));

function currencySymbol(code: string): string {
	switch (code.toUpperCase()) {
		case 'EUR':
			return '€';
		case 'USD':
			return '$';
		case 'GBP':
			return '£';
	}
	return code.toUpperCase();
}

/** Same text as the email: "€1,050.00", "-$3.00", "1,234.50 CHF". */
export function money(value: number, currency: string): string {
	const symbol = currencySymbol(currency);
	const sign = value < 0 ? '-' : '';
	if ([...symbol].length === 1) return sign + symbol + number(value);
	return sign + number(value) + ' ' + symbol;
}

export const signedMoney = (value: number, currency: string) =>
	(value > 0 ? '+' : '') + money(value, currency);

export const percent = (value: number) => (value < 0 ? '-' : '') + number(value) + '%';

export const signedPercent = (value: number) => (value > 0 ? '+' : '') + percent(value);

const direction = (value: number): Direction => (value > 0 ? 'up' : value < 0 ? 'down' : 'flat');

function timing(hour: string | null | undefined): EarningRow['timing'] {
	if (hour === 'bmo') return 'before-open';
	if (hour === 'amc') return 'after-close';
	if (hour === 'dmh') return 'during';
	return null;
}

export function buildSections(p: DigestPayload): DigestSection[] {
	const out: DigestSection[] = [];
	const holdings = p.holdings ?? [];
	if (holdings.length > 0) {
		out.push({
			anchor: 'holdings',
			title: 'Your holdings this week',
			rows: holdings.map((m) => ({
				currency: m.currency,
				value: money(m.endValue, m.currency),
				change: signedMoney(m.change, m.currency),
				changePercent: m.changePercent != null ? signedPercent(m.changePercent) : null,
				direction: direction(m.change)
			})),
			priced: p.pricedPositions,
			total: p.totalPositions
		});
	}
	const movers = p.movers ?? [];
	if (movers.length > 0) {
		out.push({
			anchor: 'movers',
			title: 'Top movers',
			rows: movers.map((m) => ({
				symbol: m.symbol,
				changePercent: signedPercent(m.changePercent),
				contribution: signedMoney(m.contribution, m.currency),
				direction: direction(m.contribution),
				why: m.why ?? ''
			}))
		});
	}
	if (p.budget) {
		const b = p.budget;
		out.push({
			anchor: 'budget',
			title: 'Spending vs budget',
			monthStart: b.monthStart,
			rows: (b.lines ?? []).map((l) => ({
				title: l.title,
				actual: money(l.actual, b.currency),
				target: money(l.target, b.currency),
				drift: money(Math.abs(l.drift), b.currency),
				over: l.drift > 0
			}))
		});
	}
	if (p.inflation) {
		const i = p.inflation;
		out.push({
			anchor: 'inflation',
			title: 'Your inflation',
			personal: percent(i.personalRate),
			official: percent(i.officialRate),
			country: i.country,
			asOf: i.asOf,
			above: i.personalRate > i.officialRate
		});
	}
	const earnings = [...(p.earnings ?? [])].sort(
		(a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol)
	);
	if (earnings.length > 0) {
		out.push({
			anchor: 'earnings',
			title: 'Next week',
			rows: earnings.map((e, i) => ({
				symbol: e.symbol,
				date: e.date,
				firstOfDate: i === 0 || earnings[i - 1].date !== e.date,
				timing: timing(e.hour)
			}))
		});
	}
	return out;
}

export function buildDigestPage(resp: DigestResponse): DigestPageViewModel {
	return {
		headline: resp.headline,
		periodStart: resp.periodStart,
		periodEnd: resp.periodEnd,
		narrative: resp.narrative ?? '',
		sections: buildSections(resp.payload)
	};
}

const ANCHORS: readonly string[] = ['holdings', 'movers', 'budget', 'inflation', 'earnings'];

/** The ?s= section to scroll to, only when it names a known anchor. */
export function focusAnchor(raw: string | null): DigestAnchor | null {
	return raw && ANCHORS.includes(raw) ? (raw as DigestAnchor) : null;
}

/** Parses YYYY-MM-DD as a calendar date (UTC midnight), so no timezone shifts the day. */
export function calendarDate(iso: string): Date | null {
	const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(iso);
	if (!m) return null;
	return new Date(Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1));
}

/** "2 – 8 November 2026" / "27 October – 2 November 2026", in the reader's locale. */
export function periodLabel(start: string, end: string, locale: string): string {
	const a = calendarDate(start);
	const b = calendarDate(end);
	if (!a || !b) return `${start} – ${end}`;
	const f = new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
	return f.formatRange(a, b);
}

/** "Mon 9 Nov" in the reader's locale; the raw value when it is not a date. */
export function dayLabel(iso: string, locale: string): string {
	const d = calendarDate(iso);
	if (!d) return iso;
	return new Intl.DateTimeFormat(locale, {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	}).format(d);
}

/** "October 2026" for a month start or a YYYY-MM inflation reading. */
export function monthLabel(iso: string, locale: string): string {
	const d = calendarDate(iso);
	if (!d) return iso;
	return new Intl.DateTimeFormat(locale, {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(d);
}
