import { describe, expect, it } from 'vitest';
import * as timerange from './timerange.js';
import { Last12mo, Last30d, Last7d, Today, Yesterday, YTD, zonedMidnight } from './timerange.js';

// Cases ported from norviq-web internal/timerange/timerange_test.go.
// Lisbon springs forward on 2026-03-29 and falls back on 2026-10-25.
const LISBON = 'Europe/Lisbon';

/** time.Date(y, m, d, h, mi, s, 0, loc) */
function at(y: number, m: number, d: number, h = 0, mi = 0, s = 0, tz = 'UTC'): Date {
	return new Date(zonedMidnight(y, m, d, tz).getTime() + ((h * 60 + mi) * 60 + s) * 1000);
}

describe('parse', () => {
	const cases: Array<[string, string, timerange.Key]> = [
		['today', 'today', Today],
		['yesterday', 'yesterday', Yesterday],
		['seven days', '7d', Last7d],
		['thirty days', '30d', Last30d],
		['twelve months', '12mo', Last12mo],
		['year to date', 'ytd', YTD],
		['empty falls back to 30d', '', Last30d],
		['unknown falls back to 30d', 'banana', Last30d],
		['uppercase is normalized', 'YTD', YTD],
		['surrounding space is trimmed', '  7d  ', Last7d]
	];
	for (const [name, input, want] of cases) {
		it(name, () => expect(timerange.parse(input)).toBe(want));
	}
	it('treats null as empty', () => expect(timerange.parse(null)).toBe(Last30d));
});

it('all() returns every key in display order', () => {
	expect(timerange.all()).toEqual([Today, Yesterday, Last7d, Last30d, Last12mo, YTD]);
});

describe('label', () => {
	const cases: Array<[timerange.Key, string]> = [
		[Today, 'Today'],
		[Yesterday, 'Yesterday'],
		[Last7d, '7 days'],
		[Last30d, '30 days'],
		[Last12mo, '12 months'],
		[YTD, 'Year to date']
	];
	for (const [key, want] of cases) it(key, () => expect(timerange.label(key)).toBe(want));
	it('falls back to the default for an unknown key', () =>
		expect(timerange.label('banana')).toBe('30 days'));
});

describe('window', () => {
	// A Wednesday, mid-afternoon, deliberately not on a day boundary.
	const now = new Date(at(2026, 8, 12, 15, 47, 31, LISBON).getTime() + 1);
	const cases: Array<[string, timerange.Key, Date, Date]> = [
		[
			'today spans the current calendar day',
			Today,
			at(2026, 8, 12, 0, 0, 0, LISBON),
			at(2026, 8, 13, 0, 0, 0, LISBON)
		],
		[
			'yesterday spans only the previous calendar day',
			Yesterday,
			at(2026, 8, 11, 0, 0, 0, LISBON),
			at(2026, 8, 12, 0, 0, 0, LISBON)
		],
		[
			'7d covers seven days including today',
			Last7d,
			at(2026, 8, 6, 0, 0, 0, LISBON),
			at(2026, 8, 13, 0, 0, 0, LISBON)
		],
		[
			'30d covers thirty days including today',
			Last30d,
			at(2026, 7, 14, 0, 0, 0, LISBON),
			at(2026, 8, 13, 0, 0, 0, LISBON)
		],
		[
			'12mo walks back a calendar year',
			Last12mo,
			at(2025, 8, 12, 0, 0, 0, LISBON),
			at(2026, 8, 13, 0, 0, 0, LISBON)
		],
		[
			'ytd starts on January 1st',
			YTD,
			at(2026, 1, 1, 0, 0, 0, LISBON),
			at(2026, 8, 13, 0, 0, 0, LISBON)
		]
	];
	for (const [name, key, from, to] of cases) {
		it(name, () => {
			const w = timerange.window(key, now, LISBON);
			expect(w.from.toISOString()).toBe(from.toISOString());
			expect(w.to.toISOString()).toBe(to.toISOString());
		});
	}

	it('lands on Lisbon midnight, not UTC midnight', () => {
		const w = timerange.window(Today, now, LISBON);
		expect(w.from.toISOString()).toBe('2026-08-11T23:00:00.000Z');
	});

	it('survives spring forward', () => {
		const w = timerange.window(Last7d, at(2026, 3, 31, 12, 0, 0, LISBON), LISBON);
		expect(w.from.toISOString()).toBe(at(2026, 3, 25, 0, 0, 0, LISBON).toISOString());
		expect(w.to.toISOString()).toBe(at(2026, 4, 1, 0, 0, 0, LISBON).toISOString());
		// 2026-03-25 is still winter time (UTC+0); 2026-04-01 is summer (UTC+1).
		expect(w.from.toISOString()).toBe('2026-03-25T00:00:00.000Z');
		expect(w.to.toISOString()).toBe('2026-03-31T23:00:00.000Z');
	});

	it('survives fall back', () => {
		const w = timerange.window(Last7d, at(2026, 10, 27, 9, 30, 0, LISBON), LISBON);
		expect(w.from.toISOString()).toBe('2026-10-20T23:00:00.000Z');
		expect(w.to.toISOString()).toBe('2026-10-28T00:00:00.000Z');
	});

	it('treats an unknown key as the default', () => {
		const n = at(2026, 8, 12, 15);
		expect(timerange.window('banana', n)).toEqual(timerange.window(Last30d, n));
	});

	it('defaults to UTC', () => {
		const w = timerange.window(Today, at(2026, 8, 12, 15));
		expect(w.from.toISOString()).toBe('2026-08-12T00:00:00.000Z');
	});
});

