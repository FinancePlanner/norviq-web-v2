// Go time layouts and formatRelativeTime (norviq-web
// internal/handlers/dashboard_mcp_status.go), used by the API access and AI
// providers pages. Times come from the backend as RFC 3339 UTC, and Go formats
// them in the zone they were parsed in, so UTC here too.
// TODO(dedupe): the dashboard MCP status port needs formatRelativeTime as well.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Go layout "Jan 2, 2006". */
export function formatMonthDayYear(t: Date): string {
	return `${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}, ${t.getUTCFullYear()}`;
}

/** Go layout "2 Jan 2006". */
export function formatDayMonthYear(t: Date): string {
	return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export function formatRelativeTime(t: Date, now: Date): string {
	let d = now.getTime() - t.getTime();
	if (d < 0) d = 0;
	if (d < 45 * SECOND) return 'Just now';
	if (d < 90 * SECOND) return '1 min ago';
	if (d < 45 * MINUTE) return `${Math.trunc(d / MINUTE)} min ago`;
	if (d < 90 * MINUTE) return '1 hour ago';
	if (d < 36 * HOUR) return `${Math.trunc(d / HOUR)} hours ago`;
	if (d < 60 * HOUR) return '1 day ago';
	if (d < 14 * 24 * HOUR) return `${Math.trunc(d / HOUR / 24)} days ago`;
	return formatMonthDayYear(t);
}
