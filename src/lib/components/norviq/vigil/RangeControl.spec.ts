import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { PORTFOLIO_RANGES } from '#lib/ranges.js';
import RangeControl from './RangeControl.svelte';

const links = (body: string) => [...body.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)];

describe('RangeControl (server render)', () => {
	const { body } = render(RangeControl, {
		props: {
			ranges: PORTFOLIO_RANGES,
			active: '3M',
			url: new URL('https://norviq.org/portfolio?portfolio=7&range=1M'),
			label: 'Chart range'
		}
	});

	it('is a labelled nav with one link per range', () => {
		expect(body).toMatch(/<nav[^>]*aria-label="Chart range"/);
		expect(links(body).map((m) => m[1].trim())).toEqual(['1W', '1M', '3M', '1Y', 'ALL']);
	});

	it('marks only the active range as the current page', () => {
		const current = links(body).filter((m) => m[0].includes('aria-current="page"'));
		expect(current.map((m) => m[1].trim())).toEqual(['3M']);
		expect(current[0][0]).toContain('segmented-link-active');
	});

	it('keeps the other query params on every link', () => {
		for (const m of links(body)) {
			expect(m[0]).toContain('portfolio=7');
			expect(m[0]).toContain(`range=${m[1].trim()}`);
		}
	});

	it('never shows a lowercase label', () => {
		for (const m of links(body)) expect(m[1]).toBe(m[1].toUpperCase());
	});

	it('writes the range to the param it is given', () => {
		const out = render(RangeControl, {
			props: {
				ranges: ['1D', 'YTD'],
				active: '1D',
				param: 'tf',
				url: new URL('https://norviq.org/crypto/bubbles?size=cap&tf=1d'),
				label: 'Timeframe'
			}
		}).body;
		expect(out).toContain('href="/crypto/bubbles?size=cap&amp;tf=YTD"');
		expect(out).not.toContain('range=');
	});
});
