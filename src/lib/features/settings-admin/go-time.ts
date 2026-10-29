// Go time.Format for the few layouts the settings pages use. The backend
// sends RFC 3339 UTC timestamps and the Go web formatted them without a
// zone conversion, so these format in UTC too. #lib/format.js has no date
// helpers yet; dedupe into it if another domain needs the same layouts.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parse(raw: string | null | undefined): Date | null {
	if (!raw) return null;
	const d = new Date(raw);
	if (Number.isNaN(d.getTime()) || d.getUTCFullYear() <= 1) return null; // Go IsZero
	return d;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "January 2, 2006"; '' for a missing or zero time (formatBillingDate). */
export function longDate(raw: string | null | undefined): string {
	const d = parse(raw);
	return d ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}` : '';
}

/** "Jan 2, 2006" */
export function shortDate(raw: string | null | undefined): string {
	const d = parse(raw);
	return d ? `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}, ${d.getUTCFullYear()}` : '';
}

/** "Jan 2, 2006 15:04" */
export function shortDateTime(raw: string | null | undefined): string {
	const d = parse(raw);
	return d ? `${shortDate(raw)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : '';
}
