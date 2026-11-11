import { describe, expect, it } from 'vitest';
import { buildDigestPage, buildSections, focusAnchor, money, percent } from './viewmodel.js';
import type { DigestPayload, DigestResponse } from './types.js';

const empty = (): DigestPayload => ({
	schemaVersion: 1,
	periodStart: '2026-11-02',
	periodEnd: '2026-11-08',
	holdings: [],
	pricedPositions: 0,
	totalPositions: 0,
	movers: [],
	earnings: []
});

describe('buildSections', () => {
	it('is empty for an empty payload', () => {
		expect(buildSections(empty())).toEqual([]);
	});

	it('mirrors the email renderer anchors and order', () => {
		const p: DigestPayload = {
			...empty(),
			holdings: [
				{ currency: 'EUR', startValue: 1000, endValue: 1050, change: 50, changePercent: 5 }
			],
			pricedPositions: 2,
			totalPositions: 3,
			movers: [
				{
					symbol: 'AAPL',
					currency: 'USD',
					shares: 10,
					startPrice: 100,
					endPrice: 90,
					contribution: -100,
					changePercent: -10,
					why: 'Guidance cut'
				}
			],
			budget: {
				monthStart: '2026-11-01',
				currency: 'EUR',
				lines: [
					{ title: 'Food', target: 300, actual: 350, drift: 50 },
					{ title: 'Fun', target: 100, actual: 40, drift: -60 }
				]
			},
			inflation: { country: 'PT', asOf: '2026-10', personalRate: 3.1, officialRate: 2.4 },
			earnings: [
				{ symbol: 'NVDA', date: '2026-11-19', hour: 'amc' },
				{ symbol: 'WMT', date: '2026-11-18', hour: 'bmo' },
				{ symbol: 'SAP', date: '2026-11-20' }
			]
		};
		const sections = buildSections(p);
		expect(sections.map((s) => s.anchor)).toEqual([
			'holdings',
			'movers',
			'budget',
			'inflation',
			'earnings'
		]);
		expect(sections[0].lines).toEqual([
			'+€50.00 (+5.00%), now €1,050.00',
			'Based on 2 of 3 holdings with prices this week.'
		]);
		expect(sections[1].lines).toEqual(['AAPL -10.00%: -$100.00. Guidance cut']);
		expect(sections[2].lines).toEqual([
			'Food: €50.00 over (€350.00 of €300.00)',
			'Fun: €60.00 under (€40.00 of €100.00)'
		]);
		expect(sections[3].lines).toEqual(['Yours: 3.10% vs official 2.40% (PT, 2026-10).']);
		expect(sections[4].title).toBe('Next week');
		expect(sections[4].lines).toEqual([
			'NVDA reports on 2026-11-19 (after close)',
			'WMT reports on 2026-11-18 (before open)',
			'SAP reports on 2026-11-20'
		]);
	});
});

describe('formatting', () => {
	it('puts multi-letter currency codes after the amount', () => {
		expect(money(-1234.5, 'chf')).toBe('-1,234.50 CHF');
		expect(percent(-0.5)).toBe('-0.50%');
	});
});

describe('buildDigestPage', () => {
	it('carries headline, period and narrative', () => {
		const resp: DigestResponse = {
			id: '28e34364-0e3e-4e62-85b8-7e374c3b648c',
			periodStart: '2026-11-02',
			periodEnd: '2026-11-08',
			status: 'sent',
			headline: 'Your week in Norviq',
			payload: empty()
		};
		expect(buildDigestPage(resp)).toEqual({
			headline: 'Your week in Norviq',
			periodStart: '2026-11-02',
			periodEnd: '2026-11-08',
			narrative: '',
			sections: []
		});
	});
});

describe('focusAnchor', () => {
	it('accepts only known section anchors', () => {
		expect(focusAnchor('earnings')).toBe('earnings');
		expect(focusAnchor('nope')).toBeNull();
		expect(focusAnchor(null)).toBeNull();
	});
});
