import { describe, expect, it } from 'vitest';
import { accountCurrency } from './account-currency.js';

describe('accountCurrency', () => {
	it('uses the one currency every portfolio shares', () => {
		expect(accountCurrency([{ baseCurrency: 'eur' }, { baseCurrency: 'EUR' }])).toEqual({
			currency: 'EUR',
			mixed: false
		});
	});

	it('has no single currency when portfolios differ', () => {
		expect(accountCurrency([{ baseCurrency: 'EUR' }, { baseCurrency: 'USD' }])).toEqual({
			currency: null,
			mixed: true
		});
	});

	it('is unknown without portfolios, never a default dollar', () => {
		expect(accountCurrency(null)).toEqual({ currency: null, mixed: false });
		expect(accountCurrency([{ baseCurrency: '' }, {}])).toEqual({ currency: null, mixed: false });
	});
});
