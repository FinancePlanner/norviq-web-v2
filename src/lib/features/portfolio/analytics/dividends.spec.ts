import { describe, expect, it } from 'vitest';
import { mapDividends } from './subpages.server.js';

describe('mapDividends', () => {
	it('prints dividends in the account currency so totals match the chart tooltip', () => {
		const vm = mapDividends(
			{
				annualProjectedIncome: 1234,
				upcomingDividends: [
					{
						symbol: 'ASML',
						exDividendDate: '2026-12-01',
						paymentDate: '2026-12-15',
						amountPerShare: 1.75,
						projectedTotal: 17.5
					}
				],
				monthlyBreakdown: [{ month: '2026-12', amount: 17.5 }]
			},
			{ currency: 'EUR', locale: 'pt-PT' }
		);
		expect(vm.currency).toBe('EUR');
		expect(vm.annualProjectedIncome).toBe('1234,00 €');
		expect(vm.upcoming[0].amountPerShare).toBe('1,75 €');
		expect(vm.monthlyChart).toEqual({ labels: ['Dec'], values: [17.5] });
	});
});
