// Client-safe helpers from norviq-web internal/pages/automation/page.templ.
import { formatFloat } from '#lib/format.js';
import type { ForecastVM } from './types.js';

/** money: fmt.Sprintf("%s %.2f", currency, value) */
export const money = (value: number, currency: string) => `${currency} ${formatFloat(value, 2)}`;

/** decimal: "%.2f", or "" for nil. */
export const decimal = (value: number | null | undefined) => (value == null ? '' : formatFloat(value, 2));

/** percentValue: "%.2f" of value*100. */
export const percentValue = (value: number) => formatFloat(value * 100, 2);

type Field = 'name' | 'baseCurrency' | 'horizon' | 'pathCount' | 'income' | 'spending' | 'target' | 'incomeGrowth' | 'spendingGrowth' | 'inflation';

/** forecastValue(vm, field) */
export function forecastValue(vm: ForecastVM, field: Field): string {
	const f = vm.editing;
	if (!f) {
		switch (field) {
			case 'name':
				return 'My forecast';
			case 'baseCurrency':
				return vm.defaults ? vm.defaults.baseCurrency : 'EUR';
			case 'horizon':
				return '120';
			case 'pathCount':
				return '1000';
			case 'incomeGrowth':
			case 'spendingGrowth':
			case 'inflation':
				return '2';
		}
		return '';
	}
	switch (field) {
		case 'name':
			return f.name;
		case 'baseCurrency':
			return f.baseCurrency;
		case 'horizon':
			return String(f.horizonMonths);
		case 'pathCount':
			return String(f.pathCount);
		case 'income':
			return decimal(f.monthlyIncomeOverride);
		case 'spending':
			return decimal(f.monthlySpendingOverride);
		case 'target':
			return decimal(f.targetAmount);
		case 'incomeGrowth':
			return percentValue(f.annualIncomeGrowth);
		case 'spendingGrowth':
			return percentValue(f.annualSpendingGrowth);
		case 'inflation':
			return percentValue(f.inflationAssumption);
	}
	return '';
}

export const forecastAction = (vm: ForecastVM) => (vm.editing ? '/forecast/' + vm.editing.id : '/forecast');
export const forecastSubmitLabel = (vm: ForecastVM) => (vm.editing ? 'Update forecast' : 'Save forecast');
