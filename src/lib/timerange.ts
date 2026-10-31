// Port of norviq-web internal/timerange: the shared time-window vocabulary for
// range-filtered views (dashboard, portfolio, reports).
//
// Windows are half-open [from, to) and day-aligned in a time zone. Go carries
// the zone on time.Time (`now`'s location); a JS Date has none, so every
// zone-sensitive function takes an IANA `timeZone` instead. The default is
// 'UTC', which is what the Go web ran in (the container's time.Local) for
// `time.Now()` and for timestamps decoded from the API. Day arithmetic is
// calendar-based (Go's AddDate), so a window spanning a DST change still lands
// on midnight boundaries. Uses Intl only, so it runs on Workers and browsers.

export type Key = 'today' | 'yesterday' | '7d' | '30d' | '12mo' | 'ytd';

export const Today: Key = 'today';
export const Yesterday: Key = 'yesterday';
export const Last7d: Key = '7d';
export const Last30d: Key = '30d';
export const Last12mo: Key = '12mo';
export const YTD: Key = 'ytd';

/** Used for empty or unrecognized input. */
export const Default: Key = Last30d;

const ALL_KEYS: readonly Key[] = [Today, Yesterday, Last7d, Last30d, Last12mo, YTD];

/** Every key in the order it should be offered to the user. */
export function all(): Key[] {
	return [...ALL_KEYS];
}

/** Resolves user input (a ?range= value) to a Key, falling back to Default rather than erroring. */
export function parse(raw: string | null | undefined): Key {
	const k = (raw ?? '').trim().toLowerCase();
	return (ALL_KEYS as readonly string[]).includes(k) ? (k as Key) : Default;
}

const LABELS: Record<Key, string> = {
	today: 'Today',
	yesterday: 'Yesterday',
	'7d': '7 days',
	'30d': '30 days',
	'12mo': '12 months',
	ytd: 'Year to date'
};

/** The human-readable name for the range control (an i18n message id: pass it through t()). */
export function label(k: string): string {
	return LABELS[k as Key] ?? LABELS[Default];
}

// ---------------------------------------------------------------------------
// Zone arithmetic

interface Civil {
	y: number;
	m: number; // 1-12
	d: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
	let f = partsFormatters.get(timeZone);
	if (!f) {
		f = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric'
		});
		partsFormatters.set(timeZone, f);
	}
	return f;
}

function zonedFields(t: number, timeZone: string) {
	const out: Record<string, number> = {};
	for (const p of partsFormatter(timeZone).formatToParts(new Date(t))) {
		if (p.type !== 'literal' && p.type !== 'era') out[p.type] = Number(p.value);
	}
	return { y: out.year, m: out.month, d: out.day, h: out.hour % 24, mi: out.minute, s: out.second };
}

/** Offset of timeZone from UTC at instant t, in ms (Lisbon summer: +3600000). */
function offsetAt(t: number, timeZone: string): number {
	const f = zonedFields(t, timeZone);
	const asUTC = Date.UTC(f.y, f.m - 1, f.d, f.h, f.mi, f.s);
	return asUTC - (t - (((t % 1000) + 1000) % 1000));
}

/** time.Date(y, m, d, 0, 0, 0, 0, loc), with Go's overflow normalisation (day 0, month 13...). */
export function zonedMidnight(y: number, m: number, d: number, timeZone = 'UTC'): Date {
	const guess = Date.UTC(y, m - 1, d);
	const off1 = offsetAt(guess, timeZone);
	let t = guess - off1;
	const off2 = offsetAt(t, timeZone);
	if (off2 !== off1) t = guess - off2;
	return new Date(t);
}

/** The calendar date of instant t in timeZone. */
export function civilDate(t: Date, timeZone = 'UTC'): Civil {
	const f = zonedFields(t.getTime(), timeZone);
	return { y: f.y, m: f.m, d: f.d };
}

/** Truncates to midnight in timeZone (Go's startOfDay, not time.Truncate). */
export function startOfDay(t: Date, timeZone = 'UTC'): Date {
	const c = civilDate(t, timeZone);
	return zonedMidnight(c.y, c.m, c.d, timeZone);
}

/** Go's t.AddDate(years, months, days) for a day-aligned t in timeZone. */
function addDate(day: Civil, years: number, months: number, days: number, timeZone: string): Date {
	return zonedMidnight(day.y + years, day.m + months, day.d + days, timeZone);
}

