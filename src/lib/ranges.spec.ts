import { describe, expect, it } from 'vitest';
import { PORTFOLIO_RANGES, RANGE_KEYS, parseRange, rangeHref } from './ranges.js';

describe('range vocabulary', () => {
	it('is uppercase, in display order', () => {
		expect(RANGE_KEYS).toEqual(['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y', 'ALL']);
		expect(PORTFOLIO_RANGES).toEqual(['1W', '1M', '3M', '1Y', 'ALL']);
	});
});

describe('parseRange', () => {
	it('is case-insensitive', () => {
		expect(parseRange('all', PORTFOLIO_RANGES, '1M')).toBe('ALL');
		expect(parseRange('ALL', PORTFOLIO_RANGES, '1M')).toBe('ALL');
		expect(parseRange(' 3m ', PORTFOLIO_RANGES, '1M')).toBe('3M');
	});

	it('falls back for a range the caller does not allow', () => {
		expect(parseRange('YTD', PORTFOLIO_RANGES, '1M')).toBe('1M');
		expect(parseRange('2W', PORTFOLIO_RANGES, '1M')).toBe('1M');
	});

	it('falls back when there is no range', () => {
		expect(parseRange(undefined, PORTFOLIO_RANGES, '1M')).toBe('1M');
		expect(parseRange(null, PORTFOLIO_RANGES, '1M')).toBe('1M');
		expect(parseRange('', PORTFOLIO_RANGES, '1M')).toBe('1M');
	});
});

describe('rangeHref', () => {
	it('keeps other query params', () => {
		expect(
			rangeHref(new URL('https://x/portfolio?portfolio=7&tab=a&range=1M'), 'range', '3M')
		).toBe('/portfolio?portfolio=7&tab=a&range=3M');
	});

	it('adds the param when the URL has none', () => {
		expect(rangeHref(new URL('https://x/crypto/bubbles?size=cap'), 'tf', 'YTD')).toBe(
			'/crypto/bubbles?size=cap&tf=YTD'
		);
	});

	it('does not change the URL it was given', () => {
		const url = new URL('https://x/portfolio?range=1M');
		rangeHref(url, 'range', 'ALL');
		expect(url.search).toBe('?range=1M');
	});
});