interface Stamped {
	name: string;
	at: Date;
}
const stampedAt = (s: Stamped) => s.at;

describe('bucket', () => {
	it('keeps items inside the half-open window', () => {
		const from = at(2026, 8, 10);
		const to = at(2026, 8, 12);
		const items: Stamped[] = [
			{ name: 'before window', at: at(2026, 8, 9, 23, 59, 59) },
			{ name: 'exactly at from', at: from },
			{ name: 'inside', at: at(2026, 8, 11, 6) },
			{ name: 'one millisecond before to', at: new Date(to.getTime() - 1) },
			{ name: 'exactly at to', at: to },
			{ name: 'after window', at: at(2026, 8, 13) }
		];
		expect(timerange.bucket(items, stampedAt, from, to).map((s) => s.name)).toEqual([
			'exactly at from',
			'inside',
			'one millisecond before to'
		]);
	});

	it('compares across time zones', () => {
		const from = at(2026, 8, 10, 0, 0, 0, LISBON);
		const to = at(2026, 8, 11, 0, 0, 0, LISBON);
		// 22:30 UTC is 23:30 in Lisbon (WEST, UTC+1).
		const items = [{ name: 'utc stamp inside lisbon day', at: new Date('2026-08-10T22:30:00Z') }];
		expect(timerange.bucket(items, stampedAt, from, to)).toHaveLength(1);
	});

	it('returns nothing for empty and nil input', () => {
		expect(timerange.bucket(null, stampedAt, at(2026, 8, 10), at(2026, 8, 12))).toHaveLength(0);
		expect(timerange.bucket([], stampedAt, at(2026, 8, 10), at(2026, 8, 12))).toHaveLength(0);
	});
});

describe('groupByDay', () => {
	it('returns the newest day first', () => {
		const items: Stamped[] = [
			{ name: 'mon morning', at: at(2026, 8, 10, 9) },
			{ name: 'wed', at: at(2026, 8, 12, 14) },
			{ name: 'mon evening', at: at(2026, 8, 10, 21) },
			{ name: 'tue', at: at(2026, 8, 11, 11) }
		];
		const groups = timerange.groupByDay(items, stampedAt);
		expect(groups.map((g) => g.day.toISOString())).toEqual([
			at(2026, 8, 12).toISOString(),
			at(2026, 8, 11).toISOString(),
			at(2026, 8, 10).toISOString()
		]);
		expect(groups[2].items).toHaveLength(2);
	});

	it('keeps items newest first within a day', () => {
		const items: Stamped[] = [
			{ name: 'morning', at: at(2026, 8, 10, 9) },
			{ name: 'evening', at: at(2026, 8, 10, 21) },
			{ name: 'midday', at: at(2026, 8, 10, 13) }
		];
		const groups = timerange.groupByDay(items, stampedAt);
		expect(groups).toHaveLength(1);
		expect(groups[0].items.map((s) => s.name)).toEqual(['evening', 'midday', 'morning']);
	});

	it('labels relative days against now', () => {
		const now = at(2026, 8, 12, 15);
		const items: Stamped[] = [
			{ name: 'today', at: at(2026, 8, 12, 8) },
			{ name: 'yesterday', at: at(2026, 8, 11, 8) },
			{ name: 'older', at: at(2026, 8, 3, 8) }
		];
		const groups = timerange.groupByDayRelativeTo(items, stampedAt, now);
		expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Mon 3 Aug']);
	});

	it('returns nothing for empty input', () => {
		expect(timerange.groupByDay(null, stampedAt)).toHaveLength(0);
	});
});
