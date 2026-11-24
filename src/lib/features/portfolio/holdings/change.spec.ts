import { describe, expect, it } from 'vitest';
import { translator } from '#lib/i18n/index.js';
import { civilDateLabel, isStale, rangeBasis, rangeChange } from './change.js';

const en = translator('en');
const pt = translator('pt-PT');

describe('rangeChange', () => {
	it('measures the fetched series from its first point to its last', () => {
		const c = rangeChange([
			{ date: '2026-10-27', value: 93323.67 },
			{ date: '2026-11-10', value: 95000 },
			{ date: '2026-11-24', value: 96320.11 }
		]);
		expect(c).not.toBeNull();
		expect(c!.absolute).toBeCloseTo(2996.44, 2);
		expect(c!.fraction).toBeCloseTo(0.03211, 5);
		expect(c!.fromDate).toBe('2026-10-27');
		expect(c!.toDate).toBe('2026-11-24');
	});

	it('needs at least three points', () => {
		expect(
			rangeChange([
				{ date: '2026-11-10', value: 95000 },
				{ date: '2026-11-24', value: 96320.11 }
			])
		).toBeNull();
	});

	it('has no change from a zero or negative start', () => {
		expect(
			rangeChange([
				{ date: '2026-11-01', value: 0 },
				{ date: '2026-11-10', value: 10 },
				{ date: '2026-11-24', value: 20 }
			])
		).toBeNull();
	});

	it('reads the points in date order whatever order they arrive in', () => {
		const c = rangeChange([
			{ date: '2026-11-24', value: 120 },
			{ date: '2026-11-01', value: 100 },
			{ date: '2026-11-10', value: 110 }
		]);
		expect(c!.absolute).toBeCloseTo(20, 6);
		expect(c!.fromDate).toBe('2026-11-01');
	});
});

describe('isStale', () => {
	const now = new Date('2026-11-24T12:00:00Z');
	it('is stale when the last point is more than 4 calendar days old', () => {
		expect(isStale('2026-11-11', now)).toBe(true);
		expect(isStale('2026-11-19', now)).toBe(true);
	});
	it('is fresh up to 4 calendar days', () => {
		expect(isStale('2026-11-21', now)).toBe(false);
		expect(isStale('2026-11-20', now)).toBe(false);
		expect(isStale('2026-11-24', now)).toBe(false);
	});
	it('reads an RFC 3339 timestamp by its UTC date', () => {
		expect(isStale('2026-11-20T23:59:00Z', now)).toBe(false);
	});
});

describe('rangeBasis', () => {
	it('names the fetched window, never "vs previous close"', () => {
		expect(rangeBasis('1W', '2026-11-17', en)).toBe('1 week');
		expect(rangeBasis('1M', '2026-10-24', en)).toBe('1 month');
		expect(rangeBasis('3M', '2026-08-24', en)).toBe('3 months');
		expect(rangeBasis('1Y', '2025-11-24', en)).toBe('1 year');
	});
	it('dates ALL from its first point', () => {
		expect(rangeBasis('ALL', '2026-10-27', en)).toBe('since 27 Oct 2026');
	});
	it('translates the basis for pt-PT', () => {
		expect(rangeBasis('1M', '2026-10-24', pt)).toBe('1 mês');
		expect(rangeBasis('ALL', '2026-10-27', pt, 'pt-PT')).toBe('desde 27 out. 2026');
	});
});

describe('civilDateLabel', () => {
	it('formats d MMM yyyy in the locale, read in UTC', () => {
		expect(civilDateLabel('2026-11-11', 'en')).toBe('11 Nov 2026');
		expect(civilDateLabel('2026-11-11', 'pt-PT')).toBe('11 nov. 2026');
	});
});
