// Go time.Format layouts the integrations/banks handlers use. The Go web ran
// in-cluster on UTC, so these format in UTC too.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jan 2, 2006" */
export function formatGoDate(d: Date): string {
	return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Jan 2, 2006 3:04 PM" */
export function formatGoDateTime(d: Date): string {
	const h24 = d.getUTCHours();
	const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
	const mm = String(d.getUTCMinutes()).padStart(2, '0');
	return `${formatGoDate(d)} ${h12}:${mm} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** handlers.formatRelativeTime (dashboard_mcp_status.go). */
export function formatRelativeTime(t: Date, now: Date = new Date()): string {
	let d = now.getTime() - t.getTime();
	if (d < 0) d = 0;
	const sec = 1000;
	const min = 60 * sec;
	const hour = 60 * min;
	if (d < 45 * sec) return 'Just now';
	if (d < 90 * sec) return '1 min ago';
	if (d < 45 * min) return `${Math.trunc(d / min)} min ago`;
	if (d < 90 * min) return '1 hour ago';
	if (d < 36 * hour) return `${Math.trunc(d / hour)} hours ago`;
	if (d < 60 * hour) return '1 day ago';
	if (d < 14 * 24 * hour) return `${Math.trunc(d / hour / 24)} days ago`;
	return formatGoDate(t);
}

/** Parse an optional RFC 3339 timestamp; null when absent or invalid. */
export function parseTime(raw: string | null | undefined): Date | null {
	if (!raw) return null;
	const d = new Date(raw);
	return Number.isNaN(d.getTime()) ? null : d;
}
