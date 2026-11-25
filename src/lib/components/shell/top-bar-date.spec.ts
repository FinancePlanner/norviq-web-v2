// Must run before any Date use: the top bar reads the browser's zone, so pin one.
process.env.TZ = 'Europe/Lisbon';

import { describe, expect, it } from 'vitest';
import { topBarDate } from './top-bar-date.js';

// 24 November 2026 is a Tuesday.
const now = new Date('2026-11-24T21:00:00Z');

describe('topBarDate', () => {
	it('reads weekday, day and month in English, day first', () => {
		expect(topBarDate(now, 'en')).toBe('Tuesday 24 November');
	});

	it('uses the Portuguese long form, keeping the weekday hyphen', () => {
		const pt = topBarDate(now, 'pt-PT');
		expect(pt).toContain('novembro');
		expect(pt).toContain('terça-feira');
	});

	it('reads the date in the local zone, not UTC', () => {
		// 23:30 UTC on 31 March is 00:30 on 1 April in Lisbon (summer time).
		expect(topBarDate(new Date('2026-03-31T23:30:00Z'), 'en')).toBe('Wednesday 1 April');
	});
});
