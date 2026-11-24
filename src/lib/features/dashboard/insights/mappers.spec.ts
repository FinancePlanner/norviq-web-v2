import { describe, expect, it } from 'vitest';
import { mapInsightCards, type DashboardInsights } from './mappers.js';

const insights: DashboardInsights = {
	savingsRate: 20,
	budgetStreak: 3,
	watchlistCount: 4,
	cashBuffer: 2116,
	financialHealth: { score: 70, maxScore: 100, status: 'healthy' }
};

const cash = (cards: ReturnType<typeof mapInsightCards>) =>
	cards.find((c) => c.title === 'Cash buffer')?.value;

describe('mapInsightCards', () => {
	it('prints the cash buffer in the account currency and locale (DS 2.0 A3)', () => {
		expect(cash(mapInsightCards(insights, { currency: 'EUR', locale: 'pt-PT' }))).toBe('2116,00 €');
		expect(cash(mapInsightCards(insights, { currency: null, locale: 'en' }))).toBe('2,116.00 —');
	});
});
