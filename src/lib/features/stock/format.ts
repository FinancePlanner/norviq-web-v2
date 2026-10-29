// Go helpers from internal/handlers used by the stock detail page
// (stock_detail_data.go, stock_detail_tabs_data.go, app.go). Same names and
// output; shared by every tab under features/stock.

import { formatCompactCurrency, formatCurrency, formatFloat, formatSignedPercent, changeClass } from '#lib/format.js';
import { shortDate } from '#lib/features/settings-admin/go-time.js';

type Num = number | null | undefined;

/** labelTitle (app.go): first byte upper-cased. */
export function labelTitle(s: string): string {
	if (!s) return '';
	return s[0].toUpperCase() + s.slice(1);
}

/** formatOptionalNumber: "%.2f" or "-". */
export function formatOptionalNumber(value: Num): string {
	if (value == null) return '-';
	return formatFloat(value, 2);
}

/** formatOptionalCurrency: formatCurrency or "-". */
export function formatOptionalCurrency(value: Num): string {
	if (value == null) return '-';
	return formatCurrency(value);
}

/** formatOptionalCompactCurrency: formatCompactCurrency or "-". */
export function formatOptionalCompactCurrency(value: Num): string {
	if (value == null) return '-';
	return formatCompactCurrency(value);
}

/** formatOptionalRatioPercent: fractions in (-1, 1) are scaled to percent; "%.1f%%" or "-". */
export function formatOptionalRatioPercent(value: Num): string {
	if (value == null) return '-';
	let v = value;
	if (v > -1 && v < 1 && v !== 0) v *= 100;
	return formatFloat(v, 1) + '%';
}

/** formatOptionalSignedPercent (stock_detail_data.go): ["—", ""] when missing. */
export function formatOptionalSignedPercent(value: Num): [string, string] {
	if (value == null) return ['—', ''];
	return [formatSignedPercent(value), changeClass(value)];
}

/** time.Format("Jan 2, 2006") of an RFC 3339 date or date-time (UTC, as Go). */
export function goDate(raw: string | null | undefined): string {
	return shortDate(raw);
}

/** time.Format("2006-01-02"). */
export function isoDate(raw: string | null | undefined): string {
	return (raw ?? '').slice(0, 10);
}

/** derefString: trimmed, '' for null. */
export function derefString(s: string | null | undefined): string {
	return (s ?? '').trim();
}

/** optionalString (stock_detail_data.go): trimmed or "-". */
export function optionalString(value: string | null | undefined): string {
	const t = (value ?? '').trim();
	return t === '' ? '-' : t;
}

/** positionSymbolInitial (portfolio_data.go). */
export function positionSymbolInitial(symbol: string): string {
	const s = symbol.trim();
	return s === '' ? '?' : s[0].toUpperCase();
}
