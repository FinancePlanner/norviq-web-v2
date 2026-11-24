import { describe, expect, it } from 'vitest';
import type { components } from '#lib/api/schema.js';
import { translator } from '#lib/i18n/index.js';
import {
	mapCashFlow,
	mapNetWorth,
	mapPerformance,
	mapQuickStats,
	mapSpending,
	type ReportsFmt
} from './load.server.js';

type S = components['schemas'];
const NBSP = ' ';

function month(monthStart: string, actual: number): S['BudgetMonthSummaryResponse'] {
	return {
		monthStart,
		planned: 2000,
		actual,
		salary: 3000,
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

const overview: S['ReportsOverviewResponse'] = {
	generatedAt: '2026-11-24T12:00:00Z',
	portfolioStatistics: {
		totalPositions: 3,
		totalMarketValue: 48432.05,
		totalCostBasis: 40000,
		totalUnrealizedPnl: 8432.05,
		totalRealizedPnl: -120,
		stockSummaries: [],
		stockAllocations: [],
		sectorAllocations: [],
		calendarPerformance: []
	},
	monthlySummaries: [month('2026-10-01', 1500), month('2026-11-01', 1234.5)],
	yearlySummaries: [],
	latestMonthSummary: month('2026-11-01', 1234.5),
	latestPillarSummaries: [],
	cashFlow: [
		{ monthStart: '2026-10-01', income: 3000, expenses: 1500, net: 1500, savingsRate: 50 },
		{ monthStart: '2026-11-01', income: 3000, expenses: 1234.5, net: 1765.5, savingsRate: 58.85 }
	]
};

const fmt: ReportsFmt = {
	currency: 'USD',
	spendCurrency: 'EUR',
	locale: 'pt-PT',
	t: translator('pt-PT')
};

describe('Reports cards (DS 2.0: one screen, one format)', () => {
	it('prints spend in the budget currency and the locale', () => {
		const card = mapSpending(overview, fmt);
		expect(card.latestMonth).toBe(`1234,50${NBSP}€`);
		expect(card.changeLabel).toBe('−17,7% vs mês anterior');
	});

	it('prints cash flow in the budget currency', () => {
		const card = mapCashFlow(overview, fmt);
		expect(card.latestIncome).toBe(`3000,00${NBSP}€`);
		expect(card.latestNet).toBe(`+1765,50${NBSP}€`);
	});

	it('prints portfolio figures in the account currency', () => {
		const stats = mapQuickStats(overview, null, fmt).stats;
		expect(stats.find((s) => s.label === 'Market value')?.value).toBe(`48${NBSP}432,05${NBSP}US$`);
		expect(stats.find((s) => s.label === 'Realized P/L')?.value).toBe(`−120,00${NBSP}US$`);
	});
});

describe('Reports change (measured on the series, never "vs previous close")', () => {
	const now = new Date('2026-11-24T12:00:00Z');
	const en: ReportsFmt = { ...fmt, locale: 'en', t: translator('en') };
	const perf = (points: { date: string; value: number }[]): S['PortfolioPerformanceResponse'] => ({
		baseCurrency: 'USD',
		range: '1M',
		points,
		changes: {
			day: {
				percent: 0.134,
				absolute: 1,
				fromDate: '2026-11-10',
				toDate: '2026-11-11',
				basis: 'previousTradingDay'
			}
		}
	});
	const fresh = [
		{ date: '2026-10-25', value: 40000 },
		{ date: '2026-11-10', value: 44000 },
		{ date: '2026-11-23', value: 46874.85 }
	];
	const stale = [
		{ date: '2026-11-05', value: 810.19 },
		{ date: '2026-11-08', value: 870.5 },
		{ date: '2026-11-11', value: 919.06 }
	];

	it('labels a fresh change with its range', () => {
		const nw = mapNetWorth(overview, perf(fresh), en, now);
		expect(nw.changeLabel).toBe('+17.2% 1 month');
		expect(nw.changePositive).toBe(true);
		expect(nw.chartSummary).toBe('Portfolio up 17.2% over 1 month');
		expect(mapPerformance(perf(fresh), en, now).changeLabel).toBe('+17.2% 1 month');
	});

	it('hides a stale change and dates the prices instead', () => {
		const nw = mapNetWorth(overview, perf(stale), en, now);
		expect(nw.changeLabel).toBe('');
		expect(nw.asOfCaption).toBe('Prices as of 11 Nov 2026');
		const p = mapPerformance(perf(stale), en, now);
		expect(p.changeLabel).toBe('');
		expect(p.asOfCaption).toBe('Prices as of 11 Nov 2026');
	});
});
