import { expect, it } from 'vitest';
import { all, allowed } from './publicsymbols.js';

// Cases ported from norviq-web internal/publicsymbols/publicsymbols_test.go.

it('accepts curated symbols', () => {
	for (const sym of ['SPY', 'QQQ', 'AAPL', 'MSFT', 'BRK.B']) expect(allowed(sym), sym).toBe(true);
});

it('normalizes input', () => {
	expect(allowed('spy')).toBe(true);
	expect(allowed(' spy ')).toBe(true);
	expect(allowed('Aapl')).toBe(true);
});

it('rejects unknown and empty', () => {
	for (const sym of ['', ' ', 'NOTATICKER', 'ZZZZ', '../etc/passwd', 'AAPL;DROP'])
		expect(allowed(sym), sym).toBe(false);
});

it('includes the named index ETFs', () => {
	const want = [
		'SPY',
		'QQQ',
		'IWM',
		'DIA',
		'VTI',
		'VOO',
		'VEA',
		'VWO',
		'BND',
		'TLT',
		'GLD',
		'SLV',
		'XLK',
		'XLF',
		'XLE',
		'XLV',
		'XLY',
		'XLP',
		'XLI',
		'XLU',
		'XLRE',
		'XLB',
		'XLC',
		'ARKK',
		'SMH'
	];
	const list = all();
	for (const sym of want) expect(list).toContain(sym);
});

it('is sorted, uppercase and unique', () => {
	const list = all();
	expect(list.length).toBeGreaterThanOrEqual(140);
	expect(new Set(list).size).toBe(list.length);
	for (const sym of list) {
		expect(sym).toBe(sym.toUpperCase());
		expect(sym).toMatch(/^[A-Z.-]{1,10}$/);
	}
	// Go's sort.StringsAreSorted compares bytes, not locale order.
	expect([...list].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))).toEqual(list);
});

it('returns a copy', () => {
	const first = all();
	const original = first[0];
	first[0] = 'MUTATED';
	expect(all()[0]).toBe(original);
});
