import { describe, expect, it } from 'vitest';
import type { components } from '#lib/api/schema.js';
import { translator } from '#lib/i18n/index.js';
import { mapCashFlow, mapQuickStats, mapSpending, type ReportsFmt } from './load.server.js';

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
