import { describe, expect, it } from 'vitest';
import { ifElse, ifValue, isUnsafeRedirect, mergeAttributes, randomID, safeRedirect, safeRedirectPath, sortTimeSeries, twMerge } from './helpers.js';

describe('safe redirect', () => {
	it('allows local paths and the empty path', () => {
		expect(isUnsafeRedirect('/dashboard')).toBe(false);
		expect(isUnsafeRedirect('/a?b=//c')).toBe(false);
		expect(isUnsafeRedirect('')).toBe(false);
	});
	it('rejects absolute and protocol-relative URLs', () => {
		for (const p of ['//evil.com', 'https://evil.com', 'evil.com', 'javascript:alert(1)']) {
			expect(isUnsafeRedirect(p), p).toBe(true);
			expect(safeRedirectPath(p)).toBe('/');
		}
	});
	it('throws a SvelteKit redirect', () => {
		try {
			safeRedirect(303, '//evil.com');
			expect.unreachable();
		} catch (err) {
			expect(err).toMatchObject({ status: 303, location: '/' });
		}
	});
});

it('sortTimeSeries sorts ascending in place', () => {
	const series = [{ t: new Date(3) }, { t: new Date(1) }, { t: new Date(2) }];
	sortTimeSeries(series, (s) => s.t);
	expect(series.map((s) => s.t.getTime())).toEqual([1, 2, 3]);
});

// Port of utils/templui_test.go (concurrency is moot in JS; the merge result is not).
it('twMerge resolves conflicts', () => {
	const merged = twMerge('inline-flex items-center bg-red-500 px-2', 'bg-blue-500 px-4 hover:bg-slate-900');
	expect(merged).toContain('bg-blue-500');
	expect(merged).toContain('px-4');
	expect(merged).not.toContain('bg-red-500');
});

it('ifValue / ifElse / mergeAttributes / randomID', () => {
	expect(ifValue(true, 'bg-red-500')).toBe('bg-red-500');
	expect(ifValue(false, 'bg-red-500')).toBe('');
	expect(ifElse(false, 'a', 'b')).toBe('b');
	expect(mergeAttributes({ a: 1, b: 1 }, null, { b: 2 })).toEqual({ a: 1, b: 2 });
	expect(randomID()).toMatch(/^id-[A-Z2-7]{26}$/);
	expect(randomID()).not.toBe(randomID());
});
