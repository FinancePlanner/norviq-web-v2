import { describe, expect, it } from 'vitest';
import { themedOptionPatch, type ThemeEnv } from '#lib/charts/theme.js';
import { priceChartSpec, priceChartTab } from './price-chart.js';

const env: ThemeEnv = {
	dark: false,
	cssVar: (_n, f) => f,
	reducedMotion: false,
	coarsePointer: false
};

const bars = [
	{ date: '2026-11-20T00:00:00Z', close: 10.5 },
	{ date: '2026-11-21T00:00:00Z', close: 10.78 }
];

/** The tooltip HTML the themed chart shows for its last point. */
function tooltip(spec: NonNullable<ReturnType<typeof priceChartSpec>>): string {
	const next = themedOptionPatch(spec.option, spec.id, {
		...env,
		currency: spec.currency,
		locale: spec.locale
	});
	const tip: unknown = next.tooltip;
	const f: unknown = tip && typeof tip === 'object' ? Reflect.get(tip, 'formatter') : undefined;
	expect(typeof f).toBe('function');
	return typeof f === 'function'
		? String(Reflect.apply(f, undefined, [[{ name: 'Nov 21', value: 10.78 }]]))
		: '';
}

describe('stock price chart', () => {
	it('carries the listing currency from the profile', () => {
		const tab = priceChartTab(bars, 'EUR');
		expect(tab.hasData).toBe(true);
		expect(tab.currency).toBe('EUR');
		expect(tab.labels).toEqual(['Nov 20', 'Nov 21']);
	});

	it('shows the series currency in the tooltip, never a dollar for a euro stock', () => {
		const html = tooltip(priceChartSpec(priceChartTab(bars, 'EUR'), 'pt-PT')!);
		expect(html).toBe('Nov 21<br/><strong>10,78 €</strong>');
		expect(tooltip(priceChartSpec(priceChartTab(bars, 'USD'), 'en')!)).toContain('$10.78');
	});

	it('says the currency is unknown rather than guessing one', () => {
		expect(tooltip(priceChartSpec(priceChartTab(bars, ''), 'en')!)).toContain('10.78 —');
	});
});
