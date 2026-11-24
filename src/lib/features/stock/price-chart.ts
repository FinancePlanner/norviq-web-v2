// The stock price chart (Chart tab): the closes plus the listing currency from
// the company profile, so the tooltip and axis print that currency (DS 2.0
// money contract) instead of assuming dollars. Pure; detail.server.ts and
// ChartTab.svelte share it.

import { wealthLine, type ChartSpec } from '#lib/charts/index.js';
import { goFormat } from '#lib/features/dashboard/shared.js';
import type { AppLocale } from '#lib/money.js';
import type { ChartTabVM } from './detail.js';

export function priceChartTab(
	bars: { date: string; close: number }[],
	currency: string
): ChartTabVM {
	return {
		hasData: true,
		error: '',
		labels: bars.map((b) => goFormat(new Date(b.date), 'Jan 2')),
		values: bars.map((b) => b.close),
		currency: currency.trim() || null
	};
}

export function priceChartSpec(chart: ChartTabVM, locale: AppLocale): ChartSpec | null {
	return chart.hasData
		? wealthLine('stock-price-chart', chart.labels, chart.values, {
				currency: chart.currency,
				locale
			})
		: null;
}
