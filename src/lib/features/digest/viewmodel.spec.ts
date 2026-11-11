import { describe, expect, it } from 'vitest';
import {
	buildDigestPage,
	buildSections,
	dayLabel,
	focusAnchor,
	money,
	monthLabel,
	percent,
	periodLabel
} from './viewmodel.js';
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
		const [holdings, movers, budget, inflation, earningsSection] = sections;
		expect(holdings).toMatchObject({
			priced: 2,
			total: 3,
			rows: [
				{
					currency: 'EUR',
					value: '€1,050.00',
					change: '+€50.00',
					changePercent: '+5.00%',
					direction: 'up'
				}
			]
		});
		expect(movers).toMatchObject({
			rows: [
				{
					symbol: 'AAPL',
					changePercent: '-10.00%',
					contribution: '-$100.00',
					direction: 'down',
					why: 'Guidance cut'
				}
			]
		});
		expect(budget).toMatchObject({
			monthStart: '2026-11-01',
			rows: [
				{ title: 'Food', actual: '€350.00', target: '€300.00', drift: '€50.00', over: true },
				{ title: 'Fun', actual: '€40.00', target: '€100.00', drift: '€60.00', over: false }
			]
		});
		expect(inflation).toMatchObject({
			personal: '3.10%',
			official: '2.40%',
			country: 'PT',
			asOf: '2026-10',
			above: true
		});
		expect(earningsSection.title).toBe('Next week');
		// Sorted by date, the date flagged once per group.
		expect(earningsSection).toMatchObject({
			rows: [
				{ symbol: 'WMT', date: '2026-11-18', firstOfDate: true, timing: 'before-open' },
				{ symbol: 'NVDA', date: '2026-11-19', firstOfDate: true, timing: 'after-close' },
				{ symbol: 'SAP', date: '2026-11-20', firstOfDate: true, timing: null }
			]
		});
	});

	it('groups earnings on the same date', () => {
		const [section] = buildSections({
			...empty(),
			earnings: [
				{ symbol: 'RKLB', date: '2026-11-09', hour: 'amc' },
				{ symbol: 'ABCL', date: '2026-11-09', hour: 'amc' },
				{ symbol: 'CRWV', date: '2026-11-10', hour: 'dmh' }
			]
		});
		expect(section).toMatchObject({
			rows: [
				{ symbol: 'ABCL', firstOfDate: true },
				{ symbol: 'RKLB', firstOfDate: false },
				{ symbol: 'CRWV', firstOfDate: true, timing: 'during' }
			]
		});
	});
});

describe('dates', () => {
	it('formats the period, days and months without timezone drift', () => {
		expect(periodLabel('2026-11-02', '2026-11-08', 'en').replace(/\s/g, ' ')).toBe(
			'November 2 – 8, 2026'
		);
		expect(dayLabel('2026-11-09', 'en')).toBe('Mon, Nov 9');
		expect(monthLabel('2026-10', 'en')).toBe('October 2026');
		expect(dayLabel('soon', 'en')).toBe('soon');
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
