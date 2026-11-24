import { describe, expect, it } from 'vitest';
import { buildYearViewModel, type YearMonthRow, type YearRow } from './year.js';

const NBSP = ' ';

const months: YearMonthRow[] = [
	{ monthStart: '2026-01-01', actual: 1200, planned: 1500 },
	{ monthStart: '2026-02-01', actual: 1800, planned: 1500 }
];
const years: YearRow[] = [
	{ year: 2025, actual: 2000, planned: 3000 },
	{ year: 2026, actual: 3000, planned: 3000 }
];

describe('buildYearViewModel', () => {
	it('prints totals and months in the spend currency and locale, like its chart', () => {
		const vm = buildYearViewModel(months, years, 2026, { currency: 'EUR', locale: 'pt-PT' });
		expect(vm.currency).toBe('EUR');
		expect(vm.totalSpent).toBe(`3000,00${NBSP}€`);
		expect(vm.months[0].spent).toBe(`1200,00${NBSP}€`);
		expect(vm.months[0].planned).toBe(`1500,00${NBSP}€`);
		expect(vm.yoySpent).toBe('+50,00%');
		expect(vm.values.slice(0, 2)).toEqual([1200, 1800]);
	});

	it('never prints a dollar sign without a currency', () => {
		const vm = buildYearViewModel(months, years, 2026, { currency: null, locale: 'en' });
		expect(vm.totalSpent).toBe(`3,000.00${NBSP}—`);
	});
});
