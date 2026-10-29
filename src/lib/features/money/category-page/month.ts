// Month helpers from norviq-web internal/handlers/expenses_data.go, used by the
// pillar, year, bulk and PDF routes. Months are UTC month starts, as in Go.

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

function validDate(y: number, m: number, d: number): boolean {
	if (m < 1 || m > 12 || d < 1) return false;
	return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function currentMonth(): Date {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** parseExpensesMonth: "2006-01" or "2006-01-02", else the current UTC month. */
export function parseExpensesMonth(raw: string | null | undefined): Date {
	const value = (raw ?? '').trim();
	let m = /^(\d{4})-(\d{2})$/.exec(value);
	if (m && validDate(+m[1], +m[2], 1)) return new Date(Date.UTC(+m[1], +m[2] - 1, 1));
	m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (m && validDate(+m[1], +m[2], +m[3])) return new Date(Date.UTC(+m[1], +m[2] - 1, 1));
	return currentMonth();
}

/** month.Format("2006-01") */
export function monthQueryString(month: Date): string {
	return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** month.Format("January 2006") */
export function monthLabel(month: Date): string {
	return `${MONTHS[month.getUTCMonth()]} ${month.getUTCFullYear()}`;
}

/** month.Format("Jan") */
export function shortMonth(monthIndex0: number): string {
	return MONTHS[monthIndex0].slice(0, 3);
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** monthDateRange: first and last day of the month, as API dates. */
export function monthDateRange(month: Date): { from: string; to: string } {
	const start = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
	const end = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
	return { from: isoDate(start), to: isoDate(end) };
}

export function expensesPlannerURL(month: Date): string {
	return '/expenses?month=' + monthQueryString(month);
}

/** row.OccurredOn.Format("Jan 02") for an API date ("2006-01-02" or RFC 3339). */
export function shortDate(raw: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
	if (!m) return raw;
	return `${shortMonth(+m[2] - 1)} ${m[3]}`;
}

export function clampPercent(v: number): number {
	if (v < 0) return 0;
	if (v > 100) return 100;
	return v;
}
