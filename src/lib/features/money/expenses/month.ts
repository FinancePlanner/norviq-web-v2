// Month helpers from norviq-web internal/handlers/expenses_data.go. Months are
// UTC first-of-month dates, exactly like Go's parseExpensesMonth.

export const MONTH_NAMES = [
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

export interface Month {
	year: number;
	/** 1–12 */
	month: number;
}

function nowMonth(): Month {
	const now = new Date();
	return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

/** parseExpensesMonth: "2006-01" or "2006-01-02", else the current UTC month. */
export function parseExpensesMonth(raw: string | null | undefined): Month {
	const v = (raw ?? '').trim();
	if (!v) return nowMonth();
	const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(v);
	if (m) {
		const year = Number(m[1]);
		const month = Number(m[2]);
		const day = m[3] ? Number(m[3]) : 1;
		const daysIn = new Date(Date.UTC(year, month, 0)).getUTCDate();
		if (month >= 1 && month <= 12 && day >= 1 && day <= daysIn) return { year, month };
	}
	return nowMonth();
}

export function addMonths(m: Month, delta: number): Month {
	const d = new Date(Date.UTC(m.year, m.month - 1 + delta, 1));
	return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** monthQueryString: "2006-01". */
export const monthQueryString = (m: Month) => `${m.year}-${pad(m.month)}`;

/** month.Format("January 2006"). */
export const monthLabel = (m: Month) => `${MONTH_NAMES[m.month - 1]} ${m.year}`;

/** First day as an openapi Date ("2006-01-02"). */
export const monthStartDate = (m: Month) => `${m.year}-${pad(m.month)}-01`;

/** monthDateRange: first and last day of the month. */
export function monthDateRange(m: Month): [string, string] {
	const last = new Date(Date.UTC(m.year, m.month, 0)).getUTCDate();
	return [monthStartDate(m), `${m.year}-${pad(m.month)}-${pad(last)}`];
}

/** expensesPlannerURL */
export const expensesPlannerURL = (m: Month) => '/expenses?month=' + monthQueryString(m);

/** categoryURL: lowercased pillar segment. */
export const categoryURL = (pillarKey: string, m: Month) =>
	`/expenses/categories/${pillarKey.trim().toLowerCase()}?month=${monthQueryString(m)}`;

/** Format an openapi Date ("2006-01-02") with Go layouts "Jan 2" / "Jan 2006". */
export function formatDateShort(date: string, layout: 'Jan 2' | 'Jan 2006'): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '');
	if (!m) return date ?? '';
	const mon = MONTH_NAMES[Number(m[2]) - 1]?.slice(0, 3) ?? '';
	return layout === 'Jan 2' ? `${mon} ${Number(m[3])}` : `${mon} ${m[1]}`;
}

/** time.Parse("2006-01-02", v) validity. */
export function isISODate(v: string): boolean {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
	if (!m) return false;
	const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
	return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() + 1 === Number(m[2]) && d.getUTCDate() === Number(m[3]);
}
