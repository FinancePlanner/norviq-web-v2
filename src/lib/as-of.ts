import { intlLocale, type AppLocale } from '#lib/money.js';

// Civil-date helpers shared by change.ts and the vigil money components. Dates
// are read in UTC so SSR on Workers and the browser agree.

/** Civil date parts of a backend date ("2026-10-01" or an RFC 3339 timestamp, read in UTC like Go). */
export function civil(raw: string): { y: number; m: number; d: number } {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
	if (m) return { y: +m[1], m: +m[2], d: +m[3] };
	const t = new Date(raw);
	return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/** True when lastDate is more than maxDays calendar days (UTC) before now. */
export function isStale(lastDate: string, now: Date, maxDays = 4): boolean {
	const c = civil(lastDate);
	if (!Number.isFinite(c.y)) return true;
	const last = Date.UTC(c.y, c.m - 1, c.d);
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return (today - last) / DAY_MS > maxDays;
}

const monthFormats = new Map<AppLocale, Intl.DateTimeFormat>();

/** "11 Nov 2026" / "11 nov. 2026": d MMM yyyy in the locale, the date read in UTC. */
export function civilDateLabel(raw: string, locale: AppLocale): string {
	const c = civil(raw);
	if (!Number.isFinite(c.y)) return raw;
	let f = monthFormats.get(locale);
	if (!f) {
		f = new Intl.DateTimeFormat(intlLocale(locale), { month: 'short', timeZone: 'UTC' });
		monthFormats.set(locale, f);
	}
	return `${c.d} ${f.format(new Date(Date.UTC(c.y, c.m - 1, 1)))} ${c.y}`;
}
