// The /expenses/year view model (expenses_data.go LoadYearViewModel), pure so
// it is unit tested. Spend has no currency of its own: the page passes the
// month's budget currency, else the account's, and the totals, the month
// cells and the chart tooltip all print in it (DS 2.0 money contract).

import { shortMonth } from '#lib/features/money/category-page/month.js';
import { money, signedPercent, type AppLocale } from '#lib/money.js';

export interface YearMonthRow {
	monthStart: string;
	actual: number;
	planned: number;
}

export interface YearRow {
	year: number;
	actual: number;
	planned: number;
}

export interface YearMonthVM {
	label: string;
	monthQuery: string;
	spent: string;
	planned: string;
	heatPct: number;
}

export interface YearViewModel {
	year: number;
	/** The spend currency; null when unknown (figures print " —", never "$"). */
	currency: string | null;
	totalSpent: string;
	totalPlanned: string;
	yoySpent: string;
	yoyPlanned: string;
	months: YearMonthVM[];
	labels: string[];
	values: number[];
}

type Fmt = { currency: string | null; locale: AppLocale };

/** formatYoYDelta: the change on last year, or this year's figure when there was none. */
function yoyDelta(previous: number, current: number, fmt: Fmt): string {
	if (previous <= 0 && current <= 0) return '-';
	if (previous <= 0) return money(current, fmt.currency, fmt.locale);
	return signedPercent((current - previous) / previous, fmt.locale, 2);
}

export function buildYearViewModel(
	monthRows: YearMonthRow[],
	yearRows: YearRow[],
	year: number,
	fmt: Fmt
): YearViewModel {
	const cash = (v: number) => money(v, fmt.currency, fmt.locale);
	const byMonth = new Map<number, YearMonthRow>();
	let maxSpent = 0;
	let totalSpent = 0;
	let totalPlanned = 0;
	for (const row of monthRows) {
		const m = Number(String(row.monthStart).slice(5, 7));
		byMonth.set(m, row);
		totalSpent += row.actual;
		totalPlanned += row.planned;
		if (row.actual > maxSpent) maxSpent = row.actual;
	}

	const months: YearMonthVM[] = [];
	const labels: string[] = [];
	const values: number[] = [];
	for (let m = 1; m <= 12; m++) {
		const label = shortMonth(m - 1);
		const row = byMonth.get(m);
		const spent = row?.actual ?? 0;
		const planned = row?.planned ?? 0;
		months.push({
			label,
			monthQuery: `${year}-${String(m).padStart(2, '0')}`,
			spent: cash(spent),
			planned: cash(planned),
			heatPct: maxSpent > 0 ? (spent / maxSpent) * 100 : 0
		});
		labels.push(label);
		values.push(spent);
	}

	const thisYear = yearRows.findLast((r) => r.year === year);
	const lastYear = yearRows.findLast((r) => r.year === year - 1);
	return {
		year,
		currency: fmt.currency,
		totalSpent: cash(totalSpent),
		totalPlanned: cash(totalPlanned),
		yoySpent: yoyDelta(lastYear?.actual ?? 0, thisYear?.actual ?? 0, fmt),
		yoyPlanned: yoyDelta(lastYear?.planned ?? 0, thisYear?.planned ?? 0, fmt),
		months,
		labels,
		values
	};
}
