// Helpers shared by the dashboard domain's view-model builders. Ports of the
// small utilities in norviq-web internal/handlers/dashboard_data.go.
//
// Go formatted times in the server's zone; the cluster runs in UTC, so these
// default to UTC as well.

import { formatFloat } from '#lib/format.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parts(t: Date, timeZone = 'UTC') {
	const f = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		hourCycle: 'h23',
		weekday: 'short'
	});
	const p: Record<string, string> = {};
	for (const x of f.formatToParts(t)) p[x.type] = x.value;
	return {
		year: Number(p.year),
		month: Number(p.month),
		day: Number(p.day),
		hour: Number(p.hour) % 24,
		minute: Number(p.minute),
		weekday: WEEKDAYS.indexOf(p.weekday)
	};
}

/**
 * The subset of Go's time.Format layouts this domain uses: "Jan", "Jan 2",
 * "Jan 2, 3:04 PM", "Jan 2, '06", "Mon, Jan 2", "2 Jan 2006", "Jan 2, 2006", "15:04", "3:04 PM".
 */
export function goFormat(t: Date, layout: string, timeZone = 'UTC'): string {
	const p = parts(t, timeZone);
	const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
	const tokens: Record<string, string> = {
		'2006': String(p.year),
		"'06": "'" + String(p.year % 100).padStart(2, '0'),
		Jan: MONTHS[p.month - 1],
		Mon: WEEKDAYS[p.weekday] ?? '',
		'15': String(p.hour).padStart(2, '0'),
		'04': String(p.minute).padStart(2, '0'),
		'02': String(p.day).padStart(2, '0'),
		'2': String(p.day),
		'3': String(h12),
		PM: p.hour >= 12 ? 'PM' : 'AM'
	};
	return layout.replace(/2006|'06|Jan|Mon|15|04|02|PM|2|3/g, (m) => tokens[m] ?? m);
}

/** handlers.relativeTimeSince. */
export function relativeTimeSince(t: Date, now: Date = new Date()): string {
	const d = now.getTime() - t.getTime();
	const minute = 60_000;
	const hour = 60 * minute;
	const day = 24 * hour;
	if (d < minute) return 'just now';
	if (d < hour) {
		const m = Math.floor(d / minute);
		return m === 1 ? '1 minute ago' : `${m} minutes ago`;
	}
	if (d < day) {
		const h = Math.floor(d / hour);
		return h === 1 ? '1 hour ago' : `${h} hours ago`;
	}
	if (d < 7 * day) {
		const n = Math.floor(d / day);
		return n === 1 ? '1 day ago' : `${n} days ago`;
	}
	return goFormat(t, 'Jan 2');
}

export const relativeTime = (t: Date) => relativeTimeSince(t, new Date());

/** handlers.clampPercent. */
export function clampPercent(v: number): number {
	if (v < 0) return 0;
	if (v > 100) return 100;
	return v;
}

/** dashboard.formatPercentWidth: "42.0%" for style widths. */
export function formatPercentWidth(p: number): string {
	return `${formatFloat(clampPercent(p), 1)}%`;
}

/** Parses a backend timestamp; null when absent or unparseable (Go's zero time). */
export function parseTime(raw: string | null | undefined): Date | null {
	if (!raw) return null;
	const d = new Date(raw);
	return Number.isNaN(d.getTime()) ? null : d;
}

/** "2006-01-02" in timeZone. */
export function isoDate(t: Date, timeZone = 'UTC'): string {
	const p = parts(t, timeZone);
	return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
