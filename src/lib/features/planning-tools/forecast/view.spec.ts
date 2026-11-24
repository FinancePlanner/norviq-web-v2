import { describe, expect, it } from 'vitest';
import { translator } from '#lib/i18n/index.js';
import { cashFlowSourceLabel, money } from './view.js';

const en = translator('en');
const pt = translator('pt-PT');

describe('cashFlowSourceLabel', () => {
	it('names the source in words, never the API value', () => {
		expect(cashFlowSourceLabel('planned_budget', en)).toBe('your monthly budget plan');
		expect(cashFlowSourceLabel('trailing_actuals', en)).toBe('your recent spending');
		expect(cashFlowSourceLabel('manual', en)).toBe('your manual entries');
	});

	it('translates for pt-PT', () => {
		expect(cashFlowSourceLabel('planned_budget', pt)).toBe('o seu plano de orçamento mensal');
		expect(cashFlowSourceLabel('trailing_actuals', pt)).toBe('os seus gastos recentes');
		expect(cashFlowSourceLabel('manual', pt)).toBe('os seus valores manuais');
	});
});

describe('forecast money', () => {
	it('prints the symbol and separators of the locale, not "EUR 2000.00"', () => {
		expect(money(2000, 'EUR', 'en')).toBe('€2,000.00');
		expect(money(2000, 'EUR', 'pt-PT')).toBe('2000,00 €');
	});

	it('survives a malformed typed currency code', () => {
		expect(money(2000, 'EURO', 'en')).toBe('2,000.00 —');
	});
});
