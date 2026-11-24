import { describe, expect, it } from 'vitest';
import type { components } from '#lib/api/schema.js';
import { translator } from '#lib/i18n/index.js';
import { buildOverviewFigures, perfRangeForKey, type OverviewFiguresInput } from './overview-vm.js';

type S = components['schemas'];

const now = new Date('2026-11-24T12:00:00Z');

const stalePoints = [
	{ date: '2026-11-05', value: 810.19 },
	{ date: '2026-11-08', value: 870.5 },
	{ date: '2026-11-11', value: 919.06 }
];
const freshPoints = [
	{ date: '2026-10-25', value: 40000 },
	{ date: '2026-11-10', value: 44000 },
	{ date: '2026-11-23', value: 46874.85 }
];

function month(monthStart: string, actual: number): S['BudgetMonthSummaryResponse'] {
	return {
		monthStart,
		planned: 2000,
		actual,
		salary: 0,
		myPlanned: 0,
		partnerPlanned: 0,
		myActual: 0,
		partnerActual: 0,
		pillarActuals: {},
		pillarPlans: {},
		myPillarActuals: {},
		partnerPillarActuals: {},
		myPillarPlans: {},
		partnerPillarPlans: {}
	};
}

function reports(totalMarketValue: number): S['ReportsOverviewResponse'] {
	return {
		generatedAt: '2026-11-24T12:00:00Z',
		portfolioStatistics: {
			totalPositions: 1,
			totalMarketValue,
			totalCostBasis: 0,
			totalUnrealizedPnl: 0,
			totalRealizedPnl: 0,
			stockSummaries: [],
			stockAllocations: [],
			sectorAllocations: [],
			calendarPerformance: []
		},
		monthlySummaries: [
			month('2026-06-01', 900),
			month('2026-09-01', 1200),
			month('2026-10-01', 1500),
			month('2026-11-01', 84.12)
		],
		yearlySummaries: [],
		latestMonthSummary: month('2026-11-01', 84.12),
		latestPillarSummaries: [],
		cashFlow: []
	};
}

function input(over: Partial<OverviewFiguresInput> = {}): OverviewFiguresInput {
	return {
		dash: null,
		budgetCurrency: null,
		accountCurrency: 'USD',
		performance: { baseCurrency: 'USD', points: stalePoints },
		reports: reports(46874.85),
		rng: '30d',
		locale: 'en',
		now,
		t: translator('en'),
		...over
	};
}

describe('perfRangeForKey', () => {
	it('maps the Pulse periods onto the portfolio ranges', () => {
		expect(perfRangeForKey('today')).toBe('1W');
		expect(perfRangeForKey('yesterday')).toBe('1W');
		expect(perfRangeForKey('7d')).toBe('1W');
		expect(perfRangeForKey('30d')).toBe('1M');
		expect(perfRangeForKey('12mo')).toBe('1Y');
		expect(perfRangeForKey('ytd')).toBe('1Y');
	});
});

describe('buildOverviewFigures', () => {
	it('prints the total in the account currency and hides a stale change', () => {
		const f = buildOverviewFigures(input());
		expect(f.totalWealth).toBe('$46,874.85');
		expect(f.delta).toBeNull();
		expect(f.portfolioPeriodPercent).toBe('');
		expect(f.asOfCaption).toBe('Prices as of 11 Nov 2026');
		expect(f.wealthChartNote).toBe('Prices as of 11 Nov 2026');
	});

	it('uses the performance base currency, never a default dollar', () => {
		const f = buildOverviewFigures(
			input({ accountCurrency: 'EUR', performance: { baseCurrency: 'EUR', points: [] } })
		);
		expect(f.totalWealth).toBe('€46,874.85');
		expect(f.currency).toBe('EUR');
		const none = buildOverviewFigures(input({ accountCurrency: null, performance: null }));
		expect(none.totalWealth).not.toContain('$');
	});

	it('never trusts the unscoped performance currency (a backend "USD" default)', () => {
		const f = buildOverviewFigures(
			input({ accountCurrency: 'EUR', performance: { baseCurrency: 'USD', points: [] } })
		);
		expect(f.currency).toBe('EUR');
		expect(f.totalWealth).toBe('€46,874.85');
		const mixed = buildOverviewFigures(input({ accountCurrency: null }));
		expect(mixed.currency).toBeNull();
		expect(mixed.totalWealth).toBe('46,874.85\u00a0\u2014');
	});

	it('measures a fresh change over the range on screen and labels it', () => {
		const f = buildOverviewFigures(
			input({ performance: { baseCurrency: 'USD', points: freshPoints } })
		);
		expect(f.delta).not.toBeNull();
		expect(f.delta!.basis).toBe('1 month');
		expect(f.portfolioPeriodPercent).toBe('+17.2% 1 month');
		expect(f.portfolioPeriodSuffix).toBe('1 month');
		expect(f.asOfCaption).toBeNull();
		expect(f.wealthChart?.values).toEqual([40000, 44000, 46874.85]);
		expect(f.wealthChartNote).toBeNull();
	});

	it('measures YTD from the first point of the year, not as "1 year"', () => {
		const f = buildOverviewFigures(
			input({
				rng: 'ytd',
				performance: {
					baseCurrency: 'USD',
					points: [
						{ date: '2025-12-01', value: 100 },
						{ date: '2026-01-02', value: 200 },
						{ date: '2026-06-01', value: 220 },
						{ date: '2026-11-23', value: 240 }
					]
				}
			})
		);
		expect(f.delta!.basis).toBe('since 2 Jan 2026');
		expect(f.portfolioPeriodPercent).toBe('+20.0% since 2 Jan 2026');
		expect(f.wealthChart?.values).toEqual([200, 220, 240]);
	});

	it('formats spend in the account currency and the locale', () => {
		const f = buildOverviewFigures(
			input({
				accountCurrency: 'EUR',
				performance: { baseCurrency: 'EUR', points: [] },
				locale: 'pt-PT',
				t: translator('pt-PT')
			})
		);
		expect(f.spendingThisMonth).toBe('84,12 €');
	});

	it('prints spend in the budget currency when the month has a budget', () => {
		const f = buildOverviewFigures(input({ budgetCurrency: 'EUR' }));
		expect(f.spendCurrency).toBe('EUR');
		expect(f.spendingThisMonth).toBe('€84.12');
		expect(f.totalWealth).toBe('$46,874.85');
	});

	it('falls back to the account currency for spend without a budget', () => {
		const f = buildOverviewFigures(input({ budgetCurrency: null }));
		expect(f.spendCurrency).toBe('USD');
		expect(f.spendingThisMonth).toBe('$84.12');
	});

	it('limits the monthly spend tile to the months in the Pulse range', () => {
		const thirty = buildOverviewFigures(input({ rng: '30d' }));
		expect(thirty.spendingChart?.labels).toEqual(['Oct', 'Nov']);
		const year = buildOverviewFigures(input({ rng: '12mo' }));
		expect(year.spendingChart?.labels).toEqual(['Jun', 'Sep', 'Oct', 'Nov']);
		// One month is one point: no line to draw, so the tile says why.
		const today = buildOverviewFigures(input({ rng: 'today' }));
		expect(today.spendingChart).toBeNull();
		expect(today.spendingChartNote).toBe(
			'This range covers one month. Choose a longer range for a trend.'
		);
		expect(thirty.spendingChartNote).toBeNull();
	});
});
