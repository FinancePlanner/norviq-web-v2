import type { RequestEvent } from '@sveltejs/kit';
import { apiJSON, isAPIError, type RawOptions } from '#lib/server/api.js';

// The Go handlers use oapi-codegen's *WithResponse clients: `err != nil` only
// on a transport (or decode) failure, while a non-2xx answer comes back as a
// response with a nil JSON200. Several pages treat those two differently
// (LoadError vs. "no data"), so keep the distinction.
export interface Fetched<T> {
	data: T | null;
	/** Go `err != nil`: the request never produced a usable response. */
	failed: boolean;
	/** HTTP status when the backend answered (0 on transport failure). */
	status: number;
}

export async function tryJSON<T>(
	event: RequestEvent,
	method: string,
	path: string,
	input?: unknown,
	opts: RawOptions = {}
): Promise<Fetched<T>> {
	try {
		const data = await apiJSON<T>(event, method, path, input, opts);
		return { data: data ?? null, failed: false, status: 200 };
	} catch (err) {
		if (isAPIError(err)) return { data: null, failed: false, status: err.status };
		console.warn('backend request failed', method, path, err);
		return { data: null, failed: true, status: 0 };
	}
}

/** handlers.labelTitle: upper-case the first byte. */
export function labelTitle(s: string): string {
	if (!s) return '';
	return s[0].toUpperCase() + s.slice(1);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

/** Parse "2006-01-02" (or an RFC 3339 string's date part) as a UTC civil date. */
export function civilDate(raw: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
	if (!m) return null;
	return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

/** Go time.Format("Jan 2") on a UTC date. */
export function formatJan2(d: Date): string {
	return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Go time.Format("Jan 2, 2006") on a UTC date. */
export function formatJan2Year(d: Date): string {
	return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Go time.Format("2006-01-02") on a UTC date. */
export function formatISODate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export const monthAbbrev = (monthIndex: number) => MONTHS[monthIndex];
