// Must run before any Date use: the staleness boundary is a UTC-civil rule, and
// a runtime in a UTC+13 zone is the case a local-calendar version gets wrong.
process.env.TZ = 'Pacific/Auckland';

import { describe, expect, it } from 'vitest';
import { civilDateLabel, isStale } from './as-of.js';

describe('as-of', () => {
	it('runs under a non-UTC zone', () => {
		expect(new Date('2026-11-24T21:00:00Z').getTimezoneOffset()).not.toBe(0);
	});

	it('compares civil dates in UTC, not the local calendar', () => {
		// UTC 24 Nov, Auckland 25 Nov.
		const now = new Date('2026-11-24T21:00:00Z');
		expect(isStale('2026-11-20', now)).toBe(false);
		expect(isStale('2026-11-19', now)).toBe(true);
	});

	it('treats an unparseable date as stale', () => {
		expect(isStale('nope', new Date('2026-11-24T21:00:00Z'))).toBe(true);
	});

	it('labels a civil date in the locale', () => {
		expect(civilDateLabel('2026-11-21', 'pt-PT').toLowerCase()).toContain('nov');
	});
});
