import { describe, expect, it } from 'vitest';
import { mapActivities, mapRecentSpend, type Expense, type UserActivity } from './mappers.js';

const now = new Date('2026-11-24T12:00:00Z');
const MINUS = '−';

function activity(
	type: UserActivity['type'],
	amount: number | null,
	isGrowth = true
): UserActivity {
	return {
		id: '00000000-0000-0000-0000-000000000001',
		userId: '00000000-0000-0000-0000-000000000002',
		type,
		title: 'VST',
		subtitle: 'Added to portfolio',
		amount,
		isGrowth,
		symbol: 'plus.circle.fill',
		createdAt: '2026-11-24T10:00:00Z'
	};
}

function expense(title: string, amount: number, occurredOn: string): Expense {
	return {
		id: title,
		title,
		amount,
		pillar: 'fundamentals',
		occurredOn,
		splitMode: 'personal',
		userSharePercent: 100
	};
}

const usd = { currency: 'USD', locale: 'en' as const, now };

describe('mapActivities', () => {
	it('shows a buy as a neutral amount with no plus sign', () => {
		const [item] = mapActivities([activity('stock_added', 4236.07)], usd);
		expect(item.tone).toBe('neutral');
		expect(item.amount).toBe('$4,236.07');
	});

	it('shows a holding edit with the sign of its own amount, still neutral', () => {
		const [item] = mapActivities([activity('stock_updated', -100, false)], usd);
		expect(item.tone).toBe('neutral');
		expect(item.amount).toBe(`${MINUS}$100.00`);
	});

	it('shows an expense as an outflow in the account currency, neutral', () => {
		const [item] = mapActivities([activity('expense_recorded', 84.12, false)], {
			...usd,
			currency: 'EUR'
		});
		expect(item.tone).toBe('neutral');
		expect(item.amount).toBe(`${MINUS}€84.12`);
	});

	it('prints expenses in the budget currency and holdings in the account currency', () => {
		const items = mapActivities(
			[activity('expense_recorded', 84.12, false), activity('stock_added', 10)],
			{ ...usd, spendCurrency: 'EUR' }
		);
		expect(items[0].amount).toBe(`${MINUS}€84.12`);
		expect(items[1].amount).toBe('$10.00');
	});

	it('never prints a dollar sign without a currency', () => {
		const [item] = mapActivities([activity('stock_added', 4236.07)], { ...usd, currency: null });
		expect(item.amount.endsWith(' —')).toBe(true);
		expect(item.amount).not.toContain('$');
	});

	it('formats in the locale', () => {
		const [item] = mapActivities([activity('stock_added', 4236.07)], {
			currency: 'EUR',
			locale: 'pt-PT',
			now
		});
		expect(item.amount).toBe('4236,07 €');
	});
});

describe('mapRecentSpend', () => {
	it('keeps only this month and prints it in the account currency', () => {
		const items = mapRecentSpend(
			[
				expense('Coffee', 3.5, '2026-06-27'),
				expense('Groceries', 84.12, '2026-11-20'),
				expense('Rent', 900, '2026-11-01')
			],
			{ currency: 'EUR', locale: 'en', now }
		);
		expect(items.map((i) => i.title)).toEqual(['Groceries', 'Rent']);
		expect(items[0].amount).toBe(`${MINUS}€84.12`);
	});

	it('is empty when nothing was spent this month', () => {
		expect(
			mapRecentSpend([expense('Coffee', 3.5, '2026-06-27')], { currency: 'EUR', locale: 'en', now })
		).toEqual([]);
	});
});