/**
 * The half-open [from, to) bounds for k, relative to now and in timeZone.
 * Ranges other than yesterday always run up to end-of-today.
 */
export function window(k: string, now: Date, timeZone = 'UTC'): { from: Date; to: Date } {
	const today = civilDate(now, timeZone);
	const start = zonedMidnight(today.y, today.m, today.d, timeZone);
	const tomorrow = addDate(today, 0, 0, 1, timeZone);
	switch (k) {
		case Today:
			return { from: start, to: tomorrow };
		case Yesterday:
			return { from: addDate(today, 0, 0, -1, timeZone), to: start };
		case Last7d:
			return { from: addDate(today, 0, 0, -6, timeZone), to: tomorrow };
		case Last30d:
			return { from: addDate(today, 0, 0, -29, timeZone), to: tomorrow };
		case Last12mo:
			return { from: addDate(today, -1, 0, 0, timeZone), to: tomorrow };
		case YTD:
			return { from: zonedMidnight(today.y, 1, 1, timeZone), to: tomorrow };
		default:
			return window(Default, now, timeZone);
	}
}

/**
 * Keeps the items whose timestamp falls in [from, to), preserving input order.
 * Used to date-filter backend collections that only accept a limit.
 */
export function bucket<T>(
	items: readonly T[] | null | undefined,
	ts: (item: T) => Date,
	from: Date,
	to: Date
): T[] {
	if (!items || items.length === 0) return [];
	const lo = from.getTime();
	const hi = to.getTime();
	return items.filter((item) => {
		const at = ts(item).getTime();
		return at >= lo && at < hi;
	});
}

/** One calendar day's worth of items. `day` is midnight of that day in the grouping zone. */
export interface DayGroup<T> {
	day: Date;
	label: string;
	items: T[];
}

const dayLabelFormatters = new Map<string, Intl.DateTimeFormat>();

/** Go's day.Format("Mon 2 Jan"): English, always (it is not an i18n string in Go either). */
export function dayLabel(day: Date, timeZone = 'UTC'): string {
	let f = dayLabelFormatters.get(timeZone);
	if (!f) {
		f = new Intl.DateTimeFormat('en-GB', {
			timeZone,
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
		dayLabelFormatters.set(timeZone, f);
	}
	const parts: Record<string, string> = {};
	for (const p of f.formatToParts(day)) parts[p.type] = p.value;
	return `${parts.weekday} ${parts.day} ${parts.month}`;
}

/**
 * Buckets items into calendar days, newest day first and newest item first
 * within each day. Labels are absolute dates ("Mon 3 Aug").
 */
export function groupByDay<T>(
	items: readonly T[] | null | undefined,
	ts: (item: T) => Date,
	timeZone = 'UTC'
): DayGroup<T>[] {
	return group(items, ts, timeZone, (day) => dayLabel(day, timeZone));
}

/** groupByDay with the two most recent days labeled "Today" / "Yesterday" relative to now. */
export function groupByDayRelativeTo<T>(
	items: readonly T[] | null | undefined,
	ts: (item: T) => Date,
	now: Date,
	timeZone = 'UTC'
): DayGroup<T>[] {
	const today = startOfDay(now, timeZone).getTime();
	const c = civilDate(now, timeZone);
	const yesterday = zonedMidnight(c.y, c.m, c.d - 1, timeZone).getTime();
	return group(items, ts, timeZone, (day) => {
		if (day.getTime() === today) return label(Today);
		if (day.getTime() === yesterday) return label(Yesterday);
		return dayLabel(day, timeZone);
	});
}

function group<T>(
	items: readonly T[] | null | undefined,
	ts: (item: T) => Date,
	timeZone: string,
	labelFor: (day: Date) => string
): DayGroup<T>[] {
	if (!items || items.length === 0) return [];
	// Array.prototype.sort is stable, like sort.SliceStable.
	const sorted = [...items].sort((a, b) => ts(b).getTime() - ts(a).getTime());
	const groups: DayGroup<T>[] = [];
	for (const item of sorted) {
		const day = startOfDay(ts(item), timeZone);
		const last = groups[groups.length - 1];
		if (last && last.day.getTime() === day.getTime()) {
			last.items.push(item);
			continue;
		}
		groups.push({ day, label: labelFor(day), items: [item] });
	}
	return groups;
}
